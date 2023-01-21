// auth.js

const express = require("express");
var secured = require('../lib/middleware/secured');
const router = express.Router();
const tile38_host = process.env.TILE38_SERVER || '0.0.0.0';
const tile38_port = process.env.TILE38_PORT || 9851;
var Tile38 = require('tile38');
var tile38_client = new Tile38({ host: tile38_host, port: tile38_port });

const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require('jwks-rsa');
const jwtAuthz = require('express-jwt-authz');
// const request = require('request');
const turf = require("@turf/turf");
const h3 = require("h3-js");
require("dotenv").config();
const qs = require('qs');
const asyncMiddleware = require('../util/asyncMiddleware');
const axios = require('axios');
let geojsonhint = require("@mapbox/geojsonhint");
let passport_helper = require('./passport_helper');

const { createNewPollBlenderProcess, createNewADSBFeedProcess, createNewBlenderDSSSubscriptionProcess, createNewGeofenceProcess } = require("../queues/live-blender-queue");


const {
  check,
  validationResult
} = require('express-validator');

const redis_client = require('./redis-client');

const { v4: uuidv4 } = require('uuid');

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
  res.render("home", {
    title: "Home"
  });
});

router.get("/noticeboard/map", secured(), asyncMiddleware(async (req, response, next) => {
  const {
    _raw,
    _json,
    ...userProfile
  } = req.user;
  let req_query = req.query;
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
  const bing_key = process.env.BING_KEY || 'get-yours-at-https://www.bingmapsportal.com/';
  const mapbox_key = process.env.MAPBOX_KEY || 'thisIsMyAccessToken';
  const mapbox_id = process.env.MAPBOX_ID || 'this_is_my_mapbox_map_id';
  let s_date = req_query.start_date;
  let page = 0;
  function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
  }
  try {
    page = req_query.page;
  } catch (err) {

  }
  let e_date = req_query.end_date;
  try {
    s_dt = s_date.split('-');
    start_date = new Date(s_dt[0], s_dt[1], s_dt[2]);
  } catch (error) {
    start_date = 0;
  }
  try {
    e_dt = e_date.split('-');
    end_date = new Date(e_dt[0], e_dt[1], e_dt[2]);
  } catch (error) {
    end_date = 0;
  }

  if (isValidDate(start_date)) { } else { start_date = 0 };
  if (isValidDate(end_date)) { } else { end_date = 0 };

  if ((start_date == 0 || end_date == 0)) {

    response.render('noticeboard-map', {
      title: "Noticeboard",
      userProfile: userProfile,
      bing_key: bing_key,
      mapbox_key: mapbox_key,
      mapbox_id: mapbox_id,
      user: req.user,
      errors: {},
      data: {
        'results': [],
        'successful': 'NA'
      }
    }, function (ren_err, html) {
      response.send(html);
    });

  } else {

    const passport_token = await passport_helper.getPassportToken();
    let cred = "Bearer " + passport_token;
    let declaration_url = base_url + '/flight_declaration_ops/flight_declaration?start_date=' + s_date + '&end_date=' + e_date;
    if (page) {
      declaration_url += '&page=' + page;
    }

    axios.get(declaration_url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cred
      }
    })
      .then(function (blender_response) {

        if (blender_response.status == 200) {

          response.render('noticeboard-map', {
            title: "Noticeboard",
            userProfile: userProfile,
            bing_key: bing_key,
            mapbox_key: mapbox_key,
            mapbox_id: mapbox_id,
            user: req.user,
            successful: 1,
            errors: {},
            data: blender_response.data
          }, function (ren_err, html) {
            response.send(html);
          });

        } else {
          // console.log(blender_response);
          if (err) return response.sendStatus(500);
        }
      }).catch(function (error) {

        // console.log(error.data);
        return response.sendStatus(500);
      });

  }
}));


