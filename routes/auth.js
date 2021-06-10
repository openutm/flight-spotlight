// auth.js

const express = require("express");
var secured = require('../lib/middleware/secured');
const router = express.Router();
const passport = require("passport");
const util = require("util");

const tile38_host = process.env.TILE38_SERVER || '0.0.0.0';
const tile38_port = process.env.TILE38_PORT || 9851;
const redis_url = process.env.REDIS_URL || 'redis://local.test:6379';


const querystring = require("querystring");
var Tile38 = require('tile38');

var client = new Tile38({host: tile38_host, port: tile38_port});
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const jwtAuthz = require('express-jwt-authz');
// const request = require('request');
const bbox = require("@turf/bbox");
const intersect = require("@turf/intersect");
const flip = require('@turf/flip');
const axios = require('axios');
require("dotenv").config();
const qs = require('qs');
const asyncMiddleware = require('../util/asyncMiddleware');
var URL = require('url').URL;
let geojsonhint = require("@mapbox/geojsonhint");
const {
  check,
  validationResult
} = require('express-validator');
const {
  get
} = require("https");
const {
  head
} = require("request");
const redis = require("redis");
const redis_client = redis.createClient(redis_url);
const async = require("async");


redis_client.on("error", function (error) {
  console.error(error);
});

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



async function get_passport_token() {
  return new Promise(function (resolve, reject) {

    redis_key = 'blender_passport_token';

    async.map([redis_key], function (r_key, done) {

      redis_client.get(r_key, function (err, results) {
        if (err || results == null) {
          let post_data = {
            "client_id": process.env.PASSPORT_CLIENT_ID,
            "client_secret": process.env.PASSPORT_CLIENT_SECRET,
            "grant_type": "client_credentials",
            "scope": process.env.PASSPORT_BLENDER_SCOPE,
            "audience": process.env.PASSPORT_BLENDER_AUDIENCE
          };
          axios.request({
            url: "/oauth/token/",
            method: "post",
            header: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            baseURL: process.env.PASSPORT_URL,
            data: qs.stringify(post_data)
          }).then(passport_response => {

            if (passport_response.status == 200) {
              let a_token = passport_response.data;
              let access_token = JSON.stringify(a_token);
              redis_client.set(r_key, access_token);
              redis_client.expire(r_key, 3500);

              return done(null, a_token);
            } else {

              return done(null, {
                "error": "Error in Passport Query, response not 200"
              });
            }
          }).catch(axios_err => {

            return done(null, {
              "error": "Error in Passport Query, error in paramters supplied, check Client ID and / or secret"
            });
          });

        } else {
          let a_token = JSON.parse(results);
          return done(null, a_token);
        }

      });
    }, function (error, redis_output) {
      try {
        var passport_token = redis_output[0]['access_token'];
      } catch {
        var passport_token = {
          "error": "Error in parsing token, check redis client call"
        }
      }
      /// code is here 

      resolve(passport_token); // successfully fill promise
    });
    // may be a heavy db call or http request?
  });
}



router.get("/", (req, res) => {
  res.render("home", {
    title: "Home"
  });
});

router.get("/noticeboard", secured(), (req, response, next) => {
  const {
    _raw,
    _json,
    ...userProfile
  } = req.user;
  const bing_key = process.env.BING_KEY || 'get-yours-at-https://www.bingmapsportal.com/';
  const mapbox_key = process.env.MAPBOX_KEY || 'thisIsMyAccessToken';
  const mapbox_id = process.env.MAPBOX_ID || 'this_is_my_mapbox_map_id';
  response.render('noticeboard', {
    title: "Noticeboard",
    userProfile: userProfile,
    bing_key: bing_key,
    mapbox_key: mapbox_key,
    mapbox_id: mapbox_id,
    errors: {},
    data: {}
  });

});

router.get("/spotlight", secured(), (req, response, next) => {
  const {
    _raw,
    _json,
    ...userProfile
  } = req.user;
  const bing_key = process.env.BING_KEY || 'get-yours-at-https://www.bingmapsportal.com/';
  const mapbox_key = process.env.MAPBOX_KEY || 'thisIsMyAccessToken';
  const mapbox_id = process.env.MAPBOX_ID || 'this_is_my_mapbox_map_id';
  response.render('spotlight', {
    title: "Spotlight",
    userProfile: userProfile,
    bing_key: bing_key,
    mapbox_key: mapbox_key,
    mapbox_id: mapbox_id,
    errors: {},
    data: {}
  });

});


