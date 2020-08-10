(function () {
    'use strict';
    /*jshint node:true*/

    var express = require('express');    
    var compression = require('compression');
    // var url = require('url');
    // var req = require('request');
    // var async = require('async');
    const expressSession = require("express-session");
    const passport = require("passport");


    var OAuth2Strategy = require('passport-oauth2');
    var flash = require('connect-flash');
    var userInViews = require('./lib/middleware/userInViews');
    const socketServer = require('socket.io');
    const socketIO = new socketServer();
    require("dotenv").config();
    // var userInViews = require('./lib/middleware/userInViews');
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
        
        

    var yargs = require('yargs').options({
        'port': {
            'default': 5000,
            'description': 'Port to listen on.'
        },
        'public': {
            'type': 'boolean',
            'description': 'Run a public server that listens on all interfaces.'
        },
        'upstream-proxy': {
            'description': 'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".'
        },
        'bypass-upstream-proxy-hosts': {
            'description': 'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"'
        },
        'help': {
            'alias': 'h',
            'type': 'boolean',
            'description': 'Show this help.'
        }
    });
    var argv = yargs.argv;

    if (argv.help) {
        return yargs.showHelp();
    }

    var app = express();
    app.use(compression());
    app.use((req, res, next) => {
        res.locals.isAuthenticated = req.isAuthenticated();
        next();
      });
      
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }))
    app.use(flash());

    // Handle auth failure error messages
    app.use(function (req, res, next) {
      if (req && req.query && req.query.error) {
        req.flash('error', req.query.error);
      }
      if (req && req.query && req.query.error_description) {
        req.flash('error_description', req.query.error_description);
      }
      next();
    });
    
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



    var server = app.listen(process.env.PORT || 5000, argv.public ? undefined : 'localhost', function() {
        if (argv.public) {
            console.log('Cesium development server running publicly.  Connect to http://localhost:%d/', server.address().port);
        } else {
            console.log('Cesium development server running locally.  Connect to http://localhost:%d/', server.address().port);
        }
    });

    // var server = app.listen(process.env.PORT || 5000); // for Heroku

    var io = socketIO.listen(server);
    app.set('socketio', io);
    
    io.on('connection', function (socket) {
        socket.on('room', function (room) {
            socket.join(room);
            sendWelcomeMsg(room);
        });
        socket.on('message', function (msg) {
            var room = msg.room;
            var data = msg.data;
            sendStdMsg(room, data);
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
        if (e.code === 'EADDRINUSE') {
            console.log('Error: Port %d is already in use, select a different port.', argv.port);
            console.log('Example: node server.js --port %d', argv.port + 1);
        } else if (e.code === 'EACCES') {
            console.log('Error: This process does not have permission to listen on port %d.', argv.port);
            if (argv.port < 1024) {
                console.log('Try a port number higher than 1024.');
            }
        }
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