const Koa = require('koa');
const Router = require('koa-router');
const IO = require('koa-socket');
// import send from 'koa-send';
const serve = require('koa-static');
const logger = require('koa-logger');
const config = require('./config').config;
const passport = require('koa-passport');
const FacebookStrategy = require('passport-facebook');
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');
const fs = require("fs");
const app = new Koa();
const io = new IO();
// const io = new IO("3000",{parser: parser});
const router = new Router();

const port = process.env.port || process.env.PORT || config.server.port;

app.keys = [config.server.sessionKey];
app.use(bodyParser());
app.use(serve('static'));
app.use(logger());
app.use(session({}, app));


passport.serializeUser(function (user, done) {
    // console.log("serializeUser", user);
    done(null, user)
});

passport.deserializeUser(async function (user, done) {
    // console.log("deserializeUser", user);
    done(null, user);
});

passport.use(new FacebookStrategy({
        clientID: config.auth.facebook.clientID,
        clientSecret: config.auth.facebook.clientSecret,
        // callbackURL: `http://${config.server.domen}:${port}/auth/facebook/callback`,
        // callbackURL: `${config.server.domen}:${port}/auth/facebook/callback`,
        callbackURL: `https://${config.server.domen}/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'photos', 'email', 'link']
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        return cb(null, profile);
        // User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        //     return cb(err, user);
        // });
    }
));


app.use(passport.initialize()); // сначала passport
app.use(passport.session()); // сначала passport
app.use(router.routes()); // потом маршруты


io.attach(app);

router
    .get('/', async(ctx) => {
        if(ctx.isAuthenticated()){
            ctx.redirect('/chat');
        } else {
            // await send(ctx, './templete/index.html');
            ctx.type = "html";
            ctx.body = fs.readFileSync('./templete/index.html');
        }
    })

    .get('/auth/facebook',
        passport.authenticate('facebook')
    )

    .get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            // successRedirect: '/app',
            failureRedirect: '/error'
        }),
        function (ctx) {
            ctx.redirect('/chat');
        }
    )

    .get('/logout', function (ctx) {
        ctx.logout();
        ctx.redirect('/');
    })

    .get('/chat', async(ctx) => {
        console.log("---\n", ctx.isAuthenticated(),"---\n", ctx, "\n---")
        if(ctx.isAuthenticated()){
            let user = ctx.state.user;
            // await send(ctx, './templete/chat.html');
            ctx.type = "html";
            ctx.body = fs.readFileSync('./templete/chat.html');
        } else {
            ctx.redirect('/');
        }

    })

    .get('/userData', async(ctx) => {
        if(ctx.isAuthenticated()) {
            let user = ctx.state.user;
            let photo = user && user.photos && user.photos[0] && user.photos[0].value;
            let userName = user && user.displayName || null;
            let link = user && user._json.link || null;
            ctx.body = {userName, photo, link};
        } else {
            ctx.body = {error : "not authentificate"};
        }
    })

    .get('/register', async (ctx) => {
        // await send(ctx, './register.html');
        ctx.type = "html";
        ctx.body = fs.readFileSync('./templete/register.html');
    });

app.use(async function (ctx, next) {
    const start = new Date();
    await next();
    console.log( new Date() - start, 'See the Date')
    ctx.redirect('/')
});

let numUsers = 0;
let addedUser = false;

let SavedUserData = {};

io.use(async function ( ctx, next ) {
    // console.log(ctx)
    await next()
});

io.on('connection', ctx => {
    console.log( 'New Connection Id', ctx.socket.id )   
});

io.on('new message', (ctx, data) => {
    console.log('new message');
    console.log(SavedUserData[ctx.socket.id]);
    io.broadcast('new message', {
      userData: SavedUserData[ctx.socket.id],
      message: data
    });
    // io.broadcast('new message', data);
});

io.on('typing', (ctx, userData) => {
    io.broadcast('typing',
        // userData: SavedUserData[ctx.socket.id]
        userData
    );
});
    
io.on('stop typing', (ctx, userData) => {
    io.broadcast('stop typing',
        // userData: SavedUserData[ctx.socket.id]
        userData
    );
});

io.on('disconnect', (ctx) => {
    // if (addedUser) {
        --numUsers;
        io.broadcast('user left', {
            userData: SavedUserData[ctx.socket.id],
            numUsers: numUsers
        });
    // }
});

io.on('add user', (ctx, userData) => {
    console.log("add user", userData);
    SavedUserData[ctx.socket.id] = userData;

    ++numUsers;
    addedUser = true;

    // ctx.socket.emit('login', {
    //     numUsers: numUsers
    // });

    io.broadcast('user joined', {
        userData: SavedUserData[ctx.socket.id],
        numUsers: numUsers
    });
});


app.listen(port, () => console.log(`server start: ${port}`) );
