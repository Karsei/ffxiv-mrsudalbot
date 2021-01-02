/**
 * [서비스] Webhook
 */
const axios = require('axios');
const Promise = require('bluebird');

const constants = require('../config/constants');
const categories = require('../config/categories');
const lodestoneLocales = require('../config/lodestoneLocales');
const logger = require('../libs/logger');
const news = require('./news');

let count = 0;

const webhooks = {
    newsExecute: async (pType, pCategory, pLocale) => {
        if (count > 0) return;
        count++;

        // 1. 최신 소식을 가져오면서 REDIS에 넣는다. 반환값은 새롭게 넣어진 것들
        // 1-2. 위에서 새롭게 넣어진 것이 없다면 종료한다.
        let newPosts = pLocale !== 'ko' ? await news.fetchGlobal(pType, pLocale, true) : await news.fetchKorea(pType, true);

        // 2. 새로운 소식을 Embed 메세지로 만든다.
        let newEmbedPosts = newPosts.map(post => {
            let link = `${constants.BASE_URL_PROTOCOL}://`;
            if ('ko' === pLocale)   link = `${link}${constants.BASE_URL_KOREA}${pCategory.link}`;
            else                    link = `${link}${constants.BASE_URL_LODESTONE}${pCategory.link}`;

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
        })

        // 3. REDIS에서 모든 등록된 웹훅 주소를 불러온 후, Embed는 10개씩 한 묶음으로, Webhook은 20개씩 한 묶음으로 구성해서 전송한다.
        // 이때 Discord 웹훅 제한이 걸릴 수 있으므로 주의할 것
        let subcount = 0;
        while (newEmbedPosts.length) {
            let posts = { embeds: newEmbedPosts.splice(0, 2) };
            if (subcount > 0) break;
            subcount++;
            console.log(posts);

            //discordUtil.sendMessage('', posts);
        }
        console.log(pType, pCategory, pLocale);
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
    postCache: (pData) => {
        // 
    }
}

const discordUtil = {
    /**
     * 메세지 전송
     */
    sendMessage: (pUrl, pMsg) => {
        axios({
            method: 'POST',
            url: pUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                pMsg
            },
        }).then(res => {
            console.log(res);
        }).catch(error => {
            logger.error(error);
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
};

module.exports = webhooks;