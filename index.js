/**
 * FFXIV Service Toolbot
 */
const readline = require('readline');
const { version } = require('./package.json');

const logger = require('./libs/logger');
const news = require('./services/news');
const scheduler = require('./services/scheduler');
const webhook = require('./services/webhooks');

scheduler.run();
const r = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
console.log('FFXIV Service Toolbot');
console.log('Author by. Karsei');
console.log(`Version ${version}`);
r.setPrompt('> ');
r.prompt();
r.on('line', async (line) => {
    args = line.split(' ');
    
    if (line) {
        let cmd = args[0];

        try {
            switch (cmd) {
                case 'exit': {
                    r.close();
                    break;
                }
                case 'echo': {
                    args.shift();
                    logger.info(args.join(' '));
                    break;
                }
                case 'parse': {
                    let res = await news.fetchAll('na');
                    console.log(res);
                    break;
                }
                case 'webhook': {
                    webhook.newsExecuteAll();
                    break;
                }
            }
        } catch (e) {
            logger.error(e);
        }
    }
    
    r.prompt();
});
r.on('close', () => {
    process.exit();
});