router.post("/set_air_traffic", checkJwt, jwtAuthz(['spotlight.write.air_traffic']), [
  check('lat_dd').isFloat({
    min: -180.00,
    max: 180.00
  }),
  check('lon_dd').isFloat({
    min: -180.00,
    max: 180.00
  }),
  check('altitude_mm').isFloat({
    min: 0.00
  }),
  check('time_stamp').isFloat({
    gt: 1,
    allow_leading_zeroes: false
  }),
  check('traffic_source').isInt({
    gt: -1,
    lt: 10
  }),
  check('source_type').isInt({
    gt: -1,
    lt: 10
  }),
  check('icao_address').isString()
],
  (req, response, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.status(422).json({
        errors: errors.array()
      });
    } else {


      const req_body = req.body;
      const lat_dd = req_body.lat_dd;
      const lon_dd = req_body.lon_dd;
      const altitude_mm = req_body.altitude_mm;
      const traffic_source = req_body.traffic_source;
      const source_type = req_body.source_type;
      const icao_address = req_body.icao_address;
      const obs_metadata = req_body.metadata;

      
      
      try {
        client.set('observation', icao_address, [lon_dd, lat_dd, altitude_mm], {
          'source_type': source_type,
          'traffic_source': traffic_source
        }, {
          expire: 300
        });

      } catch (err) {
        console.log("Error " + err);
      }
      let metadata_key = icao_address + '-metadata';
      redis_client.hmset(metadata_key, 'properties', JSON.stringify(obs_metadata));
      redis_client.expire(metadata_key, 300);

      response.send('OK');

    }
  });

router.get("/get_metadata/:icao_address?",  checkJwt, jwtAuthz(['spotlight.write.air_traffic']),(req, response, next) => {

  var icao_address = req.params.icao_address;
  if (!icao_address) {
    next();
    return;
  }
  function get_meta_data(callback) {
    
    redis_client.hget(icao_address + '-metadata', 'properties',function (err, object) {
      if (err) {
        callback({});
      } else {
        
        callback(object);
      }
    });
  };
  get_meta_data(function (metadata) {
    response.send({
      'metadata': JSON.parse(metadata)
    });
  });

});

router.post("/set_geo_fence", checkJwt, jwtAuthz(['spotlight.write.geo_fence']), check('geo_fence').custom(submitted_geo_fence => {
  let options = {};
  let errors = geojsonhint.hint(submitted_geo_fence, options);

  if (errors.length > 0) {
    throw new Error('Invalid GeoJSON supplied.');
  } else {
    return true;
  }

}), (req, response, next) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.status(422).json({
      errors: errors.array()
    });
  } else {
    const req_body = req.body;
    const geo_fence = req_body.geo_fence;
    const geo_fence_properties = JSON.parse(req_body.properties);
    // console.log(geo_fence_properties, typeof(geo_fence_properties));

    let upper_limit = geo_fence_properties['upper_limit'];
    let lower_limit = geo_fence_properties['lower_limit'];

    client.set('geo_fence', 'geo_fence', JSON.parse(geo_fence), {
      'upper_limit': upper_limit,
      'lower_limit': lower_limit
    });

    response.send({
      "message": "OK"
    });
  }
});

// router.post("/set_flight_declaration", checkJwt, jwtAuthz(['spotlight.write.flight_declaration']), check('flight_declaration').custom(submitted_flight_declaration => {
//   let options = {};
//   submitted_flight_declaration = JSON.parse(submitted_flight_declaration);

//   let errors = geojsonhint.hint(submitted_flight_declaration['flight_declaration']['parts'], options);
//   if (errors.length > 0) {
//     throw new Error('Invalid Flight Declaration supplied.');
//   } else {
//     return true;
//   }
// }), (req, response, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return response.status(422).json({ errors: errors.array() });
//   }
//   else {
//     const req_body = req.body;
//     const f_d = JSON.parse(req_body.flight_declaration);
//     const flight_id = f_d.flight_id;
//     redis_client.hset('fd', flight_id, JSON.stringify(f_d));
//     redis_client.expire(flight_id, 3600);
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

