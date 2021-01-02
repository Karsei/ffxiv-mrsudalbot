/**
 * [서비스] 스케쥴러
 */
const cron = require('node-cron');

const scheduler = {
    run: () => {
        let wCron = cron.schedule('5,15,25,35,45,55 * * * *', () => {
            console.log('webhook send');
        }, { timezone: 'Asia/Seoul' });
        let wsCron = cron.schedule('0,10,20,30,40,50 * * * *', () => {
            console.log('webhook resend');
        }, { timezone: 'Asia/Seoul' });

        wCron.start();
        wsCron.start();
    },
};

module.exports = scheduler;