module.exports = {
    name: 'echo',
    description: 'Echo',
    execute(message, args) {
        message.channel.send(args.join(' '));
    }
};
