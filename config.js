module.exports.config = {
    server : {
        // domen : "localhost",
        domen : "chat-hell.herokuapp.com",
        // domen : "sheltered-chamber-39570.herokuapp.com",
        port : 3000,
        sessionKey : 'your-session-secret'
    },
    db : {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'mikhailzakharov',
        password: ''
    },
    auth : {
        facebook : {
            clientID : "154612508441886",
            clientSecret : "8ec70abaef221529ad85c0d6e4568c59"
        }
    }

}