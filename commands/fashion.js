require('date-utils');

const snoowrap = require('snoowrap');

const logger = require('../libs/logger');
const { ServiceError } = require('../libs/exceptions');
const constants = require('../config/constants');

const cmds = {
    fetch: {
        execute: async (message, args) => {
            message.reply(`불러오고 있어요! 잠시만 기다려주세요...`)
                .then(async waitMsg => {
                    try {
                        const reddit = new snoowrap({
                            userAgent: 'DalDalee Discord Bot',
                            clientId: constants.REDDIT_CLIENT_ID,
                            clientSecret: constants.REDDIT_CLIENT_SECRET,
                            refreshToken: constants.REDDIT_CLIENT_REFRESH_TOKEN,
                        });
                        const subReddit = await (await reddit.getSubreddit('ffxiv')).search({
                            query: 'author:kaiyoko Fashion Report',
                            sort: 'new',
                            limit: 1,
                        });
                        
                        if (subReddit && subReddit[0]) {
                            const latest = subReddit[0];
                            waitMsg.edit('', {
                                embed: {
                                    color: parseInt('fc03f4', 16),
                                    title: `패션 체크`,
                                    description: `${latest.title}\n(Powered By. Kaiyoko Star)\n\n글로벌과 한국 서버의 패션 체크는 동일합니다.`,
                                    timestamp: new Date(),
                                    url: `https://www.reddit.com/${latest.permalink}`,
                                    image: {
                                        url: latest.url,
                                    },
                                    thumbnail: {
                                        url: 'https://styles.redditmedia.com/t5_c3dzb/styles/profileIcon_ugxkdcpuxbp51.png?width=256&height=256&crop=256:256,smart&s=a1f754e55d562256c326bbc97302bc7d895e3806',
                                    },
                                    footer: {
                                        text: constants.APP_NAME,
                                    },
                                }
                            });
                        } else {
                            throw new ServiceError(`패션체크 최신 정보를 불러오는 과정에서 오류가 발생했습니다.`);
                        }
                    } catch (e) {
                        if (e instanceof ServiceError) {
                            waitMsg.edit(e.message);
                        } else {
                            waitMsg.edit('오류가 발생해서 보여드릴 수 없네요.. 잠시 후에 다시 시도해보세요.');
                            logger.error(e.stack);
                        }
                    }
                });
        },
    },
};

module.exports = {
    name: 'fashion',
    description: 'shows current fashion report status',
    execute(message, args) {
        cmds['fetch'].execute(message, args);
    }
};
