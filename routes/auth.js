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
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const jwtAuthz = require('express-jwt-authz');
// const request = require('request');
const bbox = require("@turf/bbox");
const intersect = require("@turf/intersect");
const flip = require('@turf/flip');
require("dotenv").config();
var URL = require('url').URL;
let geojsonhint = require("@mapbox/geojsonhint");
const { check, validationResult } = require('express-validator');
const { get } = require("https");
const { head } = require("request");

const checkJwt = jwt({

  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.PASSPORT_URL + '/.well-known/jwks.json'
  }),

  audience: process.env.PASSPORT_WRITE_AUDIENCE,
  issuer: process.env.PASSPORT_URL + '/',
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
    mapbox_key: mapbox_key,
    errors: {},
    data: {}
  });

});


router.post("/set_air_traffic", checkJwt, jwtAuthz(['spotlight.write.air_traffic']), [
  check('lat_dd').isFloat({ min: -180.00, max: 180.00 }),
  check('lon_dd').isFloat({ min: -180.00, max: 180.00 }),
  check('altitude_mm').isFloat({ min: 0.00 }),
  check('time_stamp').isInt({ gt: 1, allow_leading_zeroes: false }),
  check('traffic_source').isInt({ gt: 1, lt: 10 }),
  check('source_type').isInt({ gt: -1, lt: 10 }),
  check('icao_address').isString()],
  (req, response, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.status(422).json({ errors: errors.array() });
    }
    else {

      const req_body = req.body;
      const lat_dd = req_body.lat_dd;
      const lon_dd = req_body.lon_dd;
      const altitude_mm = req_body.altitude_mm;
      const traffic_source = req_body.traffic_source;
      const source_type = req_body.source_type;
      const icao_address = req_body.icao_address;
      try {
        client.set('observation', icao_address, [lon_dd, lat_dd, altitude_mm], { 'source_type': source_type, 'traffic_source': traffic_source }, { expire: 300 });
      } catch (err) {
        console.log("Error " + err);
      }
      response.send('OK');

    }
  });


// router.post("/set_geo_fence", checkJwt, jwtAuthz(['spotlight.write.geo_fence']), [
//   check('geo_fence').isJSON()
// ], (req, response, next) => {

//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return response.status(422).json({ errors: errors.array() });
//   }
//   else {
//     const req_body = req.body;
//     const lat_dd = req_body.lat_dd;
//     const lon_dd = req_body.lon_dd;
//     const altitude_mm = req_body.altitude_mm;
//     const traffic_source = req_body.traffic_source;
//     const source_type = req_body.source_type;
//     const icao_addresss = req_body.icao_addresss;
//     client.set('observation', icao_addresss, [lat_dd, lon_dd, altitude_mm], { 'source_type': source_type, 'traffic_source': traffic_source }, { expire: 300 });
//     response.send('OK');
//   }
// });


// router.post("/get_registry_data",secured(), [
//   check('operator_id').isAlphanumeric(),
//   check('token').isAlphanumeric()

// ], (req, response, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return response.status(422).json({ errors: errors.array() });
//   }
//   else {

//     const req_body =req.body;
//     request.post( {
//       'headers': {'Content-Type' : 'application/x-www-form-urlencoded' },
//       'url':     'https://aircraftregistry.herokuapp.com/api/v1/operator',
//       'auth': {
//         'bearer': req_body.token
//       },
//       'form': { 'operator_id': req_body.operator_id},
//       method: 'POST'
//     }, function (e, r, body) {
//       console.log(body);
//     });


//   }
// });


router.post("/set_aoi", secured(), check('geo_json').custom(submitted_aoi => {
  let options = {};
  let errors = geojsonhint.hint(submitted_aoi, options);
  if (errors.length > 0) {
    throw new Error('Invalid GeoJSON supplied.');
  } else {
    return true;
  }

}), (req, response, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.status(422).json({ errors: errors.array() });
  }
  else {

    const aoi = JSON.parse(req.body.geo_json);
    const email = req.body.email;
    const aoi_bbox = bbox(aoi['features'][0]);
    var io = req.app.get('socketio');

    // const geo_fence_fc = { "type": "FeatureCollection", "features": [{ "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [[[30.142621994018555, -1.985209815625593], [30.156269073486328, -1.985209815625593], [30.156269073486328, -1.9534712184928378], [30.142621994018555, -1.9534712184928378], [30.142621994018555, -1.985209815625593]]] } }] };

    // let intersected_geo_fence = intersect(geo_fence_fc.features[0], aoi['features'][0]);

    // console.log(JSON.stringify(intersected_geo_fence));

    // for (let g = 0; g < intersected_geo_fence.features.length; g++) {
    //   const cur_fence = geo_fence_fc.features[g];
    //   let flipped_fence = flip(cur_fence);
    //   console.log(JSON.stringify(flipped_fence));
    //   let geo_fence_query = client.intersectsQuery('observation').object(flipped_fence).detect('inside');
    //   let flight_geo_fence = geo_fence_query.executeFence((errors, gf_results) => {
    //     if (errors) {
    //       console.error("Error encountered " + err);
    //     } else {
    //       console.log(gf_results.id + ": " + gf_results.detect + " Geofenced polygon area");
    //       io.sockets.in(email).emit("message", { 'type': 'message', "alert_type": "geo_fence", "results": results });

    //     }
    //   });
    //   flight_geo_fence.onClose(() => {
    //     console.log("Flight Geofence was closed");
    //   });

    // }

    let aoi_query = client.intersectsQuery('observation').bounds(aoi_bbox[0], aoi_bbox[1], aoi_bbox[2], aoi_bbox[3]).detect('inside');
    let flight_aoi_fence = aoi_query.executeFence((err, results) => {
      if (err) {
        console.error("something went wrong! " + err);
      } else {

        io.sockets.in(email).emit("message", { 'type': 'message', "alert_type": "aoi", "results": results });
      }
    });

    flight_aoi_fence.onClose(() => {
      console.log("AOI geofence was closed");
    });

    response.send({ 'msg': "Scanning flights in AOI and Geofences" });

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

// Perform the login, after login Auth0 will redirect to callback
router.get('/login', passport.authenticate('oauth2', {
  session: true,
  scope: ''
}), function (req, res) {
  res.redirect('/');
});


router.get('/callback', function (req, res, next) {
  passport.authenticate('oauth2', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }
    req.logIn(user, function (err) {
      if (err) { return next(err); }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || '/spotlight');
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