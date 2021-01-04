/**
 * [서비스] 스케쥴러
 */
const cron = require('node-cron');

const webhooks = require('./webhooks');

const scheduler = {
    run: () => {
        let wCron = cron.schedule('5,15,25,35,45,55 * * * *', () => {
            webhooks.newsExecuteAll();
        }, { timezone: 'Asia/Seoul' });
        let wsCron = cron.schedule('0,10,20,30,40,50 * * * *', () => {
            webhooks.newsExecuteResendAll();
        }, { timezone: 'Asia/Seoul' });

        wCron.start();
        wsCron.start();
    },
};

module.exports = scheduler;