router.get("/get_flight_declarations", secured(), (req, response, next) => {
  function get_f_d(callback) {
    redis_client.hgetall('fd', function (err, object) {
      callback(object);
    });
  };
  get_f_d(function (declarations) {
    response.send({
      'all_declarations': declarations
    });
  });

});

router.post("/set_flight_approval/:uuid", secured(), asyncMiddleware(async (req, res, next) => {

  let flight_declaration_uuid = req.params.uuid;
  const is_uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(flight_declaration_uuid);

  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';


  redis_key = 'passport_token';
  let approve_reject = req.body['approve_reject'];
  const passport_token = await get_passport_token();


  let a_r = {
    'is_approved': approve_reject
  };
  let url = base_url + '/flight_declaration_ops/flight_declaration_review/' + flight_declaration_uuid;
  axios.put(url, JSON.stringify(a_r), {

    headers: {
      'Content-Type': 'application/json',
      'Authorization': "Bearer " + passport_token
    }
  })
    .then(function (blender_response) {
      if (blender_response.status == 200) {
        response.send(blender_response.data);
      } else {
        // console.log(error);
        response.send(blender_response.data);
      }
    }).catch(function (error) {
      console.log(error.data);
    });

}));



router.get("/retrieve_flight_declarations", secured(), asyncMiddleware(async (req, res, next) => {
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';

  redis_key = 'passport_token';
  let start_date = req.query['start_date'];
  let end_date = req.query['end_date'];

  const passport_token = await get_passport_token();


  let url = base_url + '/flight_declaration_ops/flight_declaration?start_date=' + start_date + '&end_date=' + end_date;
  axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': "Bearer " + passport_token
    }
  })
    .then(function (blender_response) {

      if (blender_response.status == 200) {

        response.send(blender_response.data);
      } else {

        // console.log(error);
        response.send(blender_response.data);
      }
    });

}));

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
    return response.status(422).json({
      errors: errors.array()
    });
  } else {
    const aoi = JSON.parse(req.body.geo_json);
    const email = req.body.email;
    const aoi_bbox = bbox(aoi['features'][0]);
    var io = req.app.get('socketio');
    let geo_fence_query = client.intersectsQuery('geo_fence').object(aoi['features'][0]);
    geo_fence_query.execute().then(results => {

      io.sockets.in(email).emit("message", {
        'type': 'message',
        "alert_type": "aoi_geo_fence",
        "results": results
      });
      return results;
    }).then(geo_fence => {
      // Setup a Geofence for the results 

      for (let index = 0; index < geo_fence.objects.length; index++) {
        const geo_fence_element = geo_fence.objects[index].object;
        let geo_fence_bbox = bbox(geo_fence_element);

        let geo_live_fence_query = client.intersectsQuery('observation').detect('enter', 'exit').bounds(geo_fence_bbox[0], geo_fence_bbox[1], geo_fence_bbox[2], geo_fence_bbox[3]);
        let geo_fence_stream = geo_live_fence_query.executeFence((err, geo_fence_results) => {
          if (err) {
            console.error("something went wrong! " + err);
          } else {
            let status = geo_fence_results.id + ": " + geo_fence_results.detect + " geo fence area";
            io.sockets.in(email).emit("message", {
              'type': 'message',
              "alert_type": "geo_fence_crossed",
              "results": status
            });
          }
        });
        geo_fence_stream.onClose(() => {
          console.log("AOI geofence was closed");
        });
      }
    }).catch(err => {
      console.error("something went wrong! " + err);
    });


    let aoi_query = client.intersectsQuery('observation').bounds(aoi_bbox[0], aoi_bbox[1], aoi_bbox[2], aoi_bbox[3]).detect('inside');
    let flight_aoi_fence = aoi_query.executeFence((err, results) => {
      if (err) {
        console.error("something went wrong! " + err);
      } else {
        io.sockets.in(email).emit("message", {
          'type': 'message',
          "alert_type": "aoi",
          "results": results
        });
      }
    });

    flight_aoi_fence.onClose(() => {
      console.log("AOI geofence was closed");
    });

    response.send({
      'msg': "Scanning flights in AOI and Geofences"
    });

  };
});


/* GET user profile. */
router.get('/user', secured(), function (req, res, next) {
  const {
    _raw,
    _json,
    ...userProfile
  } = req.user;
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
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }
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
      process.env.NODE_ENV === "production" ?
        `${returnTo}/` :
        `${returnTo}:${port}/`;
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