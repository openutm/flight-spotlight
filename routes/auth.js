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

const bbox = require("@turf/bbox");
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const jwtAuthz = require('express-jwt-authz');

require("dotenv").config();
var URL = require('url').URL;
const { check, validationResult } = require('express-validator');

const checkJwt = jwt({
  // Dynamically provide a signing key based on the kid in the header and the singing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: 'https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json'
  }),

  // Validate the audience and the issuer.
  audience: process.env.AUTH0_AUDIENCE,
  issuer: 'https://${process.env.AUTH0_DOMAIN}/',
  algorithms: ['RS256']
});

router.get("/", (req, res) => {
  res.render("home", { title: "Home" });
});

router.get("/spotlight", secured(), (req, response, next) => {
 
  const { _raw, _json, ...userProfile } = req.user;
  const bing_key = process.env.BING_KEY || 'get-yours-at-https://www.bingmapsportal.com/';
  const mapbox_key = process.env.MAPBOX_KEY || 'thisIsMyAccessToken';
  response.render('spotlight', {
    title: "Spotlight",
    userProfile: userProfile,
    bing_key: bing_key, 
    mapbox_key:mapbox_key,
    errors: {},
    data: {}
  });

});

router.post("/air_traffic", checkJwt, jwtAuthz(['spotlight.write.air_traffic']), [
  check('lat_dd').isFloat({ min: -180.00, max: 180.00 }),
  check('lon_dd').isFloat({ min: -180.00, max: 180.00 }),
  check('altitude_mm').isFloat({ min: 0 }),
  check('timestamp').isInt({gt: 1, allow_leading_zeroes: false }),
  check('traffic_source').isInt({gt: 1, lt: 10 }),
  check('source_type').isInt({gt: 0, lt: 1 }),
  check('icao_addresss').isAlphanumeric()
  
], (req, response, next) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.status(422).json({ errors: errors.array() });
  }
  else {
    const req_body =req.body;
    const lat_dd = req_body.lat_dd;
    const lon_dd = req_body.lon_dd;
    const altitude_mm = req_body.altitude_mm;
    const timestamp = req_body.timestamp;
    const traffic_source = req_body.traffic_source;
    const source_type = req_body.source_type;
    const icao_addresss = req_body.icao_addresss;
    client.set('fleet', icao_addresss, [lat_dd, lon_dd, altitude_mm], { 'source_type': source_type, 'traffic_source': traffic_source},{expire: 300});
    response.send('OK');
  }
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

    const aoi_bbox = bbox(aoi['features'][0]);
    
    var io = req.app.get('socketio');

    let query = client.intersectsQuery('fleet').bounds(aoi_bbox[0], aoi_bbox[1], aoi_bbox[2], aoi_bbox[3]).detect('inside');
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