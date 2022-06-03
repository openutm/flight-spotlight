const express = require('express');
const router = express.Router();
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const qs = require('qs');
var async = require('async');
const asyncMiddleware = require('../util/asyncMiddleware');
const {
  DateTime
} = require("luxon");

var redis_client = require('redis').createClient(process.env.REDIS_URL || {
  host: '127.0.0.1',
  port: 6379
});

let geojsonhint = require("@mapbox/geojsonhint");
const {
  check,
  validationResult
} = require('express-validator');
const axios = require('axios');
const https = require('https');


async function get_passport_token() {
  return new Promise(function (resolve, reject) {

    redis_key = 'blender_passport_token';

    async.map([redis_key], function (r_key, done) {

      redis_client.get(r_key, function (err, results) {
        if (err || results == null) {
          let post_data = {
            "client_id": process.env.PASSPORT_BLENDER_CLIENT_ID,
            "client_secret": process.env.PASSPORT_BLENDER_CLIENT_SECRET,
            "grant_type": "client_credentials",
            "scope": process.env.PASSPORT_BLENDER_SCOPE,
            "audience": process.env.PASSPORT_BLENDER_AUDIENCE
          };
          axios.request({
            url: process.env.PASSPORT_TOKEN_URL || '/oauth/token',
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


var flight_operation_validate = [
  check('operator_name').isLength({
    min: 5,
    max: 20
  }).withMessage("Operator name is required and must be more than 5 characters")
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
  check('altitude_agl').isInt({ min: 0, max: 150 }).withMessage("Altitude must be provided as an integer between 0 to 150 mts.")
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
      userProfile:""
    });
  }
  else {

    let date_range = req.body['datetimes'];
    let date_split = date_range.split(' ');
    let op_mode = req.body['operation_type'];
    let altitude_agl = req.body['altitude_agl'];
    let op_name = req.body['operator_name'];
    let geojson_upload = JSON.parse(req.body['geojson_upload_control']);
    let start_date = DateTime.fromISO(date_split[0]);
    let end_date = DateTime.fromISO(date_split[2]);

    operation_mode_lookup = {
      '1': 'vlos',
      '2': 'bvlos'
    };
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
      "start_datetime": date_split[0],
      "end_datetime": date_split[2],
      "type_of_operation": op_mode,
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
        
        const e = [{'message':error.message}]
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
  response.render('launchpad', { 'operators': operators, 'user': req.user, 'errors': [],'userProfile':userProfile });
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
