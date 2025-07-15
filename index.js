// === Imports and Setup ===
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment');
const util = require('util');
let chalk;

// Chalk fallback
try {
  chalk = require('chalk');
} catch {
  chalk = { green: x => x, yellow: x => x, cyan: x => x, red: x => x, gray: x => x, magenta: x => x };
}

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'EliteBot> '
});

// === Terminal Command: create-group <participantId> <count> ===
/*
  Usage example in terminal:
    create-group 1234567890@c.us 3
    // This will create 3 groups named GROUPAUTO_1, GROUPAUTO_2, GROUPAUTO_3 with the given participant
*/
let groupAutoCounter = 1;

rl.on('line', async (line) => {
  const input = line.trim();
  if (!input) return rl.prompt();

  const [cmd, ...args] = input.split(' ');
  switch (cmd.toLowerCase()) {
    // ...existing cases...

    case 'create-group':
      if (args.length < 2) {
        console.log('Usage: create-group <participantId> <count>');
      } else {
        const participantId = args[0];
        const count = parseInt(args[1], 10);
        if (isNaN(count) || count < 1 || count > 20) {
          console.log('Count must be a number between 1 and 20.');
        } else {
          for (let i = 0; i < count; i++) {
            const groupName = `GROUPAUTO_${groupAutoCounter}`;
            try {
              // Await inside loop to ensure sequential creation
              // eslint-disable-next-line no-await-in-loop
              const group = await client.createGroup(groupName, [participantId]);
              console.log(`✅ Group "${groupName}" created with ID: ${group.gid._serialized}`);
              groupAutoCounter++;
            } catch (err) {
              console.error('❌ Failed to create group:', err.message || err);
            }
          }
        }
      }
      break;

    // ...existing cases...
    default:
      console.log('Unknown command. Type "help" for available commands.');
  }

  rl.prompt();
});


// === Enhanced Console.log with Features ===
console.log = (...args) => {
  const now = new Date().toISOString();
  const msg = util.format(...args);

  const skipPrefixes = [
    '✅', '🧾', 'EliteBot>', 'Bombing', 'Bombing stopped.', 'Sent to',
    'Exiting...', 'Console Commands:', 'Usage:', 'Count must be'
  ];
  if (
    args.length === 0 ||
    skipPrefixes.some(prefix => typeof args[0] === 'string' && args[0].startsWith(prefix))
  ) {
    process.stdout.write(msg + '\n');
    return;
  }

  let color = chalk.cyan;
  let level = 'INFO';
  let emoji = 'ℹ️';
  if (/error|fail|exception|❌/i.test(msg)) {
    color = chalk.red;
    level = 'ERROR';
    emoji = '❌';
  } else if (/warn|deprecated|⚠️/i.test(msg)) {
    color = chalk.yellow;
    level = 'WARN';
    emoji = '⚠️';
  } else if (/success|ready|✅/i.test(msg)) {
    color = chalk.green;
    level = 'SUCCESS';
    emoji = '✅';
  } else if (/debug|trace/i.test(msg)) {
    color = chalk.magenta;
    level = 'DEBUG';
    emoji = '🐞';
  }

  let fileLine = '';
  try {
    const stack = new Error().stack.split('\n')[3] || '';
    const match = stack.match(/\((.*):(\d+):(\d+)\)/);
    if (match) {
      fileLine = ` ${chalk.gray(`[${match[1].split(/[\\/]/).pop()}:${match[2]}]`)}`;
    }
  } catch {}

  let stackTrace = '';
  if (level === 'ERROR') {
    const stack = new Error().stack.split('\n').slice(3, 6).join('\n');
    stackTrace = chalk.gray('\n' + stack);
  }

  process.stdout.write(
    color(`[${now}] ${emoji} [${level}]${fileLine} ${msg}\n`) + stackTrace
  );
};

console.debug = (...args) => console.log('[DEBUG]', ...args);
console.warn = (...args) => console.log('[WARN]', ...args);
console.error = (...args) => console.log('[ERROR]', ...args);

