(function () {
    'use strict';
    /*jshint node:true*/

    var express = require('express');
    const expressSession = require('express-session');
    const passport = require('passport');
    const { Issuer, Strategy, custom } = require('openid-client');
    

    
    const socket = require("socket.io");
    require("dotenv").config();
    var userInViews = require('./lib/middleware/userInViews');
    const bodyParser = require("body-parser");
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
            client_secret: process.env.CLIENT_SECRET,
            redirect_uris: [process.env.CALLBACK_URL],
            response_types: ["code"]

        });


        app.use(passport.initialize());
        app.use(passport.session());
        
        passport.use(
            'oidc',
            new Strategy({ client }, (tokenSet, userinfo, done) => {
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

        // start authentication request
        app.get('/auth', function (req, res, next) {
            passport.authenticate('oidc', function (err, user, info) {
                if (err) {
                    return next(err); // will generate a 500 error
                }
                // Generate a JSON response reflecting authentication status
                if (!user) {
                    return res.send({ success: false, message: 'authentication failed' });
                }
                // ***********************************************************************
                // "Note that when using a custom callback, it becomes the application's
                // responsibility to establish a session (by calling req.login()) and send
                // a response."
                // Source: http://passportjs.org/docs
                // ***********************************************************************
                req.login(user, loginErr => {
                    if (loginErr) {
                        return next(loginErr);
                    }
                    return res.send({ success: true, message: 'authentication succeeded' });
                });
            })(req, res, next);
        });

        // authentication callback
        app.get('/auth/callback', (req, res, next) => {
            passport.authenticate('oidc', function (err, user, info) {
                
                if (err) {
                    return next(err); // will generate a 500 error
                }
                // Generate a JSON response reflecting authentication status
                if (!user) {
                    return res.send({ success: false, message: 'authentication failed' , 'info':info});
                }
                // ***********************************************************************
                // "Note that when using a custom callback, it becomes the application's
                // responsibility to establish a session (by calling req.login()) and send
                // a response."
                // Source: http://passportjs.org/docs
                // ***********************************************************************
                req.login(user, loginErr => {
                    if (loginErr) {
                        return next(loginErr);
                    }
                    return res.redirect('/spotlight');
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