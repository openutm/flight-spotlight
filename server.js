(function () {
    'use strict';
    /*jshint node:true*/

    const express = require('express');
    const expressSession = require('express-session');
    const passport = require('passport');

    const socket = require("socket.io");
    require("dotenv").config();
    var userInViews = require('./lib/middleware/userInViews');
    const spotlightNoticeboardRouter = require("./routes/spotlight_noticeboard");
    const launchpadRouter = require('./routes/launchpad');
    const auth_strategy = process.env.AUTH_STRATEGY || 'flightpassport';
    const authHandlers = {
        'flightpassport': './auth_mechanisms/flight_passport/auth_handler',
        'auth0': './auth_mechanisms/auth0/auth_handler'
    };

    const authHandlerPath = authHandlers[auth_strategy];
    if (authHandlerPath) {
        const authHandler = require(authHandlerPath);
        authHandler();
    } else {
        console.error(`Unknown authentication strategy: ${auth_strategy}`);
    }

    const session = {
        secret: process.env.APP_SECRET,
        cookie: {},
        resave: false,
        saveUninitialized: true
    };


    var app = express();
    app.use(expressSession(session));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }))
    app.set('view engine', 'ejs');
    app.use(express.static(__dirname + '/views'));
    app.use('/assets', express.static('static'));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use("/", spotlightNoticeboardRouter);
    app.use('/', launchpadRouter);

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
    // Constants
    let server = app.listen(process.env.PORT || 5000);

    const io = socket(server);
    app.set('socketio', io);
    let active_users = new Set();
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