router.get("/noticeboard/globe", secured(), asyncMiddleware(async (req, response, next) => {
  const {
    _raw,
    _json,
    ...userProfile
  } = req.user;
  let req_query = req.query;
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';

  const bing_key = process.env.BING_KEY || 'get-yours-at-https://www.bingmapsportal.com/';
  const mapbox_key = process.env.MAPBOX_KEY || 'thisIsMyAccessToken';
  const mapbox_id = process.env.MAPBOX_ID || 'this_is_my_mapbox_map_id';
  let s_date = req_query.start_date;
  let page = 0;
  function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
  }
  try {
    page = req_query.page;
  } catch (err) {

  }
  let e_date = req_query.end_date;
  try {
    s_dt = s_date.split('-');
    start_date = new Date(s_dt[0], s_dt[1], s_dt[2]);
  } catch (error) {
    start_date = 0;
  }
  try {
    e_dt = e_date.split('-');
    end_date = new Date(e_dt[0], e_dt[1], e_dt[2]);
  } catch (error) {
    end_date = 0;
  }

  if (isValidDate(start_date)) { } else { start_date = 0 };
  if (isValidDate(end_date)) { } else { end_date = 0 };

  if ((start_date == 0 || end_date == 0)) {

    response.render('noticeboard-globe', {
      title: "Noticeboard",
      userProfile: userProfile,
      bing_key: bing_key,
      mapbox_key: mapbox_key,
      mapbox_id: mapbox_id,
      user: req.user,
      errors: {},
      data: {
        'results': [],
        'successful': 'NA'
      }
    }, function (ren_err, html) {
      response.send(html);
    });

  } else {

    const passport_token = await passport_helper.getPassportToken();
    let cred = "Bearer " + passport_token;
    let declaration_url = base_url + '/flight_declaration_ops/flight_declaration?start_date=' + s_date + '&end_date=' + e_date;
    if (page) {
      declaration_url += '&page=' + page;
    }

    axios.get(declaration_url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cred
      }
    })
      .then(function (blender_response) {

        if (blender_response.status == 200) {

          response.render('noticeboard-globe', {
            title: "Noticeboard",
            userProfile: userProfile,
            bing_key: bing_key,
            mapbox_key: mapbox_key,
            mapbox_id: mapbox_id,
            user: req.user,
            successful: 1,
            errors: {},
            data: blender_response.data
          }, function (ren_err, html) {
            response.send(html);
          });

        } else {
          // console.log(blender_response);
          if (err) return response.sendStatus(500);
        }
      }).catch(function (error) {

        // console.log(error.data);
        return response.sendStatus(500);
      });

  }
}));


