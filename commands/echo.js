module.exports = {
    name: 'echo',
    description: 'Echo',
    execute(message, args) {
        message.channel.send('봇을 오프라인으로 전환하고 서버를 종료합니다...')
            .then(() => discordClient.destroy())
            .then(() => process.exit());
    }
};