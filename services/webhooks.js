/**
 * [서비스] Webhook
 */
const { promisify } = require('util');
const axios = require('axios');
const Promise = require('bluebird');

const constants = require('../config/constants');
const categories = require('../config/categories');
const lodestoneLocales = require('../config/lodestoneLocales');
const logger = require('../libs/logger');
const redis = require('../libs/redis');
const news = require('./news');

const webhooks = {
    subscribe: async (pUrl, pParams) => {
        let guildId = pParams.guild_id;
        
        // Redis에 Webhook 등록
        // 나라별
        Object.keys(categories.Korea).map(type => {
            redis.sadd(`ko-${type}-webhooks`, pUrl);
        });
        Object.keys(categories.Global).map(type => {
            lodestoneLocales.forEach(locale => {
                if (['topics', 'updates', 'developers'].indexOf(type) > -1 && ['na'].indexOf(locale) > -1) {
                    redis.sadd(`${locale}-${type}-webhooks`, pUrl);
                }
            });
        });
       
        // 서버와 웹훅 추가 
        redis.hset('all-guilds', guildId, pUrl, (err, reply) => {
            if (err) throw err;
        });

        // 전체
        redis.sismember('all-webhooks', pUrl, (err, reply) => {
            if (err) throw err;
            if (!reply) {
                redis.sadd(`all-webhooks`, pUrl);
                logger.info(`${guildId} - ${pUrl} 등록 완료`);
            }
        });
    },

    makeHookUrl: async (pCode, pRedirectUri) => {
        let res = await discordUtil.createWebhook(pCode, pRedirectUri);
        return { url: `${constants.DISCORD_URL_WEBHOOK}/${res.data.webhook.id}/${res.data.webhook.token}`, hookData: res.data };
    },
    
    newsExecute: async (pType, pCategory, pLocale) => {
        // 1. 최신 소식을 가져오면서 REDIS에 넣는다. 반환값은 새롭게 넣어진 것들
        // 1-2. 위에서 새롭게 넣어진 것이 없다면 종료한다.
        let newPosts = pLocale !== 'ko' ? await news.fetchGlobal(pType, pLocale, true) : await news.fetchKorea(pType, true);
        newPosts = await redisUtil.postCache(newPosts, pLocale, pType);
        if (newPosts.length === 0) return newPosts;

        // 2. 새로운 소식을 Embed 메세지로 만든다.
        let newEmbedPosts = newPosts.map(post => {
            let link = `${constants.BASE_URL_PROTOCOL}://`;
            if ('ko' === pLocale)   link = `${link}${constants.BASE_URL_KOREA}${pCategory.link}`;
            else                    link = `${link}${pLocale}.${constants.BASE_URL_LODESTONE}${pCategory.link}`;

            return discordUtil.makeEmbed({
                author: {
                    name: pCategory.name,
                    url: link,
                    iconUrl: pCategory.icon,
                },
                title: post.title,
                description: post.description,  // 글로벌 시간 설정
                url: post.url,
                color: pCategory.color,
                thumbnail: pCategory.thumbnail,
                image: post.thumbnail,
            });
        });

        // 3. REDIS에서 모든 등록된 웹훅 주소를 불러온 후, Embed는 10개씩 한 묶음으로, Webhook은 20개씩 한 묶음으로 구성해서 전송한다.
        // 이때 Discord 웹훅 제한이 걸릴 수 있으므로 주의할 것
        redis.smembers(`${pLocale}-${pType}-webhooks`, async (err, reply) => {
            if (err) throw err;
            let whList = reply;

            let result = {
                success: 0,
                removed: 0, 
                fail: 0,
            };
            
            let originNewPosts = newEmbedPosts.length;
            let originWhLists = whList.length;
            while (newEmbedPosts.length) {
                let embedPosts = newEmbedPosts.splice(0, 10);
                let posts = { embeds: embedPosts };
                while (whList.length) {
                    let hookUrls = whList.splice(0, 20);
                    try {
                        let hookRes = await Promise.all(hookUrls.map(hookUrl => ratePromise(hookUrl, posts)));
                        hookRes.forEach(hr => {
                            if (hr.status == 204) {
                                result.success += embedPosts.length;
                            } else {
                                if (hr.data != '') {
                                    let hrRes = JSON.parse(hr.data);
                                    if (hrRes.code == 10015) {
                                        let whRes = redis.srem(`${pLocale}-${pType}-webhooks`, hookUrl);
                                        result.removed++;
                                    } else {
                                        result.fail++;
                                        // need resend
                                    }
                                } else {
                                    result.fail++;
                                    // need resend
                                }
                            }
                        });
                    } catch (ee) {
                        result.fail++;
                        // need resend
                        if (ee.response.status === 429) {
                            logger.warn('resend');
                            await Promise.delay(ee.response.data.retry_after);
                            await Promise.all(hookUrls.map(hookUrl => ratePromise(hookUrl, posts)));
                        } else {
                            console.error('send fail', ee);
                        }
                    }
                }
            }
            
            let numUrls = originWhLists - result.removed;
            if (result.removed > 0)     logger.info(`${result.removed}개의 Webhook이 제거되었음`);
            if (result.fail > 0)        logger.info(`${result.fail}개의 Webhook이 전송하는데 실패하였음`);
            logger.info(`총 ${numUrls}개의 Webhook을 이용하여 '${pLocale}' 언어로 총 ${result.success}/${originNewPosts * numUrls}개의 ${pType} 게시글이 갱신됨`);
        });
    },
    newsExecuteAll: () => {
        let jobs = [];
        lodestoneLocales.forEach(locale => {
            Object.keys(categories.Global).forEach(type => {
                jobs.push(delayPromise(webhooks.newsExecute(type, categories.Global[type], locale), 3000));
            });
        });
        Object.keys(categories.Korea).forEach(type => {
            jobs.push(delayPromise(webhooks.newsExecute(type, categories.Korea[type], 'ko'), 3000));
        });
        return Promise.all(jobs);
    },
};

