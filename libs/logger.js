const winston = require('winston');
require('winston-daily-rotate-file');
require('date-utils');

const logger = winston.createLogger({
    // 최소 레벨
    // level: 'debug',
    // 출력
    transports: [
        // 파일 저장
        new winston.transports.DailyRotateFile({
            filename: 'log/service.log',
            zippedArchive: true,
            format: winston.format.printf(
                info => `[${new Date().toFormat('YYYY-MM-DD HH24:MI:SS')}] [${info.level.toUpperCase()}] - ${info.message}`)
        }),
        // 콘솔 출력
        new winston.transports.Console({
            handleExceptions: true,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.colorize(),
                winston.format.printf(info => `[${info.timestamp}] [${info.level}] ${info.message}`)
            )
        })
    ]
});

module.exports = logger;