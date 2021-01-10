require('date-utils');

const constants = require('../config/constants');
const fflogsConfig = require('../config/fflogs');
const logger = require('../libs/logger');
const fflogs = require('../services/fflogs');

const cmds = {
    search: {
        execute: async (message, args) => {
            if (!args || args.length < 4) {
                message.channel.send('', {
                    embed: {
                        color: parseInt('ff867d', 16),
                        title: '프프로그 검색 명령어 안내',
                        description: `특정 컨텐츠의 각 인스턴스별 가장 잘 나온 데이터를 집계한 정보를 출력합니다.`,
                        fields: [
                            { name: '사용법', value: `${constants.DISCORD_CHAT_PREFIX}fflogs search <인스턴스종류> <지역> <서버> <닉네임>` },
                            { name: '파라미터', value: `인스턴스졷류 - ${Object.keys(fflogsConfig.BASE_DEFAULT_CATEGORIES).join(', ')}\n지역 - kr, na, jp, fr\n서버 - moogle, carbuncle, mandragora, aegis, titan, ...` },
                            { name: '예시', value: `- ${constants.DISCORD_CHAT_PREFIX}fflogs search raid jp titan Hong Guildong\n - ${constants.DISCORD_CHAT_PREFIX}fflogs search trial kr moogle 홍길동` },
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
                type: args[0].toLowerCase(),
                region: args[1].toLowerCase(),
                server: args[2].toLowerCase(),
                userName: args[4] ? `${args[3].toLowerCase()} ${args[4].toLowerCase()}` : args[3].toLowerCase(), 
            };

            // 타입 체크
            let types = Object.keys(fflogsConfig.BASE_DEFAULT_CATEGORIES);
            if (types.indexOf(searchInfo.type) === -1) {
                message.channel.send(`종류가 올바르지 않아요!\n예시: ${types.join(', ')}`);
                return;
            }

            // 지역 체크
            let regions = Object.keys(fflogsConfig.BASE_REGION_I18N);
            let rFound = false;
            for (let idx in regions) {
                if (fflogsConfig.BASE_REGION_I18N[regions[idx]].indexOf(searchInfo.region) > -1) {
                    rFound = true;
                    break;
                }
            }
            if (!sFound) {
                message.channel.send(`지역이 올바르지 않아요!\n예시: kr, na, jp, fr`);
                return;
            }

            // 서버 체크
            let servers = Object.keys(fflogsConfig.BASE_REGION_SERVERS);
            let sFound = false;
            for (let idx in servers) {
                if (fflogsConfig.BASE_REGION_SERVERS[servers[idx]].indexOf(searchInfo.server) > -1) {
                    sFound = true;
                    break;
                }
            }
            if (!sFound) {
                message.channel.send(`서버가 올바르지 않아요!\n예시: carbuncle, chocobo, moogle, mandragora, ...`);
                return;
            }

            message.channel
                .send(`불러오고 있어요! 잠시만 기다려주세요...`)
                .then(async waitMsg => {
                    try {
                        let parseStr = '';
                        let searchRes = await fflogs.fetchSearch(searchInfo, true);
                        for (let idx in searchRes) {
                            let boss = searchRes[idx];

                            // parse 정보가 없으면 건너뜀
                            if (boss.detail.length <= 0)    continue;

                            // parse 중에서 제일 잘 나온 parse를 선택한다.
                            let highestRDPSDetail = {};
                            let highestRDPS = 0;
                            for (let detKey in boss.detail) {
                                let parseDetail = boss.detail[detKey];
                                if (parseInt(parseDetail.rdps) > parseInt(highestRDPS)) {
                                    highestRDPS = parseDetail.rdps;
                                    highestRDPSDetail = parseDetail;
                                }
                            }

                            // 줄바꿈
                            if (parseStr !== '')    parseStr += "\n";
                            parseStr += `${boss.name} - [Med: ${highestRDPSDetail.bestMedian}%][${highestRDPSDetail.useclass}] ${highestRDPSDetail.percentile}% (전체 ${highestRDPSDetail.parse}명), rDPS: ${highestRDPSDetail.rdps} ~ ${new Date(highestRDPSDetail.date).toFormat('YYYY-MM-DD HH24:MI:SS')}\n`;
                        }

                        if (parseStr !== '') {
                            // 전송
                            waitMsg.edit('', {
                                embed: {
                                    color: parseInt('b6f542', 16),
                                    title: `[${searchInfo.server.toUpperCase()}] ${searchInfo.userName}`,
                                    description: `각 인스턴스마다 가장 잘 나온 데이터를 집계한 정보입니다.`,
                                    fields: [
                                        { name: '정보', value: parseStr },
                                    ],
                                    timestamp: new Date(),
                                    footer: {
                                        text: 'FFXIV Service ToolBot'
                                    }
                                }
                            });
                        } else {
                            waitMsg.edit('집계된 내역이 없어요!');
                        }
                    } catch (e) {
                        waitMsg.edit('오류가 발생해서 보여드릴 수 없네요.. 잠시 후에 다시 시도해보세요.');
                        logger.error(e.stack);
                    }
                });
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
        const command = args.length > 0 ? args[0].toLowerCase() : '';

        if (args.length === 0 || (command && !cmdsUtil.isExistCommand(Object.keys(cmds), command))) {
            message.channel.send('', {
                embed: {
                    color: parseInt('ff867d', 16),
                    title: '프프로그 명령어 안내',
                    description: `프프로그 관련 명령어를 실행합니다.`,
                    fields: [
                        { name: '명령어 종류', value: `${constants.DISCORD_CHAT_PREFIX}fflogs [search]` },
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

        if ('search' === command) {
            cmds[command].execute(message, args);
        }
    }
};
