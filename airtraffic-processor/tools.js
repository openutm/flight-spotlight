
const redis_client = require('./redis-client');

const jwksRsa = require('jwks-rsa');
const axios = require('axios');
require("dotenv").config();
const qs = require('qs');
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


 function get_passport_token() {
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


function queryBlenderforFlights(){

    const passport_token =  get_passport_token();
    let cred = "Bearer " + passport_token;
}

module.exports = {
    queryBlenderforFlights: queryBlenderforFlights
};