// === Autocomplete Setup ===
rl.completer = (line) => {
  const completions = {
    help: [],
    send: ['<chatId>', '<message>'],
    bomb: ['<chatId>', '<count>', '<message>'],
    stopbomb: [],
    exit: []
  };
  const words = line.trim().split(/\s+/);
  const [cmd, ...args] = words;
  const allCommands = Object.keys(completions);

  if (!cmd) return [allCommands, line];

  if (words.length === 1) {
    const hits = allCommands.filter(c => c.startsWith(cmd));
    return [hits.length ? hits : allCommands, line];
  }

  if (completions[cmd]) {
    const argCompletions = completions[cmd].slice(args.length - 1);
    return [argCompletions, line];
  }

  return [[], line];
};

rl.setPrompt(chalk.green('EliteBot> '));
rl.prompt();

rl.on('SIGINT', () => {
  console.log('\nExiting...');
  process.exit(0);
});

// === Constants ===
// You can allow multiple owner IDs by using an array:
const MY_ID = ['918295953658@c.us', '919992778066@c.us']; // Add more IDs as needed
// If you want to allow multiple owner IDs, use an array like:
// const MY_ID = ['918295953658@c.us', '919992778066@c.us'];
const startTime = Date.now();
let bombing = false;

const client = new Client({
  authStrategy: new LocalAuth()
});

// === QR Code for Login ===
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('📱 Scan the QR code to connect.');
});

// === Bot Ready ===
client.on('ready', () => {
  console.log('✅ Bot is ready!');
  console.log(`🧾 Your ID: ${client.info.me._serialized}`);
});

// === Message Listener ===
client.on('message', async msg => {
  const message = msg.body.trim();
  const [cmd, ...args] = message.split(' ');
  const lowerCmd = cmd.toLowerCase();

  const sender = msg.from;
  const senderId = msg.author || msg.from;
  const isGroup = sender.endsWith('@g.us');
  const isOwner = Array.isArray(MY_ID) ? MY_ID.includes(senderId) : senderId === MY_ID;

  console.log(`📨 ${message} from ${senderId}`);

  // Public Commands
  if (lowerCmd === 'hello' || lowerCmd === 'hi')
    return msg.reply('Hello! This is a message from EliteBot: Navdeep is currently unavailable. He will get back to you as soon as possible. Thank you for your patience!');
  if (lowerCmd === '!ping') return msg.reply('🏓 Pong!');
  if (lowerCmd === '!help') {
    return msg.reply(
      `📖 *COMMANDS MENU*\n\n` +
      `🛠 *General*\n!ping, !uptime, !time, !id, !echo\n` +
      `💣 *Bombing*\n!bomb [msg] (Owner only), !stopbomb\n\n` +
      `👥 *Group*\n!groupinfo, !members, !admins, !adminonly\n\n` +
      `🧑‍💻 *Info*\n!dev`
    );
  }
  if (lowerCmd === '!id') return msg.reply(`🧾 Your ID: ${senderId}`);
  if (lowerCmd === '!time') {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    return msg.reply(`🕒 Server Time: ${now}`);
  }
  if (lowerCmd === '!uptime') {
    const uptime = moment.duration(Date.now() - startTime).humanize();
    return msg.reply(`⏱ Uptime: ${uptime}`);
  }
  if (lowerCmd === '!echo') {
    if (args.length === 0) return msg.reply('Usage: !echo [your message]');
    return msg.reply(args.join(' '));
  }
  if (lowerCmd === '!dev') return msg.reply('👨‍💻 Developer: Navdeep');

  // Owner-only commands
if (isOwner) {
  if (lowerCmd === '!bomb') {
    let targetChatId, count, messageText;

    if (isGroup) {
      if (args.length < 2) return msg.reply('💣 Usage: !bomb <count> <message>');
      count = parseInt(args[0], 10);
      if (isNaN(count)) return msg.reply('❌ Count must be a number.');
      messageText = args.slice(1).join(' ');
      targetChatId = msg.from;
    } else {
      if (args.length < 3) return msg.reply('💣 Usage: !bomb <chatId> <count> <message>');
      targetChatId = args[0];
      count = parseInt(args[1], 10);
      if (isNaN(count)) return msg.reply('❌ Count must be a number.');
      messageText = args.slice(2).join(' ');
    }

    if (count < 1 || count > 50) {
      return msg.reply('❌ Please specify a valid number between 1 and 50.');
    }

    bombing = true;
    gentleSpam(targetChatId, messageText, count, 500);
    return;
  }

  if (lowerCmd === '!stopbomb') {
    if (!bombing) return msg.reply('💤 No active bombing.');
    bombing = false;
    return msg.reply('🛑 Bombing stopped.');
  }
} else {
  if (lowerCmd === '!bomb' || lowerCmd === '!stopbomb') {
    return msg.reply('❌ This command is only for the owner.');
  }
}

  // Group-specific commands
  if (isGroup) {
    const chat = await msg.getChat();

    if (lowerCmd === '!groupinfo') {
      return msg.reply(`📌 Group: ${chat.name}\n👥 Members: ${chat.participants.length}`);
    }

    if (lowerCmd === '!members') {
      const members = chat.participants.map(p => p.id.user).join(', ');
      return msg.reply(`👥 Members:\n${members}`);
    }

    if (lowerCmd === '!admins') {
      const admins = chat.participants
        .filter(p => p.isAdmin || p.isSuperAdmin)
        .map(p => p.id.user)
        .join(', ');
      return msg.reply(`🛡 Admins:\n${admins}`);
    }

    if (lowerCmd === '!adminonly') {
      const isAdmin = chat.participants.find(
        p => p.id._serialized === senderId && (p.isAdmin || p.isSuperAdmin)
      );
      return isAdmin
        ? msg.reply('✅ You are an admin!')
        : msg.reply('❌ This command is for admins only.');
    }
  }
});

