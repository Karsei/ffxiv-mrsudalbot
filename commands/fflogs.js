const constants = require('../config/constants');
const fflogs = require('../services/fflogs');

const cmds = {
    search: {
        execute: (message, args) => {
            if (!args || args.length < 3) {
                message.channel.send(`명령어가 올바르지 않아요!`);
                return;
            }
            console.log('good!');
            console.log(args.join(' '));
        },
    },
};

const cmdsUtil = {
    isExistCommand: (pArgs, pCmd) => {
        if (!pArgs)                     return false;
        if (!Array.isArray(pArgs))      return false;
        return pArgs.some(e => e === pCmd);
    },
};

module.exports = {
    name: 'fflogs',
    description: 'Shows fflogs statistics',
    execute(message, args) {
        const command = args.shift().toLowerCase();

        if (!args || (command && !cmdsUtil.isExistCommand(Object.keys(cmds), command))) {
            message.channel.send('', {
                embed: {
                    color: parseInt('ff867d', 16),
                    title: '프프로그 명령어 안내',
                    description: `프프로그 관련 명령어를 실행합니다.`,
                    fields: [
                        { name: '사용법', value: `${constants.DISCORD_CHAT_PREFIX}fflogs [search] <서버[carbuncle|chocobo|...]> <이름[홍길동]> <인스턴스종류[raid|24raid|trial|...]>` }
                    ],
                    timestamp: new Date(),
                    footer: {
                        text: 'FFXIV Service ToolBot'
                    },
                }
            });
            return;
        }

        if ('search' === command) {
            cmds[command].execute(message, args);
        }
    }
};
