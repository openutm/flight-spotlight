// This file is responsible for handling the authentication mechanism for the flight_passport strategy

const { auth } = require('express-openid-connect');
module.exports = function () {
    let config = {
        authRequired: false,
        clientSecret: ClientSecret,
        issuerBaseURL: `${OIDC_DOMAIN}`,
        clientID: ClientId,
        baseURL: process.env.BASE_URL,
      
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