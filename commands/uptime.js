let oStartDate = new Date();

module.exports = {
    name: 'uptime',
    description: 'Shows server uptime',
    execute(message, args) {
        let _sec = 1000;
        let _min = _sec * 60;
        let _hour = _min * 60;
        let _day = _hour * 24;

        let diffDate = new Date() - oStartDate;
        let d_day = Math.floor(diffDate / _day);
        let d_hour = Math.floor((diffDate % _day) / _hour);
        let d_min = Math.floor((diffDate % _hour) / _min);
        let d_sec = Math.floor((diffDate % _min) / _sec);
        let d_msec = diffDate % _sec;
        
        let diffDateStr = '';
        if (d_day > 0)  diffDateStr += d_day + '일 ';
        if (d_hour > 0) diffDateStr += d_hour + '시간 ';
        if (d_min > 0)  diffDateStr += d_min + '분 ';
        if (d_sec > 0)  diffDateStr += d_sec + '초 ';
        if (d_msec > 0)  diffDateStr += d_msec + '';

        message.channel.send(`서버 업타임 - ${diffDateStr}`);
    }
};
