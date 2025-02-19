(async function () {
    'use strict';
    /*jshint node:true*/

    const express = require('express');
    

    const socket = require("socket.io");
    require("dotenv").config();
    
    const spotlightNoticeboardRouter = require("./routes/spotlight_noticeboard");
    const launchpadRouter = require('./routes/launchpad');
    const auth_strategy = process.env.AUTH_STRATEGY || 'flightpassport';
    const authHandlers = {
        'flightpassport': './auth_mechanisms/flight_passport/auth_handler',
        
    };

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

    const authHandlerPath = authHandlers[auth_strategy];
    if (authHandlerPath) {
        const authHandler = require(authHandlerPath);
        app.use(auth(authHandler()));
        
    } else {
        console.error(`Unknown authentication strategy: ${auth_strategy}`);
    }

    app.use("/", spotlightNoticeboardRouter);
    app.use('/', launchpadRouter);

    
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