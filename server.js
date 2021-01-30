const express = require('express');
const bodyParser = require('body-parser');

const constants = require('./config/constants');
const logger = require('./libs/logger')
const { webhooks } = require('./services/webhooks');

const app = express();

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set(`view engine`, `ejs`);

app.get('/', (req, res) => {
    res.render('index', {
        authorize_url: constants.DISCORD_URL_OAUTH_AUTHORIZED, 
        client_id: constants.DISCORD_BOT_CLIENT_ID,
        redirect_uri: `${constants.DISCORD_URL_BOT_HOST}/authorize`,
    });
});

app.get('/authorize', async (req, res) => {
    // https://discord.com/developers/docs/topics/oauth2
    // code, state, guild_id, permissions
    let state = req.query.state;
    let error = req.query.error;
    let code  = req.query.code;
    
    try {
        if (error) {
            throw error;
        }
        if (!code) {
            throw `parameter 'code' is not found.`;
        }

        let redirectUri = `${constants.DISCORD_URL_BOT_HOST}/authorize`;
        let resHook = await webhooks.makeHookUrl(code, redirectUri);
        webhooks.subscribe(resHook.url, { guild_id: req.query.guild_id });
        res.send(`<script>alert("봇이 추가되었습니다. 디스코드를 확인하세요."); window.location.href = "/";</script>`);
    } catch (error) {
        logger.error(error.stack);
        res.send(`<script>alert("봇을 추가하는 과정에서 오류가 발생했습니다."); window.location.href = "/";</script>`);
    }
});

app.listen(80, () => {
    console.log('서버 작동중');
});
