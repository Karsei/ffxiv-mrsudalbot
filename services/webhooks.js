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
        
        // Redis에 Webhook 등록 (기본 등록)
        // 나라별 소식
        // 한국
        Object.keys(categories.Korea).map(type => {
            redis.sadd(`ko-${type}-webhooks`, pUrl);
        });
        // 글로벌
        Object.keys(categories.Global).map(type => {
            lodestoneLocales.forEach(locale => {
                // 당분간 북미 기준으로 topics, updates, developers 만 허용
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
        // 최신 소식을 가져오면서 Redis에 넣음
        let newPosts = pLocale !== 'ko' ? await news.fetchGlobal(pType, pLocale, true) : await news.fetchKorea(pType, true);
        newPosts = await redisUtil.postCache(newPosts, pLocale, pType);
        // Redis에 등록할 때 새로운 글이 없다면 그냥 끝냄
        if (newPosts.length === 0) return newPosts;

        // 소식을 Embed 메세지로 만듦
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
                description: post.description,  // TODO:: 글로벌 시간 설정
                url: post.url,
                color: pCategory.color,
                thumbnail: pCategory.thumbnail,
                image: post.thumbnail,
            });
        });

        // Redis에서 모든 등록된 웹훅 주소를 불러온 후, Embed는 10개씩 한 묶음으로, Webhook은 20개씩 한 묶음으로 구성해서 전송한다.
        // 이때 Discord 웹훅 제한이 걸릴 수 있으므로 주의할 것
        redis.smembers(`${pLocale}-${pType}-webhooks`, async (err, reply) => {
            if (err) throw err;
            let whList = reply;

            let result = {
                success: 0,
                removed: 0, 
                fail: 0,
                limited: 0,
            };
            
            let originNewPosts = newEmbedPosts.length;
            let originWhLists = whList.length;
            while (newEmbedPosts.length) {
                // 10개 묶음된 게시글
                let embedPosts = newEmbedPosts.splice(0, 10);
                let posts = { embeds: embedPosts };

                while (whList.length) {
                    // 20개 묶음된 Webhook
                    let hookUrls = whList.splice(0, 20);

                    let hookRes = await Promise.all(hookUrls.map(hookUrl => ratePromise(hookUrl, posts, pLocale, pType)));
                    hookRes.forEach(hr => {
                        switch (hr) {
                            case 'success':
                                result.success++;
                                break;
                            case 'removed':
                                result.removed++;
                                break;
                            case 'fail':
                                result.fail++;
                                break;
                            case 'limited':
                                result.limited++;
                                break;
                        }
                    });
                }
            }
            
            let numUrls = originWhLists - result.removed;
            if (result.removed > 0)     logger.info(`${result.removed}개의 Webhook이 제거되었음`);
            if (result.fail > 0)        logger.info(`${result.fail}개의 Webhook이 전송하는데 실패하였음`);
            if (result.limited > 0)     logger.info(`${result.limited}개의 Webhook이 전송하는데 제한 걸림`);
            logger.info(`총 ${numUrls}개의 Webhook을 이용하여 '${pLocale}' 언어로 총 ${originNewPosts}개 중 ${result.success}개의 ${pType} 게시글이 갱신됨`);
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

    newsExecuteResendAll: async () => {
        let count = await redisUtil.getResendItemLength();
        if (count == 0) return;

        logger.info(`총 ${count}개의 게시글을 다시 전송합니다...`);
        let allCount = count;
        let success = 0;

        while (count > 0) {
            let cachedData = await redisUtil.popResendItem();
            if (cached) {
                cachedData = JSON.parse(cachedData);

                try {
                    let resendRes = await discordUtil.sendMessage(cachedData.url, cachedData.body);

                    // 너무 많이 보낸 경우 미리 딜레이를 줌
                    if (resendRes.headers['x-ratelimit-remaining'] == '0') {
                        let time = (parseInt(resendRes.headers['x-ratelimit-reset']) * 1000) - (new Date().getTime());
                        if (time > 0) {
                            await Promise.delay(time + 1000);
                        }
                    }

                    success++;
                } catch (err) {
                    logger.error('다시 전송하는데 최종적으로 실패함');
                    if (err.config)     logger.error(err.config);
                    if (err.response)   logger.error(err.response);
                }
            }

            // 다시 남아있는 개수 계산
            count = await redisUtil.getResendItemLength();
        }

        logger.info(`총 ${allCount}개 중 ${success}개 재전송을 하는데 성공함`);
    }, 
};

const delayPromise = (pPromise, pDelay) => {
    return Promise.delay(pDelay).then(() => pPromise);
};
const ratePromise = (pHookUrl, pPost, pLocale, pType) => {
    return new Promise(async (resolve, reject) => {
        await discordUtil.sendMessage(pHookUrl, pPost)
            .then(async res => {
                // 너무 많이 보낸 경우 미리 딜레이를 줌
                if (res.headers['x-ratelimit-remaining'] == '0') {
                    let time = (parseInt(res.headers['x-ratelimit-reset']) * 1000) - (new Date().getTime());
                    if (time > 0) {
                        await Promise.delay(time + 1000);
                    }
                }
                resolve('success');
            }).catch(async err => {
                if (!err) {
                    logger.error('something wrong');
                    resolve('fail');
                } else if (!err.config) {
                    console.error('no err config', err);
                    logger.error('something wrong2');
                    resolve('fail');
                } else {
                    logger.error(err.config);
                    logger.error(err.response);
                    let hookUrl = err.config.url;

                    // 정상 요청이 아님
                    if (err.response.status === 400) {
                        if (err.response.data) {
                            // Webhook 제거됨
                            if (err.response.data.code === 10015) {
                                redis.srem(`${pLocale}-${pType}-webhooks`, hookUrl);
                                resolve('removed');
                            } else {
                                await redisUtil.addResendItem(hookUrl, pPost, pLocale, pType);
                                resolve('fail');
                            }
                        } else {
                            logger.error('something error occured');
                            await redisUtil.addResendItem(hookUrl, pPost, pLocale, pType);
                            resolve('fail');
                        }
                    // 요청을 너무 많이 보냄
                    } else if (err.response.status === 429) {
                        await Promise.delay(err.response.data.retry_after);
                        await redisUtil.addResendItem(hookUrl, pPost, pLocale, pType);
                        resolve('limited');
                    // 그 외
                    } else {
                        await redisUtil.addResendItem(hookUrl, pPost, pLocale, pType);
                        resolve('fail');
                    }
                }
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
        if (!pData) {
            logger.warn('something wrong');
            return [];
        }
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
    },

    popResendItem: async () => {
        const lPopAsync = promisify(redis.lpop).bind(redis);
        let res = lPopAsync('webhooks-news-resend');
        return res;
    },

    getResendItemLength: async () => {
        const lLenAsync = promisify(redis.llen).bind(redis);
        let res = lLenAsync('webhooks-news-resend');
        return res;
    },

    addResendItem: async (pUrl, pBody, pLocale, pType) => {
        const lPushAsync = promisify(redis.lpush).bind(redis);
        let res = lPushAsync('webhooks-news-resend', JSON.stringify({ url: pUrl, body: pBody, locale: pLocale, type: pType }));
        return res;
    },
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