// === Bombing Function ===
const delay = ms => new Promise(res => setTimeout(res, ms));

async function gentleSpam(chatId, text, count = 5, delayMs = 500) {
  const chat = await client.getChatById(chatId).catch(() => null);
  if (!chat) {
    console.error('❌ Could not find chat:', chatId);
    return;
  }

  bombing = true;

  for (let i = 0; i < count; i++) {
    if (!bombing) {
      await chat.sendMessage('🛑 Bombing stopped.');
      return;
    }
    await chat.sendMessage(` ${text} (${i + 1}/${count})`);
    await delay(delayMs);
  }

  bombing = false;
}

// === CLI Commands ===
rl.on('line', async (line) => {
  const input = line.trim();
  if (!input) return rl.prompt();

  const [cmd, ...args] = input.split(' ');
  switch (cmd.toLowerCase()) {
    case 'help':
      console.log('Console Commands:');
      console.log('  send <chatId> <message>   - Send a message');
      console.log('  bomb <chatId> <count> <message> - Bomb a chat');
      console.log('  stopbomb                  - Stop bombing');
      console.log('  exit                      - Exit bot');
      break;
    case 'send':
      if (args.length < 2) {
        console.log('Usage: send <chatId> <message>');
      } else {
        const chatId = args[0];
        const message = args.slice(1).join(' ');
        client.sendMessage(chatId, message);
        console.log(`Sent to ${chatId}: ${message}`);
      }
      break;
    case 'bomb':
      if (args.length < 3) {
        console.log('Usage: bomb <chatId> <count> <message>');
      } else {
        const chatId = args[0];
        const count = parseInt(args[1], 10);
        const message = args.slice(2).join(' ');
        if (isNaN(count) || count < 1 || count > 50) {
          console.log('Count must be between 1 and 50.');
        } else {
          bombing = true;
          gentleSpam(chatId, message, count, 1500);
          console.log(`Bombing ${chatId} with "${message}" (${count} times)`);
        }
      }
      break;
    case 'stopbomb':
      bombing = false;
      console.log('Bombing stopped.');
      break;
    case 'exit':
      console.log('Exiting...');
      process.exit(0);
      break;
    default:
      console.log('Unknown command. Type "help" for available commands.');
  }

  rl.prompt();
});

// === Start the Bot ===
client.initialize();
