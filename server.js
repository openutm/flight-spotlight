(function () {
    'use strict';
    /*jshint node:true*/

    const express = require('express');
    const expressSession = require('express-session');
    const passport = require('passport');
    const { Issuer, Strategy, generators, custom } = require('openid-client');
    const socket = require("socket.io");
    require("dotenv").config();
    var userInViews = require('./lib/middleware/userInViews');
    const authRouter = require("./routes/auth");
    const launchpadRouter = require('./routes/launchpad');

    const session = {
        secret: process.env.APP_SECRET,
        cookie: {},
        resave: false,
        saveUninitialized: true
    };
    custom.setHttpOptionsDefaults({
        timeout: 5000,
    });

    const code_verifier = generators.codeVerifier();
    // store the code_verifier in your framework's session mechanism, if it is a cookie based solution
    // it should be httpOnly (not readable by javascript) and encrypted.

    const code_challenge = generators.codeChallenge(code_verifier);
    var app = express();
    app.use(expressSession(session));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }))
    app.set('view engine', 'ejs');
    app.use(express.static(__dirname + '/views'));
    app.use('/assets', express.static('static'));
    Issuer.discover(process.env.OIDC_DOMAIN).then(passport_issuer => {
        var client = new passport_issuer.Client({
            client_id: process.env.CLIENT_ID,

            token_endpoint_auth_method: 'none'
        });

        client.authorizationUrl({
            scope: 'openid profile',
            resource: process.env.OIDC_DOMAIN + '/auth',
            code_challenge,
            code_challenge_method: 'S256',
        });
        const params = {
            client_id: process.env.CLIENT_ID,
            redirect_uri: process.env.CALLBACK_URL,
            scope: 'openid profile',
        }
        const passReqToCallback = false; // optional, defaults to false, when true req is passed as a first
        const usePKCE = 'S256'; // optional, defaults to false, when true the code_challenge_method will be
        // resolved from the issuer configuration, instead of true you may provide
        // any of the supported values directly, i.e. "S256" (recommended) or "plain"


        app.use(passport.initialize());
        app.use(passport.session());
        passport.use(
            'oidc',
            new Strategy({ client, params, passReqToCallback, usePKCE }, (tokenSet, userinfo, done) => {

                return done(null, tokenSet.claims());
            })
        );

        // handles serialization and deserialization of authenticated user
        passport.serializeUser(function (user, done) {
            done(null, user);
        });
        passport.deserializeUser(function (user, done) {
            done(null, user);
        });

        app.get('/auth', function (req, res, next) {
            passport.authenticate('oidc')(req, res, next);
        });

        // authentication callback
        app.get('/auth/callback', (req, res, next) => {

            const options = { successRedirect: '/spotlight', failureRedirect: '/' };
            passport.authenticate('oidc', options, (err, user, info) => {

                if (err) {
                    console.log(`ERROR: ${err.error}: ${err.error_description}`);
                    return next(err);
                }
                if (!user) return res.redirect(options.failureRedirect);
                req.logIn(user, err => {
                    if (err) return next(err);
                    return res.redirect(options.successRedirect);
                });
            })(req, res, next);
        });

        app.use(passport.initialize());
        app.use(passport.session());

        app.use("/", authRouter);
        app.use('/', launchpadRouter);

    });

    // Constants
    var server = app.listen(process.env.PORT || 5000);

    const io = socket(server);
    app.set('socketio', io);
    const active_users = new Set();
    io.on('connection', function (socket) {
        socket.on('room', function (room) {
            active_users.add(room);
            socket.join(room);
            sendWelcomeMsg(room);
        });
        socket.on('message', function (msg) {
            var room = msg.room;
            var data = msg.data;
            sendStdMsg(room, data);
        });
        socket.on("disconnect", () => {
            active_users.delete(socket.userId);
            io.emit("user disconnected", socket.userId);
        });
    });

    function sendWelcomeMsg(room) {
        io.sockets.in(room).emit('welcome', 'Joined ' + room);
    }

    function sendStdMsg(room, synthesisid) {
        io.sockets.in(room).emit('message', { 'type': 'message', 'synthesisid': synthesisid });
    }
    function sendProgressMsg(room, percentcomplete) {

        io.sockets.in(room).emit('message', { 'type': 'progress', 'percentcomplete': percentcomplete });
    }

    server.on('error', function (e) {
        console.log(e);
        process.exit(1);
    });

    server.on('close', function (e) {
        console.log('Cesium development server stopped.');
    });

    var isFirstSig = true;
    process.on('SIGINT', function () {
        if (isFirstSig) {
            console.log('Cesium development server shutting down.');
            server.close(function () {
                process.exit(0);
            });
            isFirstSig = false;
        } else {
            console.log('Cesium development server force kill.');
            process.exit(1);
        }
    });

})();