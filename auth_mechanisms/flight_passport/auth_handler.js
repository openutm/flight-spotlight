// This file is responsible for handling the authentication mechanism for the flight_passport strategy

const { auth } = require('express-openid-connect');
module.exports = function () {

    let config = {
        authRequired: false,
        secret: process.env.SESSION_SECRET,
        clientSecret: process.env.CLIENT_SECRET,
        issuerBaseURL: process.env.OIDC_DOMAIN,
        clientID: process.env.CLIENT_ID,
        baseURL: process.env.SPOTLIGHT_BASE_URL,

        authorizationParams: {
          response_type: 'code',
          response_mode: 'form_post',
          scope: 'openid profile',
        },
        routes: {
          login: false,
        },
    }
    return auth(config)

}