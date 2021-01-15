require('date-utils');

const constants = require('../config/constants');
const lodestoneLocales = require('../config/lodestoneLocales');
const categories = require('../config/categories');
const logger = require('../libs/logger');

const cmds = {
    add: {
        execute: async (message, args) => {
            if (!args || args.length < 2) {
                message.channel.send('', {
                    embed: {
                        color: parseInt('ff867d', 16),
                        title: '소식 추가 명령어 안내',
                        description: `특정 소식의 출력을 추가합니다.`,
                        fields: [
                            { name: '사용법', value: `${constants.DISCORD_CHAT_PREFIX}notify add <지역> <종류>` },
                            { name: '파라미터', value: `지역 - ko, ${lodestoneLocales.join(', ')}\n종류 - topics (글로벌만 지원), notices, maintenance, updates, status (글로벌만 지원), developers (글로벌만 지원), event (한국만 지원), patchnote (한국만 지원)` },
                            { name: '예시', value: `- ${constants.DISCORD_CHAT_PREFIX}notify add kr notices` },
                        ],
                        timestamp: new Date(),
                        footer: {
                            text: 'FFXIV Service ToolBot'
                        },
                    }
                });
                return;
            }

            // 검색 파라미터 준비
            let searchInfo = {
                region: args[0].toLowerCase(),
                type: args[1].toLowerCase(),
            };

            // 파라미터 확인
            if ([...lodestoneLocales, 'ko'].indexOf(searchInfo.region) === -1) {
                message.reply('존재하지 않는 지역이에요.');
                return;
            }
            if ([...Object.keys(categories.Global), ...Object.keys(categories.Korea)].indexOf(searchInfo.type) === -1) {
                message.reply('존재하지 않는 종류에요.');
                return;
            }
            if (searchInfo.region === 'ko' && Object.keys(categories.Korea).indexOf(searchInfo.type) === -1) {
                message.reply('한국 지역으로는 해당 종류를 사용할 수 없어요.');
                return;
            }
            if (lodestoneLocales.indexOf(searchInfo.region) > -1 && Object.keys(categories.Korea).indexOf(searchInfo.type) === -1) {
                message.reply('글로벌 지역으로는 해당 종류를 사용할 수 없어요.');
                return;
            }
            
            // 해당 서버의 Webhook URL 확인
            
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
    name: 'notify',
    description: 'Manages ffxiv notification settings',
    execute(message, args) {
        const command = args.length > 0 ? args[0].toLowerCase() : '';

        if (args.length === 0 || (command && !cmdsUtil.isExistCommand(Object.keys(cmds), command))) {
            message.channel.send('', {
                embed: {
                    color: parseInt('ff867d', 16),
                    title: '소식 명령어 안내',
                    description: `소식 관련 명령어를 실행합니다.`,
                    fields: [
                        { name: '명령어 종류', value: `${constants.DISCORD_CHAT_PREFIX}notify [add|remove]` },
                    ],
                    timestamp: new Date(),
                    footer: {
                        text: 'FFXIV Service ToolBot'
                    },
                }
            });
            return;
        }
        args.shift();

        if ('add' === command) {
            cmds[command].execute(message, args);
        }
    }
};
