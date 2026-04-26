// auth.js

const express = require("express");

const router = express.Router();
const tile38_host = process.env.TILE38_SERVER || '0.0.0.0';
const tile38_port = process.env.TILE38_PORT || 9851;
var Tile38 = require('tile38');
var tile38_client = new Tile38({ host: tile38_host, port: tile38_port });
const ejsUtilities = require("../util/ejsUtilities");
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require('jwks-rsa');
const jwtAuthz = require('express-jwt-authz');
// const request = require('request');
const turf = require("@turf/turf");

require("dotenv").config();

const asyncMiddleware = require('../util/asyncMiddleware');
const axios = require('axios');
let geojsonhint = require("@mapbox/geojsonhint");
let passport_helper = require('./passport_helper');


const { sendStdMsg } = require('../util/io');

const { requiresAuth } = require('express-openid-connect');
const { createNewPollBlenderProcess, createNewADSBFeedProcess, createNewBlenderDSSSubscriptionProcess, createNewGeofenceProcess,getNewNearbyOperationalIntentsProcess } = require("../queues/live-blender-queue");


const {
  check,
  validationResult
} = require('express-validator');

const redis_client = require('./redis-client');

const { randomUUID: uuidv4 } = require('crypto');

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

router.get("/noticeboard/map", requiresAuth(), asyncMiddleware(async (req, response, next) => {

  let userProfile;
  try {
    userProfile = await req.oidc.fetchUserInfo();
  } catch (error) {
    return response.redirect('/');
  }

  const { start_date: s_date, end_date: e_date, page = 1 } = req.query;
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
  const mapbox_key = process.env.MAPBOX_KEY || 'thisIsMyAccessToken';

  const parseDate = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return new Date(year, month, day);
    } catch {
      return 0;
    }
  };

  const start_date = parseDate(s_date);
  const end_date = parseDate(e_date);

  const isValidDate = (d) => d instanceof Date && !isNaN(d);

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return response.render('noticeboard-map', {
      title: "Noticeboard",
      userProfile,
      mapbox_key,
      errors: {},
      data: { 'results': [], 'successful': 'NA' }
    }, (ren_err, html) => response.send(html));
  }

  try {
    const passport_token = await passport_helper.getPassportToken();
    const cred = `Bearer ${passport_token}`;
    const declaration_url = `${base_url}/flight_declaration_ops/flight_declaration?start_date=${s_date}&end_date=${e_date}&page=${page}`;

    const blender_response = await axios.get(declaration_url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cred
      }
    });

    if (blender_response.status === 200) {
      response.render('noticeboard-map', {
        title: "Noticeboard",
        userProfile,
        mapbox_key,
        successful: 1,
        errors: {},
        data: blender_response.data
      }, (ren_err, html) => response.send(html));
    } else {
      response.status(error.status || 500);
      response.render('error', {
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  } catch (error) {
    console.error(error);
    response.status(error.status || 500);
    response.render('error', {
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));


router.get("/noticeboard/globe", requiresAuth(), asyncMiddleware(async (req, response, next) => {

  let userProfile;
  try {
    userProfile = await req.oidc.fetchUserInfo();
  } catch (error) {
    return response.redirect('/');
  }

  let req_query = req.query;
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';

  const mapbox_key = process.env.MAPBOX_KEY || 'thisIsMyAccessToken';
  let s_date = req_query.start_date;
  let page = req_query.page || 1;
  let e_date = req_query.end_date;

  function parseDate(dateStr) {
    try {
      const [year, month, day] = dateStr.split('-');
      return new Date(year, month, day);
    } catch (error) {
      return 0;
    }
  }

  const start_date = parseDate(s_date);
  const end_date = parseDate(e_date);

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return response.render('noticeboard-globe', {
      title: "Noticeboard",
      userProfile,
      mapbox_key,
      errors: {},
      data: {
        'results': [],
        'successful': 'NA'
      }
    }, (ren_err, html) => response.send(html));
  }

  const passport_token = await passport_helper.getPassportToken();
  const cred = "Bearer " + passport_token;
  let declaration_url = `${base_url}/flight_declaration_ops/flight_declaration?start_date=${s_date}&end_date=${e_date}`;
  if (page) declaration_url += `&page=${page}`;

  axios.get(declaration_url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': cred
    }
  })
    .then(blender_response => {
      if (blender_response.status === 200) {
        response.render('noticeboard-globe', {
          title: "Noticeboard",
          userProfile,
          mapbox_key,
          successful: 1,
          errors: {},
          data: blender_response.data
        }, (ren_err, html) => response.send(html));
      } else {
        response.status(error.status || 500);
        response.render('error', {
          message: error.message,
          error: process.env.NODE_ENV === 'development' ? error : {}
        });
      }
    })
    .catch(error => {
      console.error(error);
      response.status(error.status || 500);
      response.render('error', {
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    });

  function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
  }
}));


router.get("/spotlight", requiresAuth(), asyncMiddleware(async (req, response, next) => {

  let userProfile;
  try {
    userProfile = await req.oidc.fetchUserInfo();
  } catch (error) {
    return response.redirect('/');
  }


  const mapbox_key = process.env.MAPBOX_KEY || 'thisIsMyAccessToken';
  let { lat, lng } = req.query;

  function isValidLatLng(str) {
    const regexExp = /^((\-?|\+?)?\d+(\.\d+)?),\s*((\-?|\+?)?\d+(\.\d+)?)$/gi;
    return regexExp.test(str);
  }

  if (!isValidLatLng(`${lat},${lng}`)) {
    lat = lng = 'x';
  }

  if (lat === 'x' && lng === 'x') {
    return response.render('spotlight', {
      title: "Spotlight",
      userProfile,
      mapbox_key,
      errors: {},
      data: { 'successful': 'NA' }
    });
  }
  lat = parseFloat(lat);
  lng = parseFloat(lng);

  const aoi_buffer = turf.buffer(turf.point([lng, lat]), 4.5, { units: 'kilometers' });

  const email = userProfile.email;
  const aoi_bbox = turf.bbox(aoi_buffer);
  const lat_lng_formatted_array = [aoi_bbox[1], aoi_bbox[0], aoi_bbox[3], aoi_bbox[2]];

  createNewPollBlenderProcess({
    "viewport": lat_lng_formatted_array,
    "room": email,
    "job_id": uuidv4(),
    "job_type": 'poll_blender'
  });
  createNewADSBFeedProcess({
    "viewport": lat_lng_formatted_array,
    "job_id": uuidv4(),
    "job_type": 'start_opensky_feed'
  });
  createNewBlenderDSSSubscriptionProcess({
    "viewport": lat_lng_formatted_array,
    "job_id": uuidv4(),
    "job_type": 'create_dss_subscription'
  });
  createNewGeofenceProcess({
    "viewport": lat_lng_formatted_array,
    "userEmail": email,
    "job_id": uuidv4(),
    "job_type": 'get_geo_fence'
  });
  getNewNearbyOperationalIntentsProcess({
    "viewport": lat_lng_formatted_array,
    "userEmail": email,
    "job_id": uuidv4(),
    "job_type": 'get_nearby_operational_intents'
  });


  response.render('spotlight', {
    title: "Spotlight",
    userProfile,
    mapbox_key,
    errors: {},
    data: {
      'successful': 1,
      'aoi_buffer': aoi_buffer,
      "msg": "Scanning flights in AOI and Geofences for 60 seconds",
      "geo_fences": [],
      "flight_declarations": []
    }
  });

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
    }

    const { lat_dd, lon_dd, altitude_mm, traffic_source, source_type, icao_address, metadata: obs_metadata } = req.body;

    try {
      tile38_client.set('observation', icao_address, [lon_dd, lat_dd, altitude_mm], {
        source_type,
        traffic_source,
        metadata: JSON.stringify(obs_metadata)
      }, { expire: 300 });
    } catch (err) {
      console.error("Error:", err);
    }

    const metadata_key = `${icao_address}-metadata`;

    async function setMetadata(metadata) {
      await redis_client.set(metadata_key, JSON.stringify(metadata));
      await redis_client.expire(metadata_key, 300);
    }

    setMetadata(obs_metadata);

    response.send('OK');
  });

router.get('/blender_status', requiresAuth(), function (req, response, next) {

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
router.get("/get_metadata/:observationKey?", checkJwt, jwtAuthz(['spotlight.read']), async (req, res, next) => {
  const observationKey = req.params.observationKey;
  if (!observationKey) {
    return next();
  }

  const metadata_key = `${observationKey}-metadata`;
  try {
    const metadata = await redis_client.get(metadata_key);
    res.send({
      metadata: metadata ? JSON.parse(metadata) : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
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

router.get("/get_flight_declarations", requiresAuth(), (req, response, next) => {
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

router.post("/set_flight_approval/:uuid", requiresAuth(), asyncMiddleware(async (req, res, next) => {
  const flight_declaration_uuid = req.params.uuid;
  const is_uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(flight_declaration_uuid);

  if (!is_uuid) {
    return res.status(400).send({ error: "Invalid UUID format" });
  }

  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
  const approve_reject = req.body['approve_reject'];
  const approved_by = req.body['approved_by'];
  const passport_token = await passport_helper.getPassportToken();

  const a_r = {
    'is_approved': approve_reject,
    'approved_by': approved_by
  };

  const url = `${base_url}/flight_declaration_ops/flight_declaration_review/${flight_declaration_uuid}`;

  try {
    const blender_response = await axios.put(url, JSON.stringify(a_r), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${passport_token}`
      }
    });

    if (blender_response.status === 200) {
      res.send(blender_response.data);
    } else {
      res.status(blender_response.status).send(blender_response.data);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }

}));

router.post("/update_flight_state/:uuid", requiresAuth(), asyncMiddleware(async (req, res, next) => {
  const flight_declaration_uuid = req.params.uuid;
  const is_uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(flight_declaration_uuid);

  if (!is_uuid) {
    return res.status(400).send({ error: "Invalid UUID format" });
  }

  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
  const new_state = req.body.state;
  const submitted_by = req.body.submitted_by;
  const passport_token = await passport_helper.getPassportToken();

  const payload = {
    state: new_state,
    submitted_by: submitted_by
  };

  const url = `${base_url}/flight_declaration_ops/flight_declaration_state/${flight_declaration_uuid}`;

  try {
    const blender_response = await axios.put(url, JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${passport_token}`
      }
    });

    if (blender_response.status === 200) {
      res.send(blender_response.data);
    } else {
      res.status(blender_response.status).send(blender_response.data);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }

}));



router.get("/noticeboard", requiresAuth(), asyncMiddleware(async (req, response, next) => {

  let userProfile;
  try {
    userProfile = await req.oidc.fetchUserInfo();
  } catch (error) {
    return response.redirect('/');
  }

  const { start_date: s_date, end_date: e_date, page = 1 } = req.query;
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';

  const parseDate = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return new Date(year, month, day);
    } catch {
      return 0;
    }
  };

  const start_date = parseDate(s_date);
  const end_date = parseDate(e_date);

  const isValidDate = (d) => d instanceof Date && !isNaN(d);

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return response.render('noticeboard-text', {
      ...ejsUtilities,
      title: "Noticeboard",
      userProfile,

      errors: {},
      data: { 'results': [], 'successful': 'NA' }
    }, (ren_err, html) => response.send(html));
  }

  try {
    const passport_token = await passport_helper.getPassportToken();

    const cred = `Bearer ${passport_token}`;
    const declaration_url = `${base_url}/flight_declaration_ops/flight_declaration?start_date=${s_date}&end_date=${e_date}&page=${page}`;

    const blender_response = await axios.get(declaration_url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cred
      }
    });

    if (blender_response.status === 200) {
      response.render('noticeboard-text', {
        ...ejsUtilities,
        title: "Noticeboard",
        userProfile,

        successful: 1,
        errors: {},
        data: blender_response.data
      }, (ren_err, html) => response.send(html));
    } else {
      response.status(error.status || 500);
      response.render('error', {
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  } catch (error) {

    response.status(error.status || 500);
    response.render('error', {
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}));


/* GET user profile. */
router.get('/user', requiresAuth(), async function (req, res, next) {

  let userProfile;
  try {
    userProfile = await req.oidc.fetchUserInfo();
  } catch (error) {
    return response.redirect('/');
  }

  res.render('user', {
    userProfile: JSON.stringify(userProfile, null, 2),
    title: 'Profile page'
  });
});

module.exports = router;