router.get("/spotlight", secured(), asyncMiddleware(async (req, response, next) => {
  const {
    _raw,
    _json,
    ...userProfile
  } = req.user;
  const bing_key = process.env.BING_KEY || 'get-yours-at-https://www.bingmapsportal.com/';
  const mapbox_key = process.env.MAPBOX_KEY || 'thisIsMyAccessToken';
  const mapbox_id = process.env.MAPBOX_ID || 'this_is_my_mapbox_map_id';
  let req_query = req.query;
  let lat = req_query.lat;
  let lng = req_query.lng;
  function checkIfValidlatitudeAndlongitude(str) {
    // Regular expression to check if string is a latitude and longitude
    const regexExp = /^((\-?|\+?)?\d+(\.\d+)?),\s*((\-?|\+?)?\d+(\.\d+)?)$/gi;

    return regexExp.test(str);
  }
  let lat_lng_str = lat + ',' + lng;

  if (checkIfValidlatitudeAndlongitude(lat_lng_str)) { } else {
    lat = 'x';
    lng = 'x';
  }

  if ((lat == 'x' && lng == 'x')) {
    response.render('spotlight', {

      title: "Spotlight",
      userProfile: userProfile,
      bing_key: bing_key,
      mapbox_key: mapbox_key,
      mapbox_id: mapbox_id,
      user: req.user,
      errors: {},
      data: {
        'successful': 'NA'
      }
    });

  } else {

    const io = req.app.get('socketio');
    const res = 7;
    const h = h3.geoToH3(lat, lng, res);
    const geo_boundary = h3.h3ToGeoBoundary(h, true);
    const aoi_hexagon = turf.polygon([geo_boundary]);
    const email = userProfile.email;
    const aoi_bbox = turf.bbox(aoi_hexagon);

    const aoi_hex_bounds = turf.bbox(aoi_hexagon);
    // TODO: Get geofences that intersect this BBOX
    // TODO: Start a job for 30 seconds to poll data from Blender    
    createNewPollBlenderProcess({
      "viewport": aoi_bbox,
      "job_id": uuidv4(),
      "job_type": 'poll_blender'
    });
    createNewADSBFeedProcess({
      "viewport": aoi_bbox,
      "job_id": uuidv4(),
      "job_type": 'start_opensky_feed'
    });
    createNewBlenderDSSSubscriptionProcess({
      "viewport": aoi_bbox,
      "job_id": uuidv4(),
      "job_type": 'create_dss_subscription'
    });
    
    createNewGeofenceProcess({
      "viewport": aoi_bbox,
      "job_id": uuidv4(),
      "job_type": 'get_geo_fence'
    });
    
    // const area = turf.area(aoi_hexagon);
    // Query the Geozone database and see if the flight intersects the geozone
    let geo_fence_query = tile38_client.intersectsQuery('geo_fence').bounds(aoi_hex_bounds[0],aoi_hex_bounds[1],aoi_hex_bounds[2],aoi_hex_bounds[3]);
    geo_fence_query.execute().then(results => {
      // Send Geozones to UI
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
        let geo_fence_bbox = turf.bbox(geo_fence_element);
        let geo_live_fence_query = tile38_client.intersectsQuery('observation').detect('enter', 'exit').bounds(geo_fence_bbox[0], geo_fence_bbox[1], geo_fence_bbox[2], geo_fence_bbox[3]);
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
          console.log("Close Geozone geofence with id:" + geo_fence_element['id']);
        });
            
        setTimeout(() => {
          geo_fence_stream.close();
        }, 30000);

    
      }
    }).catch(err => {
      console.log("something went wrong! " + err);
    });
    let aoi_query = tile38_client.intersectsQuery('observation').bounds(aoi_hex_bounds[0],aoi_hex_bounds[1],aoi_hex_bounds[2],aoi_hex_bounds[3]).detect('inside');
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
      console.debug("AOI streaming closed");
      io.sockets.in(email).emit("message", {
        'type': 'message',
        "alert_type": "aoi_closed",
      });
    });

    setTimeout(() => {
      flight_aoi_fence.close();
    }, 60000);

    response.render('spotlight', {
      title: "Spotlight",
      userProfile: userProfile,
      bing_key: bing_key,
      mapbox_key: mapbox_key,
      mapbox_id: mapbox_id,
      user: req.user,
      errors: {},
      data: {
        'successful': 1, 'aoi_hexagon': aoi_hexagon, "msg": "Scanning flights in AOI and Geofences for 60 seconds", "geo_fences": [], "flight_declarations": []
      }
    });



  }

}));


router.post("/set_air_traffic", checkJwt, jwtAuthz(['spotlight.write']), [
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
    lt: 12
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
        tile38_client.set('observation', icao_address, [lon_dd, lat_dd, altitude_mm], {
          'source_type': source_type,
          'traffic_source': traffic_source,
          'metadata': JSON.stringify(obs_metadata)
        }, {
          expire: 300
        });

      } catch (err) {
        console.log("Error " + err);
      }
      let metadata_key = icao_address + '-metadata';
      // TODO: Set metatadata
      async function set_metadata(obs_metadata) {
        await redis_client.set(metadata_key, JSON.stringify(obs_metadata));
        await redis_client.expire(metadata_key, 300);
      }
      set_metadata(obs_metadata);

      response.send('OK');

    }
  });

