/**
 * FFXIV Service Toolbot
 */
const fs = require('fs');
const readline = require('readline');
const Discord = require('discord.js');
const { version } = require('./package.json');

const logger = require('./libs/logger');
const redis = require('./libs/redis');
const news = require('./services/news');
const scheduler = require('./services/scheduler');
const { webhooks } = require('./services/webhooks');
const constants = require('./config/constants');

const discordBot = new Discord.Client();
discordBot.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    discordBot.commands.set(command.name, command);
}

discordBot.on('warn', err => logger.warn(err));
discordBot.on('error', err => logger.error(err));
discordBot.on('uncaughtException', err => {
    logger.error(err);
    process.exit(1);
});
discordBot.on('reconnecting', () => logger.warn('다시 연결하고 있습니다...'));
discordBot.on('disconnect', () => {
    logger.warn('서버와의 연결이 끊겼습니다.');
    process.exit(0);
});
discordBot.once('ready', () => {
    logger.debug(`'${discordBot.user.tag}'으로 로그인되었습니다.`);
    discordBot.user.setActivity('지켜보고 있다.. +_+');
});
discordBot.on('message', async (message) => {
    if (!message.content.startsWith(constants.DISCORD_CHAT_PREFIX) || message.author.bot || message.webhookID) return;

    // let serverId = message.channel.guild.id;
    // let userId = message.author.id;
    // let userName = message.author.username;

    const args = message.content.slice(constants.DISCORD_CHAT_PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    if (command) {
        switch (command.toUpperCase()) {
            // 종료
            case `EXIT`:
            case `종료`:
                discordBot.commands.get('exit').execute(message, args);
                break;
            // 업타임
            case `UPTIME`:
            case `업타임`:
                discordBot.commands.get('uptime').execute(message, args);
                break;
            // 따라하기
            case `SAY`:
            case `ECHO`:
            case `말하기`:
                discordBot.commands.get('echo').execute(message, args);
                break;
            // FFLOGS
            case `FFLOGS`:
            case `프프로그`:
                discordBot.commands.get('fflogs').execute(message, args);
                break;
            // 소식 설정
            case `NOTIFY`:
            case `소식`:
                discordBot.commands.get('notify').execute(message, args);
                break;
        }
    }
});
// 디스코드 봇 추가 시
discordBot.on('guildCreate', async (guild) => {
    try {
        let serverId = guild.id;
        let serverName = guild.name;
        let serverRegion = guild.region;
        
        logger.info(`[${serverRegion}] ${serverName} (${serverId}) - 서버에 봇 추가됨`);

            // 채널 추가
            // let defChannel;
            // guild.channels.create('달달이', {
            //     type: 'text',
            //     permissionOverwrites: [
            //         {
            //             id: serverId,
            //             allow: ['VIEW_CHANNEL'],
            //         }
            //     ],
            // }).then(channel => {
            //     defChannel = channel;
            //     if (channel.type === "text") {
            //         if (channel.permissionsFor(discordBot.user).has("VIEW_CHANNEL") === true) {
            //             if (channel.permissionsFor(discordBot.user).has("SEND_MESSAGES") === true) {
            //                 channel.send(`성공적으로 봇 추가가 완료되었습니다.`);
            //             }
            //         }
            //     }
            // });

            // let found = 0;
            // guild.channels.cache.map((channel) => {
            //     if (found === 0) {
                    
            //     }
            // });
    } catch (err) {
        logger.error(err);
    }
});

if (constants.DISCORD_BOT_TOKEN === '') {
    logger.error('디스코드 봇 API 토큰 정보가 없습니다. 디스코드 개발자 센터에서 먼저 봇 토큰을 발급하고 이용하세요.');
    process.exit(1);
}
discordBot
    .login(constants.DISCORD_BOT_TOKEN)
    .catch((pErr) => {
        logger.error(pErr);
        process.exit(1);
    });

scheduler.run();
const r = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
console.log('FFXIV Service Toolbot');
console.log('Author by. Karsei');
console.log(`Version ${version}`);
r.setPrompt('> ');
r.prompt();
r.on('line', async (line) => {
    args = line.split(' ');
    
    if (line) {
        let cmd = args[0];

        try {
            switch (cmd) {
                case 'stop':
                case 'exit': {
                    console.info('bye~!');
                    r.close();
                    break;
                }
                case 'echo': {
                    args.shift();
                    console.info(args.join(' '));
                    break;
                }
                case 'parse': {
                    let res = await news.fetchGlobal('topics', 'na', false);
                    console.log(res);
                    break;
                }
                case 'webhook': {
                    webhook.newsExecuteAll();
                    break;
                }
                default: {
                    console.error('ERROR: Unknown command.');
                    break;
                }
            }
        } catch (e) {
            logger.error(e);
        }
    }
    
    r.prompt();
});
r.on('close', () => {
    process.exit();
});
