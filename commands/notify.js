require('date-utils');

const constants = require('../config/constants');
const lodestoneLocales = require('../config/lodestoneLocales');
const categories = require('../config/categories');
const logger = require('../libs/logger');
const { cacheUtil } = require('../services/webhooks');
const { Constants, MessageManager } = require('discord.js');
const { cache } = require('ejs');

const cmds = {
    // 추가
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
                            { name: '파라미터', value: `지역 - kr, ${lodestoneLocales.join(', ')}\n종류 - topics (글로벌만 지원), notices, maintenance, updates, status (글로벌만 지원), developers (글로벌만 지원), event (한국만 지원), patchnote (한국만 지원)` },
                            { name: '예시', value: `- ${constants.DISCORD_CHAT_PREFIX}notify add kr notices` },
                        ],
                        timestamp: new Date(),
                        footer: {
                            text: constants.APP_NAME,
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
            if ([...lodestoneLocales, 'kr'].indexOf(searchInfo.region) === -1) {
                message.reply('존재하지 않는 지역이에요.');
                return;
            }
            if ([...Object.keys(categories.Global), ...Object.keys(categories.Korea)].indexOf(searchInfo.type) === -1) {
                message.reply('존재하지 않는 종류에요.');
                return;
            }
            if (searchInfo.region === 'kr' && Object.keys(categories.Global).indexOf(searchInfo.type) > -1 && Object.keys(categories.Korea).indexOf(searchInfo.type) === -1) {
                message.reply('한국 지역으로는 해당 종류를 사용할 수 없어요.');
                return;
            }
            if (lodestoneLocales.indexOf(searchInfo.region) > -1 && Object.keys(categories.Global).indexOf(searchInfo.type) === -1 && Object.keys(categories.Korea).indexOf(searchInfo.type) > -1) {
                message.reply('글로벌 지역으로는 해당 종류를 사용할 수 없어요.');
                return;
            }

            try
            {
                // 해당 서버의 Webhook URL 확인
                let hookUrl = await cacheUtil.getHookUrlByGuildId(message.guild.id);
                if (!hookUrl) {
                    message.reply('해당 디스코드 서버의 Webhook을 찾지 못했어요!');
                    return;
                }

                // 추가
                let addRes = await cacheUtil.addWebhook(searchInfo.region, searchInfo.type, hookUrl);
                message.reply('소식 설정이 성공적으로 변경되었어요!');

                logger.info(`'${message.guild.name} (${message.guild.id})' 에서 ${searchInfo.region}, ${searchInfo.type} 소식을 추가함`);
            }
            catch (e)
            {
                logger.error('소식 알림 기능 추가 오류');
                logger.error(e.stack);
            }
        },
    },

    // 제거
    del: {
        execute: async (message, args) => {
            if (!args || args.length < 2) {
                message.channel.send('', {
                    embed: {
                        color: parseInt('ff867d', 16),
                        title: '소식 제거 명령어 안내',
                        description: `특정 소식의 출력을 제거합니다.`,
                        fields: [
                            { name: '사용법', value: `${constants.DISCORD_CHAT_PREFIX}notify del <지역> <종류>` },
                            { name: '파라미터', value: `지역 - kr, ${lodestoneLocales.join(', ')}\n종류 - topics (글로벌만 지원), notices, maintenance, updates, status (글로벌만 지원), developers (글로벌만 지원), event (한국만 지원), patchnote (한국만 지원)` },
                            { name: '예시', value: `- ${constants.DISCORD_CHAT_PREFIX}notify del kr notices` },
                        ],
                        timestamp: new Date(),
                        footer: {
                            text: constants.APP_NAME,
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
            if ([...lodestoneLocales, 'kr'].indexOf(searchInfo.region) === -1) {
                message.reply('존재하지 않는 지역이에요.');
                return;
            }
            if ([...Object.keys(categories.Global), ...Object.keys(categories.Korea)].indexOf(searchInfo.type) === -1) {
                message.reply('존재하지 않는 종류에요.');
                return;
            }
            if (searchInfo.region === 'kr' && Object.keys(categories.Global).indexOf(searchInfo.type) > -1 && Object.keys(categories.Korea).indexOf(searchInfo.type) === -1) {
                message.reply('한국 지역으로는 해당 종류를 사용할 수 없어요.');
                return;
            }
            if (lodestoneLocales.indexOf(searchInfo.region) > -1 && Object.keys(categories.Global).indexOf(searchInfo.type) === -1 && Object.keys(categories.Korea).indexOf(searchInfo.type) > -1) {
                message.reply('글로벌 지역으로는 해당 종류를 사용할 수 없어요.');
                return;
            }

            try
            {
                // 해당 서버의 Webhook URL 확인
                let hookUrl = await cacheUtil.getHookUrlByGuildId(message.guild.id);
                if (!hookUrl) {
                    message.reply('해당 디스코드 서버의 Webhook을 찾지 못했어요!');
                    return;
                }

                // 제거
                let delRes = await cacheUtil.delWebhook(searchInfo.region, searchInfo.type, hookUrl);
                message.reply('소식 설정이 성공적으로 변경되었어요!');

                logger.info(`'${message.guild.name} (${message.guild.id})' 에서 ${searchInfo.region}, ${searchInfo.type} 소식을 제거함`);
            }
            catch (e)
            {
                logger.error('소식 알림 기능 제거 오류');
                logger.error(e.stack);
            }
        },
    },

    // 상태
    status: {
        execute: async (message, args) => {
            try
            {
                // 해당 서버의 Webhook URL 확인
                let hookUrl = await cacheUtil.getHookUrlByGuildId(message.guild.id);
                if (!hookUrl) {
                    message.reply('해당 디스코드 서버의 Webhook을 찾지 못했어요!');
                    return;
                }

                let res = [];

                let locales = [...lodestoneLocales, 'kr'];
                let types = [...new Set([...Object.keys(categories.Global), ...Object.keys(categories.Korea)])];
                for (let localeIdx in locales) {
                    for (let typeIdx in types) {
                        let resCheck = await cacheUtil.checkInWebhook(locales[localeIdx], types[typeIdx], hookUrl);
                        if (resCheck) {
                            res.push({ locale: locales[localeIdx], type: types[typeIdx] });
                        }
                    }
                }

                if (res.length > 0) {
                    let str = '';
                    for (let resIdx in res) {
                        if (str.length > 0) {
                            str += "\n";
                        }
                        str += `${res[resIdx].locale} - ${res[resIdx].type}`;
                    }

                    message.reply('', {
                        embed: {
                            color: parseInt('ff867d', 16),
                            title: '소식 상태',
                            description: `현재 구독하고 있는 소식 목록입니다.\n\n${str}`,
                            timestamp: new Date(),
                            footer: {
                                text: constants.APP_NAME
                            },
                        }
                    });
                } else {
                    message.reply('존재하는 소식 알림이 없네요!');
                    return;
                }
            }
            catch (e)
            {
                logger.error('소식 알림 상태 확인 오류');
                logger.error(e.stack);
            }
            
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
                        { name: '명령어 종류', value: `${constants.DISCORD_CHAT_PREFIX}notify [add|del|status]` },
                    ],
                    timestamp: new Date(),
                    footer: {
                        text: constants.APP_NAME,
                    },
                }
            });
            return;
        }
        args.shift();

        if (message.member.guild.me.hasPermission('ADMINISTRATOR') || message.member.guild.me.hasPermmission('MANAGE_MESSAGES')) {
            if (['add', 'del', 'status'].indexOf(command) > -1) {
                cmds[command].execute(message, args);
            }
        } else {
            message.reply('사용할 수 있는 권한이 없어요!');
            return;
        }
    }
};
