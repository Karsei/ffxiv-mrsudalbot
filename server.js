const express = require('express');
const bodyParser = require('body-parser');

const constants = require('./config/constants');
const logger = require('./libs/logger')
const webhooks = require('./services/webhooks');

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

app.get('/authorize', (req, res) => {
    // https://discord.com/developers/docs/topics/oauth2
    let state = req.query.state;
    let error = req.query.error;
    let code  = req.query.code;
    console.log(req.query);
    
    try {
        if (error) {
            throw error;
        }
        if (!code) {
            throw `parameter 'code' is not found.`;
        }

        let redirectUri = `${constants.DISCORD_URL_BOT_HOST}/authorize`;
        let res = webhooks.makeHookUrl(code, redirectUri);
        webhooks.subscribe(res);
        res.json({ msg: 'Success' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ msg: 'Failed. something error occured' });
    }
});

app.listen(9292, () => {
    console.log('서버 작동중');
});