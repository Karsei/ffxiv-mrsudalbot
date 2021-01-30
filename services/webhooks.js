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
    /**
     * 서버 구독 시 처리
     * 
     * @param {string} pUrl Webhook Url
     * @param {array} pParams 기타 필요 파라미터
     */
    subscribe: async (pUrl, pParams) => {
        let guildId = pParams.guild_id;
        
        // Redis에 Webhook 등록 (기본 등록)
        // 나라별 소식
        // 한국
        Object.keys(categories.Korea).map(type => {
            cacheUtil.addWebhook('kr', type, pUrl);
        });
        // 글로벌
        Object.keys(categories.Global).map(type => {
            lodestoneLocales.forEach(locale => {
                // 당분간 북미 기준으로 topics, updates, developers 만 허용
                if (['topics', 'updates', 'developers'].indexOf(type) > -1 && ['na'].indexOf(locale) > -1) {
                    cacheUtil.addWebhook(locale, type, pUrl);
                }
            });
        });
       
        // 서버 추가
        cacheUtil.addAllGuilds(guildId, pUrl);

        // Webhook 추가
        let existWebhook = cacheUtil.checkInAllWebhooks(pUrl);
        if (!existWebhook) {
            cacheUtil.addAllWebhooks(pUrl);
            logger.info(`${guildId} - ${pUrl} 등록 완료`);
        }
    },

    /**
     * Webhook URL 생성
     * 
     * @param {integer} pCode 응답 코드
     * @param {string} pRedirectUri Redirect URL
     */
    makeHookUrl: async (pCode, pRedirectUri) => {
        let res = await discordWebhookUtil.createWebhook(pCode, pRedirectUri);
        return { url: `${constants.DISCORD_URL_WEBHOOK}/${res.data.webhook.id}/${res.data.webhook.token}`, hookData: res.data };
    },
    
    /**
     * 소식 전달
     * 
     * @param {string} pType 종류
     * @param {string} pCategory 카테고리
     * @param {string} pLocale 언어
     */
    newsExecute: async (pType, pCategory, pLocale) => {
        // 최신 소식을 가져오면서 Redis에 넣음
        let newPosts = pLocale !== 'kr' ? await news.fetchGlobal(pType, pLocale, true) : await news.fetchKorea(pType, true);
        newPosts = await cacheUtil.addId(newPosts, pLocale, pType);
        // Redis에 등록할 때 새로운 글이 없다면 그냥 끝냄
        if (newPosts.length === 0) return newPosts;

        // 소식을 Embed 메세지로 만듦
        let newEmbedPosts = newPosts.map(post => {
            let link = `${constants.BASE_URL_PROTOCOL}://`;
            if ('kr' === pLocale)   link = `${link}${constants.BASE_URL_KOREA}${pCategory.link}`;
            else                    link = `${link}${pLocale}.${constants.BASE_URL_LODESTONE}${pCategory.link}`;

            return discordWebhookUtil.makeEmbed({
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

                    let hookRes = await Promise.all(hookUrls.map(hookUrl => sender.sendNews(hookUrl, posts, pLocale, pType)));
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
            logger.info(`총 ${originNewPosts}개의 ${pType} ('${pLocale}') 게시글을 총 ${numUrls}개의 Webhook 중에서 ${result.success}개가 전송하는데 성공함`);
        });
    },

    /**
     * 모든 소식 전달
     */
    newsExecuteAll: async () => {
        let jobs = [];

        // 글로벌
        let globalTypes = Object.keys(categories.Global);
        lodestoneLocales.forEach(async locale => {
            for (let idx in globalTypes) {
                let type = globalTypes[idx];
                jobs.push(await Promise.delay(1000).return(webhooks.newsExecute(type, categories.Global[type], locale)));
            }
        });
        // 한국
        let koreaTypes = Object.keys(categories.Korea);
        for (let idx in koreaTypes) {
            let type = koreaTypes[idx];
            jobs.push(await Promise.delay(1000).return(webhooks.newsExecute(type, categories.Korea[type], 'kr')));
        }

        return jobs;
    },

    /**
     * 누락된 Webhook에 모든 소식 재전달
     */
    newsExecuteResendAll: async () => {
        let count = await cacheUtil.getResendItemLength();
        if (count == 0) return;

        logger.info(`총 ${count}개의 게시글을 다시 전송합니다...`);
        let allCount = count;
        let success = 0;

        while (count > 0) {
            let cachedData = await cacheUtil.popResendItem();
            if (cached) {
                cachedData = JSON.parse(cachedData);

                try {
                    let resendRes = await discordWebhookUtil.sendMessage(cachedData.url, cachedData.body);

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
            count = await cacheUtil.getResendItemLength();
        }

        logger.info(`총 ${allCount}개 중 ${success}개 재전송을 하는데 성공함`);
    }, 
};

/**
 * 전달 모음
 */
const sender = {
    /**
     * Discord에 소식 전달
     * 
     * @param {string} pHookUrl Webhook URL
     * @param {object} pPost Embed된 소식 데이터
     * @param {string} pLocale 언어
     * @param {string} pType 종류
     */
    sendNews: (pHookUrl, pPost, pLocale, pType) => {
        return new Promise(async (resolve, reject) => {
            await discordWebhookUtil.sendMessage(pHookUrl, pPost)
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
                        logger.error('There is no sending response error message.');
                        await cacheUtil.addResendItem(pHookUrl, pPost, pLocale, pType);
                        resolve('fail');
                    } else {
                        logger.error(err.config);
                        logger.error(err.response);
    
                        // 정상 요청이 아님
                        if (err.response.status === 400) {
                            if (err.response.data) {
                                // Webhook 제거됨
                                if (err.response.data.code === 10015) {
                                    redis.srem(`${pLocale}-${pType}-webhooks`, pHookUrl);
                                    resolve('removed');
                                } else {
                                    await cacheUtil.addResendItem(pHookUrl, pPost, pLocale, pType);
                                    resolve('fail');
                                }
                            } else {
                                logger.error('something error occured');
                                await cacheUtil.addResendItem(pHookUrl, pPost, pLocale, pType);
                                resolve('fail');
                            }
                        // 요청을 너무 많이 보냄
                        } else if (err.response.status === 429) {
                            await Promise.delay(err.response.data.retry_after);
                            await cacheUtil.addResendItem(pHookUrl, pPost, pLocale, pType);
                            resolve('limited');
                        // 그 외
                        } else {
                            await cacheUtil.addResendItem(pHookUrl, pPost, pLocale, pType);
                            resolve('fail');
                        }
                    }
                });
        });
    },
}

