const constants = require('../config/constants');
const fflogsConfig = require('../config/fflogs');
const logger = require('../libs/logger');
const fflogs = require('../services/fflogs');

const cmds = {
    search: {
        execute: async (message, args) => {
            if (!args || args.length < 3) {
                message.channel.send(`명령어가 올바르지 않아요!`);
                return;
            }

            // 검색 파라미터 준비
            let searchInfo = {
                server: args[0],
                userName: args[1],
                type: args[2],
                region: 'kr',
            };

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

            // 타입 체크
            let types = Object.keys(fflogsConfig.BASE_DEFAULT_CATEGORIES);
            let tFound = false;
            for (let idx in types) {
                if (types.indexOf(searchInfo.type) > -1) {
                    tFound = true;
                    break;
                }
            }
            if (!tFound) {
                message.channel.send(`종류가 올바르지 않아요!\n\n예시: raid, 24raid, trial, trial_unreal, ultimate`);
                return;
            }

            message.channel
                .send(`불러오고 있어요! 잠시만 기다려주세요...`)
                .then(async waitMsg => {
                    try {
                        let parseStr = '';
                        let searchRes = await fflogs.fetchSearch(searchInfo);
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
                            parseStr += `${boss.name} - [Med: ${highestRDPSDetail.bestMedian}%][${highestRDPSDetail.useclass}] ${highestRDPSDetail.percentile}% (전체 ${highestRDPSDetail.parse}명), rDPS: ${highestRDPSDetail.rdps} ~ ${new Date(highestRDPSDetail.date).format('yyyy/MM/dd HH:mm:ss')}\n`;
                        }

                        if (parseStr !== '') {
                            // 전송
                            waitMsg.edit('', {
                                embed: {
                                    color: parseInt('b6f542', 16),
                                    title: `[${searchInfo.server.toUpperCase()}] ${searchInfo.name}`,
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
        args.shift();

        if ('search' === command) {
            cmds[command].execute(message, args);
        }
    }
};
