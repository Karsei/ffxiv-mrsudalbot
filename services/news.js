/**
 * [서비스] 소식
 */
const cheerio = require('cheerio');
const axios = require('axios');

const constants = require('../config/constants');
const categories = require('../config/categories');
const redis = require('../libs/redis');

/**
 * 소식 모음
 */
const news = {
    /**
     * 특정 글로벌 소식
     */
    fetchGlobal: async (pType, pLocale, pSkipCache) => {
        pSkipCache = pSkipCache || false;
        if (pSkipCache) {
            return await newsCache.getCache(pType, pLocale);
        } else {
            let data = await parser.parseGlobal(categories.Global[pType].url, pType, pLocale);
            newsCache.setCache(JSON.stringify(data), pType, pLocale);
            return data;
        }
    },

    /**
     * 전체 글로벌 소식
     */
    fetchGlobalAll: async (pLocale) => {
        return Promise.all(Object.keys(categories.Global).map((e) => news.fetchGlobal(e, pLocale)));
    },

    /**
     * 특정 한국 소식
     */
    fetchKorea: async (pType, pSkipCache) => {
        pSkipCache = pSkipCache || false;
        if (pSkipCache) {
            return await newsCache.getCache(pType, 'ko');
        } else {
            let data = await parser.parseKorea(categories.Korea[pType].url, pType);
            newsCache.setCache(JSON.stringify(data), pType, 'ko');
            return data;
        }
    },

    /**
     * 전체 한국 소식
     */
    fetchKoreaAll: async () => {
        return Promise.all(Object.keys(categories.Korea).map((e) => news.fetchKorea(e)));
    },

    /**
     * 전체 소식
     */
    fetchAll: async (pLocale) => {
        return { global: await news.fetchGlobalAll(pLocale), korea: await news.fetchKoreaAll() };
    }
};

const newsCache = {
    setCache: (pNews, pType, pLocale) => {
        redis.hset(`${pLocale}-news-data`, pType, pNews);
        redis.hset(`${pLocale}-news-timestamp`, pType, new Date());
    },
    getCache: async (pType, pLocale) => {
        let redisData = await new Promise((resolve, reject) => {
            redis.hget(`${pLocale}-news-data`, pType, (err, reply) => {
                if (err) throw err;
                resolve(reply);
            });
        });
        return redisData;
    },
}

/**
 * 파싱 분류
 */
const parser = {
    /**
     * 한국
     */
    parseKorea: async (pUrl, pType) => {
        let localeBaseUrl = `${constants.BASE_URL_PROTOCOL}://${constants.BASE_URL_KOREA}`;
        let pageData = await axios.get(`${localeBaseUrl}${pUrl}`);
        pageData = cheerio.load(pageData.data);
        switch (pType) {
            case 'patchnote':
                return parseUtil.korea.patchNote(pageData, localeBaseUrl);
            case 'event':
                return parseUtil.korea.event(pageData, localeBaseUrl);
            default:
                return parseUtil.korea.news(pageData, localeBaseUrl);
        };
    },

    /**
     * 글로벌
     */
    parseGlobal: async (pUrl, pType, pLocale) => {
        let localeBaseUrl = `${constants.BASE_URL_PROTOCOL}://${pLocale}.${constants.BASE_URL_LODESTONE}`;
        let pageData = await axios.get(`${localeBaseUrl}${pUrl}`);
        pageData = cheerio.load(pageData.data);
        switch (pType) {
            case 'topics':
                return parseUtil.global.topics(pageData, localeBaseUrl);
            case 'developers':
                return parseUtil.global.developerBlog(pageData);
            default:
                return parseUtil.global.news(pageData, localeBaseUrl);
        };
    },
};

/**
 * 파싱 처리
 */
