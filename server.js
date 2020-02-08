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
    const Auth0Strategy = require("passport-auth0");
    const validator = require('express-validator')
    require("dotenv").config();

    const authRouter = require("./routes/auth");
    const session = {
        secret: process.env.APP_SECRET,
        cookie: {},
        resave: false,
        saveUninitialized: false
      };
    

    const strategy = new Auth0Strategy(
    {
        domain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        callbackURL:
        process.env.AUTH0_CALLBACK_URL || "http://local.test:5000/callback"
    },
    function(accessToken, refreshToken, extraParams, profile, done) {
        /**
         * Access tokens are used to authorize users to an API
         * (resource server)
         * accessToken is the token to call the Auth0 API
         * or a secured third-party API
         * extraParams.id_token has the JSON Web Token
         * profile has all the information from the user
         */
        return done(null, profile);
    }
    );


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

    if (app.get("env") === "production") {
        // Serve secure cookies, requires HTTPS
        session.cookie.secure = true;
        }

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



    // var server = app.listen(process.env.PORT || 5000, argv.public ? undefined : 'localhost', function() {
    //     if (argv.public) {
    //         console.log('Cesium development server running publicly.  Connect to http://localhost:%d/', server.address().port);
    //     } else {
    //         console.log('Cesium development server running locally.  Connect to http://localhost:%d/', server.address().port);
    //     }
    // });

    var server = app.listen(process.env.PORT || 5000); // for Heroku
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

    server.on('close', function () {
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