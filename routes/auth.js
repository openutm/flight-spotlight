// auth.js

/**
 * Required External Modules
 */

const express = require("express");
var secured = require('../lib/middleware/secured');
const router = express.Router();
const passport = require("passport");
const util = require("util");
const querystring = require("querystring");
var Tile38 = require('tile38');
var client = new Tile38();
var moment = require('moment');
const bbox = require("@turf/bbox");

require("dotenv").config();
var URL = require('url').URL;
const { check, validationResult } = require('express-validator');


router.get("/", (req, res) => {
  res.render("home", { title: "Home" });
});

router.get("/spotlight", secured(), (req, response, next) => {
  const { _raw, _json, ...userProfile } = req.user;

  response.render('spotlight', {
    title: "Spotlight",
    userProfile: userProfile,
    errors: {},
    data: {}
  });

});

router.post("/spotlight", secured(), [
  check('geo_json').isJSON(),
  
], (req, response, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.status(422).json({ errors: errors.array() });
  }
  else {

    const aoi = JSON.parse(req.body.geo_json);
    const email = req.body.email;
    // var start_date_time = moment(req.body.start_date_time).format('x');
    // var end_date_time = moment(req.body.end_date_time).format('x');
    const aoi_bbox = bbox(aoi['features'][0]);
    
    var io = req.app.get('socketio');

    // console.log(typeof(aoi_bbox[0]));
    // console.log(aoi_bbox[0], aoi_bbox[1], aoi_bbox[2], aoi_bbox[3])
    // let query = client.intersectsQuery('fleet').bounds(aoi_bbox[0], aoi_bbox[1], aoi_bbox[2], aoi_bbox[3]).limit(100);
    // query.execute().then(results => {
    //   console.log(results);
    //   response.send('Got a POST request');
    // }).catch(err => {
    //   console.error("something went wrong! " + err);
    //   return response.status(500);
    // });

    let query = client.intersectsQuery('fleet').bounds(aoi_bbox[0], aoi_bbox[1], aoi_bbox[2], aoi_bbox[3]).detect('enter','exit');
    let fence = query.executeFence((err, results) => {
      // this callback will be called multiple times
      
      if (err) {
        console.error("something went wrong! " + err);
      } else {
        
        
        io.sockets.in(email).emit("message",{'type': 'message' , "results":results});
        
      }
    });

    // if you want to be notified when the connection gets closed, register a callback function with onClose()
    fence.onClose(() => {
      console.log("geofence was closed");
    });
    response.send('Successfully subscribed to updates');

  };
});
/* GET user profile. */
router.get('/user', secured(), function (req, res, next) {
  const { _raw, _json, ...userProfile } = req.user;
  res.render('user', {
    userProfile: JSON.stringify(userProfile, null, 2),
    title: 'Profile page'
  });
});

router.get(
  "/login",
  passport.authenticate("auth0", {
    scope: "openid email profile"
  }),
  (req, res) => {
    res.redirect("/");
  }
);


router.get("/callback", (req, res, next) => {
  passport.authenticate("auth0", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || "/spotlight");
    });
  })(req, res, next);
});


router.get("/logout", (req, res) => {
  req.logOut();

  let returnTo = req.protocol + "://" + req.hostname;
  const port = req.connection.localPort;

  if (port !== undefined && port !== 80 && port !== 443) {
    returnTo =
      process.env.NODE_ENV === "production"
        ? `${returnTo}/`
        : `${returnTo}:${port}/`;
  }

  const logoutURL = new URL(
    util.format("https://%s/logout", process.env.AUTH0_DOMAIN)
  );
  const searchString = querystring.stringify({
    client_id: process.env.AUTH0_CLIENT_ID,
    returnTo: returnTo
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL);
});

module.exports = router;