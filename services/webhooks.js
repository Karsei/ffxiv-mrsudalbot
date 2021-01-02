/**
 * [서비스] Webhook
 */
const axios = require('axios');
const Promise = require('bluebird');

const categories = require('../config/categories');
const lodestoneLocales = require('../config/lodestoneLocales');

const webhooks = {
    newsExecute: async (pType, pCategory, pLocale) => {
        // 1. 최신 소식을 가져오면서 REDIS에 넣는다. 반환값은 새롭게 넣어진 것들
        // 1-2. 위에서 새롭게 넣어진 것이 없다면 종료한다.

        // 2. 새로운 소식을 Embed 메세지로 만든다.

        // 3. REDIS에서 모든 등록된 웹훅 주소를 불러온 후, Embed는 10개씩 한 묶음으로, Webhook은 20개씩 한 묶음으로 구성해서 전송한다.
        // 이때 Discord 웹훅 제한이 걸릴 수 있으므로 주의할 것
        console.log(pType, pCategory, pLocale);
    },
    newsExecuteAll: () => {
        let jobs = [];
        lodestoneLocales.forEach(locale => {
            Object.keys(categories.Global).forEach(type => {
                jobs.push(delayPromise(webhooks.newsExecute(type, categories.Global[type], locale), 3000));
            });
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