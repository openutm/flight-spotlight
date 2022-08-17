const express = require('express');
const router = express.Router();
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const qs = require('qs');

const asyncMiddleware = require('../util/asyncMiddleware');
const {
  DateTime
} = require("luxon");

const redis_client = require('./redis-client');


let geojsonhint = require("@mapbox/geojsonhint");
const {
  check,
  validationResult
} = require('express-validator');
const axios = require('axios');


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


var flight_operation_validate = [
  check('operator_name').isLength({
    min: 5,
    max: 50
  }).withMessage("Operator name is required and must be more than 5 and less than 50 characters")
    .trim(),
  check('geojson_upload_control').custom(submitted_geo_json => {

    let options = {};
    let errors = geojsonhint.hint(submitted_geo_json, options);

    if (errors.length > 0) {
      throw new Error('Invalid GeoJSON supplied.');
    } else {
      return true;
    }
  }),
  check('altitude_agl').isInt({ min: 0, max: 4000 }).withMessage("Altitude must be provided as an integer between 0 to 4000 mts."),
  check('op_date').isISO8601().withMessage("A valid date must be provided for the operation"),
  check("op_start", "op_end")
    .isInt()
    .custom((op_start, { req }) => {
      if (parseInt(op_start) > parseInt(req.body.op_end)) {
        // trow error if passwords do not match
        throw new Error("Operation End Time cannot be before Start. ");
      } else {
        return true;
      }
    }),
];

router.post('/launchpad/submit-declaration', flight_operation_validate, async function (req, res, next) {
  const errors = validationResult(req);

  const operators = process.env.OPERATORS || "";
  if (!errors.isEmpty()) {
    // req.session.errors = errors.mapped();
    // req.session.success = false;
    // res.redirect('/launchpad');
    res.render('launchpad', {
      data: req.data,
      errors: errors.mapped(),
      operators: operators,
      user: "",
      userProfile: ""
    });
  }
  else {

    let start_date = req.body['op_date'];
    let start_time = req.body['op_start'];
    let end_time = req.body['op_end'];
    let op_mode = req.body['operation_type'];
    let altitude_agl = req.body['altitude_agl'];
    let submitted_by = req.body['submitted_by'];
    let op_name = req.body['operator_name'];
    let geojson_upload = JSON.parse(req.body['geojson_upload_control']);

    let is_approved = process.env.DEFAULT_APPROVED || 0;
    var tmp_s_date = DateTime.fromISO(start_date);
    var tmp_e_date = DateTime.fromISO(start_date);

    const start_hours = Math.floor(start_time / 60);
    const start_minutes = start_time % 60;
    // Set hours
    let s_date = tmp_s_date.set({ 'hour': start_hours, 'minutes': start_minutes });

    const end_hours = Math.floor(end_time / 60);
    const end_minutes = end_time % 60;

    let e_date = tmp_e_date.set({ 'hour': end_hours, 'minutes': end_minutes });
    
    let geo_json_with_altitude = {
      'type': 'FeatureCollection',
      'features': []
    };

    let geo_json_features = geojson_upload['features'];
    let geo_json_features_length = geo_json_features.length;
    for (let index = 0; index < geo_json_features_length; index++) {
      const geo_json_feature = geo_json_features[index];
      var properties = {
        "min_altitude": {
          "meters": altitude_agl,
          "datum": "agl"
        },
        "max_altitude": {
          "meters": altitude_agl,
          "datum": "agl"
        }
      };
      geo_json_feature['properties'] = properties;
      geo_json_with_altitude['features'].push(geo_json_feature)
    }

    const flight_declaration_json = {
      "start_datetime": s_date.toISO(),
      "end_datetime": e_date.toISO(),
      "type_of_operation": op_mode,
      "submitted_by": submitted_by,
      "is_approved": is_approved,
      "originating_party": op_name,
      "flight_declaration_geo_json": geo_json_with_altitude
    };

    const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
    let declaration_url = base_url + '/flight_declaration_ops/set_flight_declaration';
    const passport_token = await get_passport_token();
    let cred = "Bearer " + passport_token;
    axios.post(declaration_url, flight_declaration_json, {
      headers: {
        "Authorization": cred,
        'Content-Type': 'application/json'
      }
    })
      .then(function (blender_response) {
        // console.log(blender_response.data);
        res.render('launchpad-operation-submission-status', {
          title: "Thank you for your submission!",
          errors: [],
          data: blender_response.data
        }, function (ren_err, html) {
          res.send(html);
        });
      })
      .catch(function (error) {
        const e = [{ 'message': error.message, "data": error.response.data }]
        res.render('launchpad-operation-submission-status', {
          title: "Thank you for your submission!",
          errors: e,
          data: {}
        }, function (ren_err, html) {
          res.send(html);
        });
      });
  }
});


router.get('/launchpad', ensureLoggedIn('/'), (req, response, next) => {
  const {
    _raw,
    _json,
    ...userProfile
  } = req.user;
  const operators = process.env.OPERATORS || "";
  response.render('launchpad', { 'operators': operators, 'user': req.user, 'errors': [], 'userProfile': userProfile });
});

router.get('/launchpad/operation-status/:uuid', asyncMiddleware(async (req, res, next) => {
  let operationUUID = req.params.uuid;
  const is_uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationUUID);
  uuid_OK = (is_uuid) ? operationUUID : false;
  if (!uuid_OK) {
    res.status(400).send("No operation specified.");
    return;
  }

  const passport_token = await get_passport_token();
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
  let url = base_url + '/flight_declaration_ops/flight_declaration/' + operationUUID;

  axios.get(url, {
    headers: {

      'Content-Type': 'application/json',
      'Authorization': "Bearer " + passport_token

    }
  }).then(function (blender_response) {

    if (blender_response.status == 200) {
      res.render('launchpad-status', {
        title: "Operation Status",
        errors: {},
        data: blender_response.data
      });
    } else {

      res.render('error-in-submission', {
        title: "Error in submission",
        errors: blender_response.data,
        data: {}
      })
    }
  });

}));


module.exports = router;
