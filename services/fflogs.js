const { promisify } = require('util');
const cheerio = require('cheerio');
const axios = require('axios');

const constants = require('../config/constants');
const fflogsConfig = require('../config/fflogs');
const logger = require('../libs/logger');
const redis = require('../libs/redis');

const fflogs = {
    fetchSearch: async (pSearchInfo, pSkipCache = false) => {
        let outdate = await fflogsCache.isOutDateZone();
        let zoneData;
        try {
            if (pSkipCache || outdate) {
                zoneData = await fflogsUtil.getZone();
                zoneData = zoneData.data;
                fflogsCache.setZone(JSON.stringify(zoneData));
            } else {
                zoneData = await fflogsCache.getZone();
            }
        } catch (e) {
            console.error('Fetching Error');
            console.error(e.toJSON());
            return [];
        }

        let parseData = await parser.getZoneRankingList(zoneData, pSearchInfo);
        return parseData;
    },
    fetchZone: async () => {
        try {
            let zones = await fflogsUtil.getZone();
            return zones.data;
        } catch (e) {
            logger.error(e.stack);
        }
    },
};

const fflogsUtil = {
    DEFAULT_ZONE_DETAIL_TEMPLATE: {
        charIdUrl: '',
        charId: '',
        filterPlayerMetric: 'dps',
        raidType: 3,
        filterZone: -1,
        filterBoss: -1,
        filterDifficulty: 5000,
        filterSize: 0,
        filterPartition: -1,
        filterSpec: 'Any',
        filterMetricCompare: 'rankings',
        filterByBracket: 0,
        includePrivateLogs: 0,
        dpstype: 'rdps',
    },
    getZone: () => {
        return axios.get(`https://www.fflogs.com/v1/zones?api_key=${constants.FFLOGS_WEB_TOKEN}`);
    },
    getCharacterId: async (pRegion, pServer, pUserName) => {
        let charUrl = `https://www.fflogs.com/character/${pRegion.toLowerCase()}/${pServer.toLowerCase()}/${encodeURI(pUserName)}`;
        let charPage = await axios.get(charUrl);
        let charId = charPage.data.match(/var characterID \= ([\d]+)\;/i);
        return { id: charId ? charId[1] : '', url: charUrl };
    },
    getRankingZone: (pZoneTemplate) => {
        pZoneTemplate = {
            ...fflogsUtil.DEFAULT_ZONE_DETAIL_TEMPLATE,
            ...pZoneTemplate
        };

        let parseheader = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.18362',
            'X-Requested-With': 'XMLHttpRequest',
            'Host': 'www.fflogs.com',
            'Referer': pZoneTemplate.charIdUrl,
        };
        let parseUrl = `https://www.fflogs.com/character/rankings-zone/${pZoneTemplate.charId}/${pZoneTemplate.filterPlayerMetric}/${pZoneTemplate.raidType}/${pZoneTemplate.filterZone}/${pZoneTemplate.filterBoss}/${pZoneTemplate.filterDifficulty}/${pZoneTemplate.filterSize}/${pZoneTemplate.filterPartition}/${pZoneTemplate.filterSpec}/${pZoneTemplate.filterMetricCompare}/${pZoneTemplate.filterByBracket}/${pZoneTemplate.includePrivateLogs}?dpstype=${pZoneTemplate.dpstype}`;
        return axios.get(parseUrl, { headers: parseheader });
    },
};

const fflogsCache = {
    CACHE_EXPIRE_IN: 600,
    isOutDateZone: async () => {
        const getAsync = promisify(redis.get).bind(redis);
        let timestamp = await getAsync(`fflogs-zone-timestamp`);
        let cacheTime = timestamp ? timestamp : new Date(0).getTime();
        return new Date().getTime() > (parseInt(cacheTime) + fflogsCache.CACHE_EXPIRE_IN);
    },
    setZone: async (pData) => {
        const setAsync = promisify(redis.set).bind(redis);
        let data = await setAsync(`fflogs-zone-data`, pData);
        return data;
    },
    getZone: async () => {
        const getAsync = promisify(redis.get).bind(redis);
        let data = await getAsync(`fflogs-zone-data`);
        return data;
    },
};

