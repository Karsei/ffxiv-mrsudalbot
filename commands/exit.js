module.exports = {
    name: 'exit',
    description: 'Exit',
    execute(message, args) {
        message.channel.send(message.content.substr(message.content.indexOf(' ') + 1));
    }
};