router.get('/blender_status', secured(), function (req, response, next) {

  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
  let ping_url = base_url + '/ping';
  axios.get(ping_url, {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function (blender_response) {
    // response.send(blender_response.data);

    response.send({
      'message': "OK"
    });
  }).catch(function (blender_error) {
    response.send({
      'message': "error"
    });
  });
});

router.get("/get_metadata/:icao_address?", checkJwt, jwtAuthz(['spotlight.read']), (req, response, next) => {

  var icao_address = req.params.icao_address;
  if (!icao_address) {
    next();
    return;
  }

  async function get_meta_data(callback) {
    const all_metadata = await redis_client.get(metadata_key);
    return all_metadata
  };
  get_meta_data(function (metadata) {
    response.send({
      'metadata': JSON.parse(all_metadata)
    });
  });

});

router.post("/set_geo_fence", checkJwt, jwtAuthz(['spotlight.write']), check('geo_fence').custom(submitted_geo_fence => {
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
    // Create a new geo fence
    tile38_client.set('geo_fence', uuidv4(), JSON.parse(geo_fence), {
      'upper_limit': upper_limit,
      'lower_limit': lower_limit
    });
    response.send({
      "message": "OK"
    });
  }
});

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

  redis_key = 'blender_passport_token';
  let approve_reject = req.body['approve_reject'];
  let approved_by = req.body['approved_by'];
  const passport_token = await passport_helper.getPassportToken();

  let a_r = {
    'is_approved': approve_reject,
    'approved_by': approved_by
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
        res.send(blender_response.data);
      } else {
        // console.log(error);
        res.send(blender_response.data);
      }
    }).catch(function (error) {
      console.log(error.data);
    });

}));

router.post("/update_flight_state/:uuid", secured(), asyncMiddleware(async (req, res, next) => {

  let flight_declaration_uuid = req.params.uuid;
  const is_uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(flight_declaration_uuid);

  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';

  redis_key = 'blender_passport_token';
  let new_state = req.body['state'];
  let submitted_by = req.body['submitted_by'];
  const passport_token = await passport_helper.getPassportToken();

  let a_r = {
    'state': new_state,
    'submitted_by': submitted_by
  };

  let url = base_url + '/flight_declaration_ops/flight_declaration_state/' + flight_declaration_uuid;
  axios.put(url, JSON.stringify(a_r), {

    headers: {
      'Content-Type': 'application/json',
      'Authorization': "Bearer " + passport_token
    }
  })
    .then(function (blender_response) {
      if (blender_response.status == 200) {
        res.send(blender_response.data);
      } else {
        // console.log(error);
        res.send(blender_response.data);
      }
    }).catch(function (error) {
      console.log(error.data);
    });

}));



router.get("/noticeboard", secured(), asyncMiddleware(async (req, response, next) => {

  const {
    _raw,
    _json,
    ...userProfile
  } = req.user;
  let req_query = req.query;
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';

  let s_date = req_query.start_date;
  let page = 0;
  function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
  }
  try {
    page = req_query.page;
  } catch (err) {

  }
  let e_date = req_query.end_date;

  try {
    s_dt = s_date.split('-');
    start_date = new Date(s_dt[0], s_dt[1], s_dt[2]);
  } catch (error) {
    start_date = 0;
  }
  try {
    e_dt = e_date.split('-');
    end_date = new Date(e_dt[0], e_dt[1], e_dt[2]);
  } catch (error) {
    end_date = 0;
  }

  if (isValidDate(start_date)) { } else { start_date = 0 };
  if (isValidDate(end_date)) { } else { end_date = 0 };

  if ((start_date == 0 || end_date == 0)) {

    response.render('noticeboard-text', {
      title: "Noticeboard",
      userProfile: userProfile,
      user: req.user,
      errors: {},
      data: {
        'results': [],
        'successful': 'NA'
      }
    }, function (ren_err, html) {
      response.send(html);
    });

  } else {

    const passport_token = await passport_helper.getPassportToken();
    let cred = "Bearer " + passport_token;
    let declaration_url = base_url + '/flight_declaration_ops/flight_declaration?start_date=' + s_date + '&end_date=' + e_date;
    if (page) {
      declaration_url += '&page=' + page;
    }

    axios.get(declaration_url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cred
      }
    })
      .then(function (blender_response) {

        if (blender_response.status == 200) {

          response.render('noticeboard-text', {
            title: "Noticeboard",
            userProfile: userProfile,
            user: req.user,
            successful: 1,
            errors: {},
            data: blender_response.data
          }, function (ren_err, html) {
            response.send(html);
          });

        } else {
          // console.log(blender_response);
          if (err) return response.sendStatus(500);
        }
      }).catch(function (error) {

        // console.log(error.data);
        return response.sendStatus(500);
      });

  }
}));


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

module.exports = router;