const delayPromise = (pPromise, pDelay) => {
    return Promise.delay(pDelay).then(() => pPromise);
};
const ratePromise = (pHookUrl, pPost) => {
    return new Promise(async (resolve, reject) => {
        await discordUtil.sendMessage(pHookUrl, pPost)
            .then(async res => {
                if (res.headers['x-ratelimit-remaining'] == '0') {
                    let time = (parseInt(res.headers['x-ratelimit-reset']) * 1000) - (new Date().getTime());
                    if (time > 0) {
                        await Promise.delay(time);
                    }
                }
                resolve(res);
            }).catch(err => {
                reject(err);
            });
    });
};

/**
 * Embed 기본 형식
 */
const embedMsgTemplate = {
    author: {
        name: '',
        url: '',
        iconUrl: '',
    },
    title: '',
    description: '',
    url: '',
    color: '',
    thumbnail: '',
    image: '',
};

const redisUtil = {
    postCache: async (pData, pLocale, pType) => {
        const saddAsync = promisify(redis.sadd).bind(redis);
        
        let propSet = {};
        pData.forEach(d => {
            propSet[d.idx] = saddAsync(`${pLocale}-${pType}-ids`, d.idx);
        });
        
        let adds = [];
        await Promise.props(propSet).then((values) => {
            pData.forEach(d => {
                if (values[d.idx]) adds.push(d);
            });
        });
        adds.sort((a, b) => b.timestamp - a.timestamp);
        return adds;
    }
}

const discordUtil = {
    /**
     * 메세지 전송
     */
    sendMessage: (pUrl, pMsg) => {
        return axios({
            method: 'POST',
            url: pUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: pMsg,
        });
    },

    /**
     * Embed 메세지 작성
     */
    makeEmbed: (pData = {}) => {
        let oData = { ...embedMsgTemplate, ...pData };

        return {
            author: {
                name: oData.author.name,
                url: oData.author.url,
                icon_url: oData.author.iconUrl,
            },
            title: oData.title,
            description: oData.description,
            url: oData.url,
            color: oData.color,
            thumbnail: {
                url: oData.thumbnail,
            },
            image: {
                url: oData.image,
            },
        };
    },

    createWebhook: (pCode, pRedirectUri) => {
        // https://discord.com/developers/docs/resources/webhook#webhook-object
        let makeData = `client_id=${constants.DISCORD_BOT_CLIENT_ID}&client_secret=${constants.DISCORD_BOT_CLIENT_SECRET}&grant_type=authorization_code&code=${pCode}&redirect_uri=${pRedirectUri}`
        return axios({
            method: 'POST',
            url: constants.DISCORD_URL_OAUTH_TOKEN,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: makeData,
        }).catch(err => logger.error(err));
    },
};

module.exports = webhooks;
