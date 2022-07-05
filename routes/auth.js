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

var tile38_client = new Tile38({ host: tile38_host, port: tile38_port });
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const jwtAuthz = require('express-jwt-authz');
// const request = require('request');
const bbox = require("@turf/bbox");

const axios = require('axios');
require("dotenv").config();
const qs = require('qs');
const asyncMiddleware = require('../util/asyncMiddleware');

let geojsonhint = require("@mapbox/geojsonhint");
const {
  check,
  validationResult
} = require('express-validator');
const redis = require("redis");
const redis_client = redis.createClient(redis_url);

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

function redis_error_handler(err) {
  console.debug(`node-redis version is ${require('redis/package.json').version}`);
  console.debug(err);
}


(async () => {
  redis_client.on('error', (err) => {
    console.debug('Redis Client Error', err);
    process.exit(1);
  });
  redis_client.on('ready', () => console.debug('Redis is ready..'));

  const connect = await redis_client.connect().catch(redis_error_handler);;

  const pong = await redis_client.ping().catch(redis_error_handler);
})();


async function get_passport_token() {
  redis_key = 'blender_passport_token';
  const stored_token = await redis_client.get(redis_key);

  if (stored_token == null) {
    let post_data = {
      "client_id": process.env.PASSPORT_BLENDER_CLIENT_ID,
      "client_secret": process.env.PASSPORT_BLENDER_CLIENT_SECRET,
      "grant_type": "client_credentials",
      "scope": process.env.PASSPORT_BLENDER_SCOPE,
      "audience": process.env.PASSPORT_BLENDER_AUDIENCE
    };
    let passport_response = async () => {

      let res = await axios.request({
        url: process.env.PASSPORT_TOKEN_URL || '/oauth/token/',
        method: "post",
        header: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        baseURL: process.env.PASSPORT_URL,
        data: qs.stringify(post_data)
      });
      if (res.status == 200) {
        let a_token = res.data;
        let access_token = JSON.stringify(a_token);
        await redis_client.set(redis_key, access_token);
        await redis_client.expire(redis_key, 3500);

        return a_token['access_token'];
      } else {

        return {
          "error": "Error in Passport Query, response not 200"
        };
      }

    }
    return passport_response();

  } else {
    let raw_a_token = JSON.parse(stored_token);
    return raw_a_token['access_token'];
  }
}





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

    const passport_token = await get_passport_token();
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
    user: req.user,
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
        tile38_client.set('observation', icao_address, [lon_dd, lat_dd, altitude_mm], {
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

router.get("/get_metadata/:icao_address?", checkJwt, jwtAuthz(['spotlight.write.air_traffic']), (req, response, next) => {

  var icao_address = req.params.icao_address;
  if (!icao_address) {
    next();
    return;
  }
  function get_meta_data(callback) {

    redis_client.hget(icao_address + '-metadata', 'properties', function (err, object) {
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
  const passport_token = await get_passport_token();

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
  const passport_token = await get_passport_token();

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


router.get("/retrieve_flight_declarations", secured(), asyncMiddleware(async (req, res, next) => {
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
  redis_key = 'blender_passport_token';
  let start_date = req.query['start_date'];
  let end_date = req.query['end_date'];
  let page = req.query['page'];

  const passport_token = await get_passport_token();

  let url = base_url + '/flight_declaration_ops/flight_declaration?start_date=' + start_date + '&end_date=' + end_date;
  if (page) {
    url += '&page=' + page;
  }
  axios.get(url, {
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

    const passport_token = await get_passport_token();
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

router.post("/set_streaming_aoi", secured(), check('geo_json').custom(submitted_aoi => {
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
    let geo_fence_query = tile38_client.intersectsQuery('geo_fence').object(aoi['features'][0]);
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
          console.log("AOI geofence was closed");
        });
      }
    }).catch(err => {
      console.error("something went wrong! " + err);
    });

    let aoi_query = tile38_client.intersectsQuery('observation').bounds(aoi_bbox[0], aoi_bbox[1], aoi_bbox[2], aoi_bbox[3]).detect('inside');
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
      console.debug("AOI geofence was closed");
      io.sockets.in(email).emit("message", {
        'type': 'message',
        "alert_type": "aoi_closed",
      });
    });

    response.send({
      'msg': "Scanning flights in AOI and Geofences for 60 seconds"
    });

    setTimeout(() => {
      flight_aoi_fence.close();
    }, 60000);

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

module.exports = router;