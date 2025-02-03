// This file is responsible for handling the authentication mechanism for the flight_passport strategy

const passport = require('passport');
const { Issuer, Strategy, generators, custom } = require('openid-client');

module.exports = function () {
        const code_verifier = generators.codeVerifier();
        // store the code_verifier in your framework's session mechanism, if it is a cookie based solution
        // it should be httpOnly (not readable by javascript) and encrypted.

        const code_challenge = generators.codeChallenge(code_verifier);
        custom.setHttpOptionsDefaults({
            timeout: 5000,
        });

        Issuer.discover(process.env.OIDC_DOMAIN).then(passport_issuer => {
            let client = new passport_issuer.Client({
                client_id: process.env.CLIENT_ID,

                token_endpoint_auth_method: 'none'
            });

            client.authorizationUrl({
                scope: 'openid profile',
                resource: process.env.OIDC_DOMAIN + '/auth',
                code_challenge,
                code_challenge_method: 'S256',
            });
            const params = {
                client_id: process.env.CLIENT_ID,
                redirect_uri: process.env.CALLBACK_URL,
                scope: 'openid profile',
            }
            const passReqToCallback = false; // optional, defaults to false, when true req is passed as a first
            const usePKCE = 'S256'; // optional, defaults to false, when true the code_challenge_method will be
            // resolved from the issuer configuration, instead of true you may provide
            // any of the supported values directly, i.e. "S256" (recommended) or "plain"



            passport.use(
                'oidc',
                new Strategy({ client, params, passReqToCallback, usePKCE }, (tokenSet, userinfo, done) => {

                    return done(null, tokenSet.claims());
                })
            );

            // handles serialization and deserialization of authenticated user
            passport.serializeUser(function (user, done) {
                done(null, user);
            });
            passport.deserializeUser(function (user, done) {
                done(null, user);
            });



        });

    
}