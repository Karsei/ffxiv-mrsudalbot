require('date-utils');

const logger = require('../libs/logger');
const { ServiceError } = require('../libs/exceptions');
const constants = require('../config/constants');

function getNextDayOfWeek(date, dayOfWeek) {
    // Code to check that date and dayOfWeek are valid left as an exercise ;)
    var resultDate = new Date(date.getTime());
    resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);

    return resultDate;
}

const calculateTime = (pStart, pEnd) => {
    let _sec = 1000;
    let _min = _sec * 60;
    let _hour = _min * 60;
    let _day = _hour * 24;

    let diffDate = pStart - pEnd;
    let d_day = Math.floor(diffDate / _day);
    let d_hour = Math.floor((diffDate % _day) / _hour);
    let d_min = Math.floor((diffDate % _hour) / _min);
    let d_sec = Math.floor((diffDate % _min) / _sec);
    let d_msec = diffDate % _sec;
    
    let diffDateStr = '';
    diffDateStr += d_day + '일 ';
    diffDateStr += d_hour + '시간 ';
    diffDateStr += d_min + '분 ';
    diffDateStr += d_sec + '초 ';
    diffDateStr += d_msec + '';

    diffDateStr += ' 남음';

    return diffDateStr;
};

const cmds = {
    fetch: {
        execute: async (message, args) => {
            message.reply(`불러오고 있어요! 잠시만 기다려주세요...`)
                .then(async waitMsg => {
                    try {
                        const curTime = new Date();

                        // 일일 (매일 0시)
                        let nextZero = new Date((new Date()).setHours(24, 0, 0, 0));
                        let daily = calculateTime(nextZero, new Date());

                        // 주간 (매주 화요일 오후 5시)
                        let nextTuesFivePm = getNextDayOfWeek(new Date(), 2);
                        nextTuesFivePm.setHours(17);
                        let weekly = calculateTime(nextTuesFivePm, new Date());

                        // 패션체크 보고 (매주 목요일 오후 5시)
                        let nextThursFivePm = getNextDayOfWeek(new Date(), 4);
                        nextThursFivePm.setHours(17);
                        let fashionReport = calculateTime(nextThursFivePm, new Date());

                        // 총사령부 납품 (매일 오전 5시)
                        let nextGrand = new Date((new Date()).setHours(29, 0, 0, 0));
                        if (nextZero > curTime && nextZero - curTime > (3600 * 60 * 60 * 19)) {
                            nextGrand = (new Date()).setHours(5);
                        }
                        let grand = calculateTime(nextGrand, new Date());

                        // 주간 복권 (매주 토요일 오후 10시)
                        let nextWeeklyCact = getNextDayOfWeek(new Date(), 6);
                        nextWeeklyCact.setHours(22);
                        let weeklyCact = calculateTime(nextWeeklyCact, new Date());

                        waitMsg.edit('', {
                            embed: {
                                color: parseInt('cfcfcf', 16),
                                title: `초기화 시간`,
                                fields: [
                                    { name: '일일 (매일 0시)', value: daily },
                                    { name: '주간 (매주 화요일 오후 5시)', value: weekly },
                                    { name: '패션체크 보고 (매주 목용ㄹ 오후 5시)', value: fashionReport },
                                    { name: '총사령부 납품 (매일 오전 5시)', value: grand },
                                    { name: '주간 복권 (매주 토요일 오후 10시)', value: weeklyCact },
                                ],
                                timestamp: new Date(),
                                footer: {
                                    text: constants.APP_NAME,
                                },
                            }
                        });
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
    name: 'reset',
    description: 'shows reset time',
    execute(message, args) {
        cmds['fetch'].execute(message, args);
    }
};
