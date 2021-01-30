/**
 * [서비스] 소식
 */
const { promisify } = require('util');
const cheerio = require('cheerio');
const axios = require('axios');

const constants = require('../config/constants');
const categories = require('../config/categories');
const logger = require('../libs/logger');
const redis = require('../libs/redis');

/**
 * 소식 모음
 */
const news = {
    /**
     * 특정 글로벌 소식
     */
    fetchGlobal: async (pType, pLocale, pSkipCache = false) => {
        let outdate = await newsCache.isOutDate(pType, pLocale);
        if (pSkipCache || outdate) {
            try {
                let data = await parser.parseGlobal(categories.Global[pType].url, pType, pLocale);
                newsCache.setCache(JSON.stringify(data), pType, pLocale);
                return data;
            } catch (e) {
                console.error('Fetching Global Error');
                console.error(e.toJSON());
                let data = await newsCache.getCache(pType, pLocale);
                return JSON.parse(data);
            }
        } else {
            let data = await newsCache.getCache(pType, pLocale);
            return JSON.parse(data);
        }
    },

    /**
     * 전체 글로벌 소식
     */
    fetchGlobalAll: async (pLocale) => {
        // Promise.all 로 하면 429 오류가 뜨면서 요청이 많다고 뜨므로 하나씩 해주자
        let results = [];
        let globalCategories = Object.keys(categories.Global);
        for (let idx in globalCategories) {
            results.push(await news.fetchGlobal(globalCategories[idx], pLocale));
        }
        return results;
    },

    /**
     * 특정 한국 소식
     */
    fetchKorea: async (pType, pSkipCache = false) => {
        let outdate = await newsCache.isOutDate(pType, 'kr');
        if (pSkipCache || outdate) {
            try {
                let data = await parser.parseKorea(categories.Korea[pType].url, pType);
                newsCache.setCache(JSON.stringify(data), pType, 'kr');
                return data;
            } catch (e) {
                console.error('Fetching Korea Error');
                console.error(e.toJSON());
                let data = await newsCache.getCache(pType, 'kr');
                return JSON.parse(data);
            }
        } else {
            let data = await newsCache.getCache(pType, 'kr');
            return JSON.parse(data);
        }
    },

    /**
     * 전체 한국 소식
     */
    fetchKoreaAll: async () => {
        // Promise.all 로 하면 429 오류가 뜨면서 요청이 많다고 뜨므로 하나씩 해주자
        let results = [];
        let koreaCategories = Object.keys(categories.Korea);
        for (let idx in koreaCategories) {
            results.push(await news.fetchKorea(koreaCategories[idx]));
        }
        return results;
    },

    /**
     * 전체 소식
     */
    fetchAll: async (pLocale) => {
        return { global: await news.fetchGlobalAll(pLocale), korea: await news.fetchKoreaAll() };
    },
};

