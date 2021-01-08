const constants = require('../config/constants');

const cmds = [
    {
        cmd: 'search',
        execute: (args) => {
            message.channel.send(args.join(' '));
        },
    }
];

const cmdsUtil = {
    isExistCommand: (pArgs, pCmd) => {
        if (!args)                      return false;
        if (!Array.isArray(pArgs))      return false;
        return cmds.some(e => e.cmd === pCmd);
    },
};

module.exports = {
    name: 'fflogs',
    description: 'Shows fflogs statistics',
    execute(message, args) {
        message.channel.send('개발자가 현재 작업하고 있대요!');
        // if (!args || (Array.isArray(args) && args[0] && cmdsUtil.isExistCommand(args[0]))) {
        //     message.channel.send({
        //         embed: {
        //             color: parseInt('ff867d', 16),
        //             title: '프프로그 명령어 안내',
        //             description: `최종 콘텐츠를 기준으로 가장 잘 나온 정보를 조회합니다.`,
        //             fields: [
        //                 { name: '사용법', value: `${constants.DISCORD_CHAT_PREFIX}fflogs search <이름> <서버> <인스턴스종류>` }
        //             ],
        //             timestamp: new Date(),
        //             // footer: {
        //             //     text: DISCORD_TITLE_ABB
        //             // }
        //         }
        //     });

        //     return;
        // }
    }
};
