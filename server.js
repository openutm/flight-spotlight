(function () {
    'use strict';
    /*jshint node:true*/

    var express = require('express');    
    var compression = require('compression');
    
    const expressSession = require("express-session");
    const passport = require("passport");
    var OAuth2Strategy = require('passport-oauth2');
    
    var userInViews = require('./lib/middleware/userInViews');
    const socket = require("socket.io");
    require("dotenv").config();
    var userInViews = require('./lib/middleware/userInViews');
    const bodyParser = require("body-parser");
    const authRouter = require("./routes/auth");
    
    const session = {
        secret: process.env.APP_SECRET,
        cookie: {},
        resave: false,
        saveUninitialized: false    
      };

    let strategy = new OAuth2Strategy({
        authorizationURL: process.env.PASSPORT_URL + process.env.PASSPORT_AUTHORIZATION_URL,
        tokenURL: process.env.PASSPORT_URL + process.env.PASSPORT_TOKEN_URL,
        clientID: process.env.PASSPORT_WEB_CLIENT_ID,
        clientSecret: process.env.PASSPORT_WEB_CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL,
        passReqToCallback: true,
    },
        function (accessToken, refreshToken, params,userProfile, cb) {
        return cb(null, userProfile);
        }
    );
    
    strategy.userProfile = function (accesstoken, done) {
        // choose your own adventure, or use the Strategy's oauth client
        const headers = {
        'User-Agent': 'request',
        'Authorization': 'Bearer ' + accesstoken,
        };
        this._oauth2._request("GET", process.env.PASSPORT_URL + process.env.PASSPORT_USERINFO_URL, headers, null, null, (err, data) => {
        if (err) { return done(err); }
        try {
            data = JSON.parse(data);
        }
        catch (e) {
            return done(e);
        }
        done(null, data);
        });
    };

        
    var app = express();
    app.use(compression());
    app.use((req, res, next) => {
        res.locals.isAuthenticated = req.isAuthenticated();
        next();
      });
    app.use(function (err, req, res, next) {
        if (err.name === 'UnauthorizedError') { 
        res.send(401, 'invalid token...');
        }
    });
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }))

    
    
    if (app.get("env") === "production") {
        // Serve secure cookies, requires HTTPS
        session.cookie.secure = true;
        }

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    // var ejs = require('ejs');
    app.set('view engine', 'ejs');

    app.use(express.static(__dirname + '/views'));

    app.use('/assets', express.static('static'));
    
    app.use(expressSession(session));

    passport.use(strategy);
    app.use(passport.initialize());
    app.use(passport.session());


    passport.serializeUser((user, done) => {
        done(null, user);
      });
      
    passport.deserializeUser((user, done) => {
    done(null, user);
    });
        
    app.use("/", authRouter);

    app.use(function(err, req, res, next){        
        return res.status(err.status).json({ message: err.message });
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