const parser = {
    getZoneRankingList: async (pAllZoneData, pSearchInfo) => {
        // 2글자 나라 변환
        let i18nRegion = Object.keys(fflogsConfig.BASE_REGION_I18N);
        let userRegion = null;
        for (let idx in i18nRegion) {
            if (fflogsConfig.BASE_REGION_I18N[i18nRegion[idx]].indexOf(pSearchInfo.region) > -1) {
                userRegion = i18nRegion[idx];
                break;
            }
        }
        if (!userRegion) {
            throw new Error('There is no proper converted region service.');
        }

        // 서비스 기준 찾기
        let regServers = Object.keys(fflogsConfig.BASE_REGION_SERVERS);
        let region = null;
        for (let idx in regServers) {
            if (fflogsConfig.BASE_REGION_SERVERS[regServers[idx]].indexOf(pSearchInfo.server) > -1) {
                region = regServers[idx];
                break;
            }
        }
        if (!region) {
            throw new Error('There is no proper region service.');
        }

        // ID 번호 조회
        let { id: charId,  url: charIdUrl } = await fflogsUtil.getCharacterId(pSearchInfo.region, pSearchInfo.server, pSearchInfo.userName);
        if (!charId) {
            throw new Error(`There is no proper character id. (Id: ${charId}, Region: ${pSearchInfo.region}, Server: ${pSearchInfo.server}, Name: ${pSearchInfo.userName}`);
        }

        // Zone 찾기
        let categories = Object.keys(fflogsConfig.BASE_DEFAULT_CATEGORIES);
        if (categories.indexOf(pSearchInfo.type) === -1) {
            throw new Error('There is no proper category.');
        }
        let zoneData = null;
        for (let idx in pAllZoneData) {
            if (pAllZoneData[idx].id === fflogsConfig.BASE_DEFAULT_CATEGORIES[pSearchInfo.type][userRegion]) {
                zoneData = pAllZoneData[idx];
                break;
            }
        }
        if (!zoneData) {
            throw new Error('There is no proper zone data.');
        }

        // Raidtype 찾기
        let raidTypes = Object.keys(fflogsConfig.BASE_RAIDTYPES);
        let raidType = null;
        if (raidTypes.indexOf(pSearchInfo.type) > -1) {
            raidType = fflogsConfig.BASE_RAIDTYPES[pSearchInfo.type];
        }
        if (!raidType) {
            throw new Error('There is no proper raid type.');
        }

        // 파티션 찾기
        let partitionNum = -1;
        if (zoneData.partitions && Array.isArray(zoneData.partitions)) {
            let lastIdx = 1;
            let lastData = null;
            let allFilteredCount = 0;
            let filteredSameCount = 0;
            for (let _idx = 0, _all = zoneData.partitions.length; _idx < _all; _idx++) {
                if (zoneData.partitions[_idx].default) {
                    if (zoneData.partitions[_idx].filtered_name) {
                        allFilteredCount++;
                        if (zoneData.partitions[_idx].filtered_name === fflogsConfig.BASE_REGION_GAME_VERSION[userRegion]) {
                            filteredSameCount++;
                        }
                    }
                    if (zoneData.partitions[_idx].filtered_name && zoneData.partitions[_idx].filtered_name !== fflogsConfig.BASE_REGION_GAME_VERSION[userRegion]) {
                        let versions = zoneData.partitions[_idx].filtered_name.match(/([\d].[\d])?([\d].[\d])/gmi);
                        if (versions) {
                            let targetVersion = parseFloat(fflogsConfig.BASE_REGION_GAME_VERSION[userRegion]);
                            let startVersion = parseFloat(versions[0]);
                            let endVersion = versions[1] ? parseFloat(versions[1]) : startVersion;
                            if (startVersion > targetVersion || targetVersion > endVersion) continue;
                        } else {
                            continue;
                        }
                    }
                    lastIdx = _idx + 1;
                    lastData = zoneData.partitions[_idx];
                }
            }
            if (!lastData) {
                throw new Error('There is no proper partitions.');
            }
            if (allFilteredCount == 0 || (allFilteredCount > 0 && allFilteredCount == filteredSameCount)) {
                partitionNum = 1;
            } else {
                partitionNum = lastIdx;
            }
        }

        let parseList = [];
        for (let idx in zoneData.encounters) {
            let paramSet = {
                charIdUrl: charIdUrl,
                charId: charId,
                raidType: raidType,
                filterZone: zoneData.id,
                filterBoss: zoneData.encounters[idx].id,
                filterPartition: partitionNum,
            };

            let rankingRes = await fflogsUtil.getRankingZone(paramSet);
            let parRes = parseUtil.rankingDetail(cheerio.load(rankingRes.data));
            if (parRes.length > 0) {
                let _parse = {
                    idx: parseInt(idx) + 1,
                    name: zoneData.encounters[idx].name,
                    detail: parRes,
                }
                parseList.push(_parse);
            }
        }

        return parseList;
    },
}

const parseUtil = {
    rankingDetail: ($) => {
        let parses = [];

        const $parseTable = $('#boss-table tbody');
        const $parses = $parseTable.find('tr');
        if ($parses.length > 0) {
            $parses.each(function(_parIdx, _par) {
                let parseDetail = {};
                parseDetail.percentile = $(this).find('td.rank-percent a').html().replace(/(\r\n|\n|\r)/gm, '');
                parseDetail.useclass = $(this).find('td.rank-percent img').attr('class').match(/tiny-icon sprite actor-sprite-([\w]+)/i)[1].replace(/(\r\n|\n|\r)/gm, '');
                parseDetail.parse = $(this).find('td.rank a').html().replace(/(\r\n|\n|\r)/gm, '');
                parseDetail.dps = $(this).find('td.primary a').html().replace(/(\r\n|\n|\r)/gm, '');
                parseDetail.rdps = $(this).find('td.rdps a').html().replace(/(\r\n|\n|\r)/gm, '');
                parseDetail.adps = $(this).find('td.adps a').html().replace(/(\r\n|\n|\r)/gm, '');
                parseDetail.patch = $(this).find('td.patch-cell').html().replace(/(\r\n|\n|\r)/gm, '');
                parseDetail.duration = $(this).find('td.main-table-number').eq(0).find('a').html().replace(/(\r\n|\n|\r)/gm, '');
                parseDetail.date = parseInt($(this).find('script').html().match(/var reportDate \= new Date\(([\d]+)\)/i)[1]);
                parseDetail.bestMedian = $('.best-perf-avg b').html().replace(/(\r\n|\n|\r)/gm, '');
                parses.push(parseDetail);
            });
        }

        return parses;
    },
}

module.exports = fflogs;