const newsCache = {
    CACHE_EXPIRE_IN: 600,
    setCache: (pNews, pType, pLocale) => {
        redis.hset(`${pLocale}-news-data`, pType, pNews);
        redis.hset(`${pLocale}-news-timestamp`, pType, new Date().getTime());
    },
    getCache: async (pType, pLocale) => {
        const getAsync = promisify(redis.hget).bind(redis);
        let data = await getAsync(`${pLocale}-news-data`, pType);
        return data;
    },
    getCacheHeaders: async (pType, pLocale) => {
        const getAsync = promisify(redis.hget).bind(redis);
        let lastModified = await getAsync(`${pLocale}-news-timestamp`, pType);
        return lastModified;
    },
    isOutDate: async (pType, pLocale) => {
        const getAsync = promisify(redis.hget).bind(redis);
        let timestamp = await getAsync(`${pLocale}-news-timestamp`, pType);
        let cacheTime = timestamp ? timestamp : new Date(0).getTime();
        return new Date().getTime() > (parseInt(cacheTime) + newsCache.CACHE_EXPIRE_IN);
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
            case 'maintenance':
                return parseUtil.korea.maintenance(pageData, localeBaseUrl);
            case 'updates':
                return parseUtil.korea.update(pageData, localeBaseUrl);
            case 'notices':
                return parseUtil.korea.notice(pageData, localeBaseUrl);
            default:
                return parseUtil.korea.news(pageData, localeBaseUrl);
        }
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
            case 'maintenance':
                return parseUtil.global.maintenance(pageData, localeBaseUrl, pLocale);
            default:
                return parseUtil.global.news(pageData, localeBaseUrl);
        };
    },

    /**
     * 한국 하위 파싱
     * 
     * @param {string} pUrl 파싱 URL
     * @param {string} pSubType 종류
     */
    parseKoreaSubs: async (pUrl, pSubType) => {
        let pageData = await axios.get(pUrl);
        pageData = cheerio.load(pageData.data);
        switch (pSubType) {
            case 'maintenance':
                return parseUtil.korea.subMaintenance(pageData);
            default:
                return;
        }
    },

    /**
     * 글로벌 하위 파싱
     * 
     * @param {string} pUrl 파싱 URL
     * @param {string} pSubType 종류
     * @param {string} pLocale 언어
     */
    parseGlobalSubs: async (pUrl, pSubType, pLocale) => {
        let pageData = await axios.get(pUrl);
        pageData = cheerio.load(pageData.data);
        switch (pSubType) {
            case 'maintenance':
                return parseUtil.global.subMaintenance(pageData, pLocale);
            default:
                return;
        }
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
        maintenance: async ($, pLocaleBaseUrl, pLocale) => {
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

                for (let idx in list) {
                    if (list[idx].url) {
                        list[idx].description = await parser.parseGlobalSubs(list[idx].url, 'maintenance', pLocale);
                    }
                }
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
        subMaintenance: ($, pLocale) => {
            let content = '';
            let textBox = $('.news__detail__wrapper');
            if (textBox.length > 0) {
                const TIMESTAMP_REGEX = {
                    'jp': /日　時：(.*)より(?:[\r\n|\r|\n]?)(.*:[\d]{2})/gmi,
                    'na': /(\w{3}\.? \d{1,2}, \d{4})? (?:from )?(\d{1,2}:\d{2}(?: [ap]\.m\.)?)(?: \((\w+)\))?/gi,
                    'eu': /(\w{3}\.? \d{1,2}, \d{4})? (?:from )?(\d{1,2}:\d{2}(?: [ap]\.m\.)?)(?: \((\w+)\))?/gi,
                    'de': /(\d{1,2}\. \w{3}\.? \d{4})? (?:von |um )?(\d{1,2}(?::\d{2})? Uhr)(?: \((\w+)\))?/gi,
                };
                // const I18N_MONTHS = {
                //     'de': { 'Jan': 'Jan', 'Feb': 'Feb', 'Mär': 'Mar', 'Apr': 'Apr', 'Mai': 'May', 'Jun': 'Jun', 'Jul': 'Jul', 'Aug': 'Aug', 'Sep': 'Sep', 'Okt': 'Oct', 'Nov': 'Nov', 'Dez': 'Dec' },
                // };
                // const I18N_DAYS = {
                //     'de': { 'So': 'Sun', 'Mo': 'Mon', 'Di': 'Tue', 'Mi': 'Wed', 'Do': 'Thu', 'Fr': 'Fri', 'Sa': 'Sat' },
                // };

                let text = textBox.text();
                let parseText = {
                    'start': '',
                    'end': '',
                };
                if (Object.keys(TIMESTAMP_REGEX).indexOf(pLocale) == -1) return '';

                let m = null;
                let regex = TIMESTAMP_REGEX[pLocale];

                if (pLocale == 'jp') {
                    let breakOver = false;
                    while ((m = regex.exec(text)) !== null) {
                        if (m.index === regex.lastIndex) {
                            regex.lastIndex++;
                        }
                        if (breakOver)  break;
                        breakOver = true;
                        
                        if (m[1])   parseText['start'] = (m[1] || '').trim();
                        if (m[2])   parseText['end'] = (m[2] || '').trim();
                    }

                    
                } else {
                    let countOver = 0;
                    while ((m = regex.exec(text)) !== null) {
                        if (m.index === regex.lastIndex) {
                            regex.lastIndex++;
                        }
                        if (countOver > 1)  break;
                        if (countOver == 0) {
                            if (m[0])   parseText['start'] = (m[0] || '').trim();
                        } else {
                            if (m[0])   parseText['end'] = (m[0] || '').trim();
                        }
                        countOver++;
                    }
                }

                if (parseText['start'].length > 0)  content += `${parseText['start']}`;
                if (parseText['end'].length > 0)  content += ` ~ ${parseText['end']}`;
            }

            return content;
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
        notice: ($, pLocaleBaseUrl) => {
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
                    parseDetail.thumbnail = 'http://static.ff14.co.kr/Contents/2019/04/0B93217EE978FE3F5AFFD847A20A55D20FF200821CBB6124AFDFEC38384E2FC8.jpg';

                    list.push(parseDetail);
                });
            }
            return list;
        },
        maintenance: async ($, pLocaleBaseUrl) => {
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
                    parseDetail.thumbnail = 'http://static.ff14.co.kr/Contents/2019/07/97809A6EB08E63368C57F973277459AD7AC75C71426E2D0B0613FE636FA63706.jpg';

                    list.push(parseDetail);
                });

                for (let idx in list) {
                    if (list[idx].url) {
                        list[idx].description = await parser.parseKoreaSubs(list[idx].url, 'maintenance');
                    }
                }
            }
            return list;
        },
        update: ($, pLocaleBaseUrl) => {
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
                    parseDetail.thumbnail = 'http://static.ff14.co.kr/Contents/2015/10/2015103017255463465.jpg';

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
        subMaintenance: ($) => {
            let content = '';
            let textBox = $('.board_view_box');
            if (textBox.length > 0) {
                let text = textBox.text();

                let list = {
                    date: [],
                    content: [],
                };
                let countBreak = 0;
                // 일시
                let regex = /일시[ :-]+(.*)/gm;
                let m = null;
                while ((m = regex.exec(text)) !== null) {
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    if (m[1])   list.date.push((m[1] || '').trim());

                    if (countBreak > 10) {
                        logger.error('something error');
                        break;
                    }
                    countBreak++;
                }
                // 내용
                regex = /내용[ :-]+(.*)/gm;
                m = null;
                countBreak = 0;
                while ((m = regex.exec(text)) !== null) {
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    if (m[1])   list.content.push((m[1] || '').trim());

                    if (countBreak > 10) {
                        logger.error('something error');
                        break;
                    }
                    countBreak++;
                }

                let count = 1;
                if (list.date.length == list.content.length) {
                    for (let idx in list.date) {
                        if (content.length > 0) content += `\n`;
                        content += `${count++}. ${list.content[idx]}\n`;
                        content += ` - ${list.date[idx]}`;
                    }
                } else {
                    content += `${list.date[0]}`;
                }
            }
            return content;
        }, 
    },
};

module.exports = news;