/**
 * Cache 조회 모음
 */
const cacheUtil = {
    /**
     * 게시글별 Webhook URL Cache 등록
     * 
     * @param {string} pLocale 언어
     * @param {string} pType 종류
     * @param {string} pUrl Webhook URL
     */
    addWebhook: async (pLocale, pType, pUrl) => {
        const saddAsync = promisify(redis.sadd).bind(redis);
        let res = saddAsync(`${pLocale}-${pType}-webhooks`, pUrl);
        return res;
    },

    /**
     * 게시글별 Webhook URL Cache 삭제
     * 
     * @param {string} pLocale 언어
     * @param {string} pType 종류
     * @param {string} pUrl Webhook URL
     */
    delWebhook: async (pLocale, pType, pUrl) => {
        const sDelAsync = promisify(redis.srem).bind(redis);
        let res = sDelAsync(`${pLocale}-${pType}-webhooks`, pUrl);
        return res;
    },

    /**
     * 모든 서버 고유번호 목록에 등록
     * 
     * @param {string} pGuildId Discord 서버 고유번호
     * @param {string} pUrl Webhook URL
     */
    addAllGuilds: async (pGuildId, pUrl) => {
        const hsetAsync = promisify(redis.hset).bind(redis);
        let res = hsetAsync('all-guilds', pGuildId, pUrl);
        return res;
    },

    /**
     * 모든 서버 Webhook 목록에 등록
     * 
     * @param {string} pUrl Webhook URL
     */
    addAllWebhooks: async (pUrl) => {
        const saddAsync = promisify(redis.sadd).bind(redis);
        let res = saddAsync(`all-webhooks`, pUrl);
        return res;
    },

    /**
     * 모든 서버 Webhook 목록에 해당 url이 있는지 확인
     * 
     * @param {string} pUrl Webhook URL
     */
    checkInAllWebhooks: async (pUrl) => {
        const sismemberAsync = promisify(redis.sismember).bind(redis);
        let res = sismemberAsync(`all-webhooks`, pUrl);
        return res;
    },

    /**
     * 게시글 id Cache 등록
     * 
     * @param {string} pData 데이터
     * @param {string} pLocale 언어
     * @param {string} pType 종류
     * @return {array} 게시글 id
     */
    addId: async (pData, pLocale, pType) => {
        if (!pData) {
            logger.error(`There is no post cache.`);
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

    /**
     * 소식 다시 보낼 Webhook URL과 데이터가 있는 객체 꺼냄
     * 
     * @return {object} url, body가 있는 객체
     */
    popResendItem: async () => {
        const lPopAsync = promisify(redis.lpop).bind(redis);
        let res = lPopAsync('webhooks-news-resend');
        return res;
    },

    /**
     * 소식 다시 보낼 Webhook URL과 데이터가 있는 객체의 개수 조회
     */
    getResendItemLength: async () => {
        const lLenAsync = promisify(redis.llen).bind(redis);
        let res = lLenAsync('webhooks-news-resend');
        return res;
    },

    /**
     * 소식 다시 보낼 객체 삽입
     * 
     * @param {string} pUrl Webhook URL
     * @param {string} pBody 데이터
     * @param {string} pLocale 언어
     * @param {string} pType 종류
     */
    addResendItem: async (pUrl, pBody, pLocale, pType) => {
        const lPushAsync = promisify(redis.lpush).bind(redis);
        let res = lPushAsync('webhooks-news-resend', JSON.stringify({ url: pUrl, body: pBody, locale: pLocale, type: pType }));
        return res;
    },

    /**
     * 서버 고유번호로 Webhook URL 조회
     * 
     * @param {string} pGuildId 서버 고유 번호
     * @return {string} Webhook URL
     */
    getHookUrlByGuildId: async (pGuildId) => {
        const sUrlAsync = promisify(redis.hget).bind(redis);
        let res = sUrlAsync('all-guilds', pGuildId);
        return res;
    }
}

/**
 * Discord Webhook 모음
 */
const discordWebhookUtil = {
    /**
     * 메세지 Embed 기본 형식
     */
    TEMPLATE_EMBED_MESSAGE: {
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
    },

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
        let oData = { ...discordWebhookUtil.TEMPLATE_EMBED_MESSAGE, ...pData };

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

    /**
     * 인증 및 Webhook 생성
     * 
     * @param {string} pCode 응답 코드
     * @param {string} pRedirectUri Redirect URL
     */
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

const Webhooks = {
    webhooks,
    cacheUtil,
};

module.exports = Webhooks;