const parseUtil = {
    global: {
        news: async ($, pLocaleBaseUrl) => {
            let list = [];
            let $targetTable = $('.news__content');
            let $list = $targetTable.find('li.news__list');
            if ($list && $list.length > 0) {
                $list.each(function (idx, data) {
                    let parseDetail = {};

                    let url = $(this).find('a').attr('href');
                    parseDetail.idx = url.match(/[^/]+$/)[0];
                    parseDetail.url = `${pLocaleBaseUrl}${url}`;
                    parseDetail.title = $(this).find('p.news__list--title').text().replace(/(\[.*\])|(\r\n|\n|\r)/gm, '').trim();
                    parseDetail.timestamp = $(this).find('script').html().match(/ldst_strftime\((\d+)./)[1] * 1000;
                    
                    list.push(parseDetail);
                });
            }
            return list;
        },
        topics: async ($, pLocaleBaseUrl) => {
            let list = [];
            let $targetTable = $('.news__content');
            let $list = $targetTable.find('li.news__list--topics');
            if ($list && $list.length > 0) {
                $list.each(function (idx, data) {
                    let parseDetail = {};

                    let $url = $(this).find('p.news__list--title > a');
                    parseDetail.idx = $url.attr('href').match(/[^/]+$/)[0];
                    parseDetail.url = `${pLocaleBaseUrl}${$url.attr('href')}`;
                    parseDetail.title = $(this).find('p.news__list--title').text().replace(/([\r\n|\n|\r])/gm, '').trim();
                    parseDetail.timestamp = $(this).find('script').html().match(/ldst_strftime\((\d+)./)[1] * 1000;
                    parseDetail.thumbnail = $(this).find('img').attr('src');

                    let $detail = $(this).find('div.news__list--banner');
                    parseDetail.description = $detail.find('p:eq(1)').text().replace(/([\r\n|\n|\r])/gm, '').trim();
                    
                    list.push(parseDetail);
                });
            }
            return list;
        },
        developerBlog: ($) => {
            let list = [];
            let $list = $('entry');
            if ($list && $list.length > 0) {
                $list.each(function (idx, data) {
                    let parseDetail = {};
                    parseDetail.idx = $(this).find('id').text();
                    parseDetail.url = $(this).find('link').attr('href');
                    parseDetail.title = $(this).find('title').text().replace(/([\r\n|\n|\r])/gm, '').trim();
                    parseDetail.timestamp = $(this).find('published').text().replace(/([\r\n|\n|\r])/gm, '').trim();

                    let $content = cheerio.load($(this).find('content').html().trim().replace(/<!--\[CDATA\[<([\w]+)-->/, '<$1>'));
                    let descs = [];
                    $content('p').slice(0, 3).each(function (idx, ele) { if ($(this).text().length > 0) descs.push($(this).text()); });
                    parseDetail.description = descs.join('\n\n');
                    
                    list.push(parseDetail);
                });
            }
            return list;
        },
    },
    korea: {
        news: ($, pLocaleBaseUrl) => {
            let list = [];
            let $targetTable = $('.ff14_board_list');
            let $list = $targetTable.find('tr');
            if ($list && $list.length > 0) {
                $list.each(function (idx, data) {
                    if ($(this).find('th').length > 0)  return true;

                    let parseDetail = {};
                    parseDetail.idx = $(this).find('td.num').html();

                    let $title = $(this).find('td span.title');
                    parseDetail.title = $title.find('strong').html().replace(/([\r\n|\n|\r])/gm, '').trim();
                    parseDetail.url = `${pLocaleBaseUrl}${$title.find('a').attr('href')}`;
                    
                    list.push(parseDetail);
                });
            }
            return list;
        },
        event: ($, pLocaleBaseUrl) => {
            let list = [];
            let $targetTable = $('.banner_list.event');
            let $list = $targetTable.find('li > a');
            if ($list && $list.length > 0) {
                $list.each(function (idx, data) {
                    let parseDetail = {};

                    let url = $(this).attr('href');
                    parseDetail.idx = url.split(`?`)[0].split(`/`).slice(-1)[0];
                    parseDetail.title = $(this).find('span.txt').html().replace(/([\r\n|\n|\r])/gm, '').trim();
                    parseDetail.url = `${pLocaleBaseUrl}${url}`;

                    let $thumbnail = $(this).find('span.banner_img').attr('style');
                    $thumbnail = $thumbnail.split(`'`);
                    parseDetail.thumbnail = `${constants.BASE_URL_PROTOCOL}:${$thumbnail[1]}`;

                    parseDetail.summary = $(this).find('.summary.dot').html().replace(/([\r\n|\n|\r])/gm, '').trim();
                    
                    list.push(parseDetail);
                });
            }
            return list;
        },
        patchNote: ($, pLocaleBaseUrl) => {
            let list = [];
            let $targetTable = $('.banner_list.note');
            let $list = $targetTable.find('li > a');
            if ($list && $list.length > 0) {
                $list.each(function (idx, data) {
                    let parseDetail = {};
                    parseDetail.idx = $(this).find('span.num').html();
                    parseDetail.title = $(this).find('span.txt').html().replace(/([\r\n|\n|\r])/gm, '').trim();
                    parseDetail.url = `${pLocaleBaseUrl}${$(this).attr('href')}`;

                    let $thumbnail = $(this).find('span.banner_img').attr('style');
                    $thumbnail = $thumbnail.split(`'`);
                    parseDetail.thumbnail = `${constants.BASE_URL_PROTOCOL}:${$thumbnail[1]}`;
                    
                    list.push(parseDetail);
                });
            }
            return list;
        },
    },
};

module.exports = news;