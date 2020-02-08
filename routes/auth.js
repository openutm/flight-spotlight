// auth.js

/**
 * Required External Modules
 */

const express = require("express");
var secured = require('../lib/middleware/secured');
const router = express.Router();
const passport = require("passport");
const util = require("util");
const querystring = require("querystring");
require("dotenv").config();
var URL = require('url').URL;
const { check, validationResult } = require('express-validator');


router.get("/", (req, res) => {
  res.render("home", { title: "Home" });
});

router.get("/spotlight", secured(), (req, response, next) => {
  const { _raw, _json, ...userProfile } = req.user;

  response.render('spotlight', {
      title: "Spotlight",
      userProfile: userProfile,
      errors: {},
      data: {}
    });

});

router.post("/spotlight", secured(), [
      check('name').isLength({ min: 3 }),
      check('email').isEmail(),
      check('age').isNumeric()
    ], (req, response, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  response.send('Got a POST request');

});
/* GET user profile. */
router.get('/user', secured(), function (req, res, next) {
  const { _raw, _json, ...userProfile } = req.user;
  res.render('user', {
    userProfile: JSON.stringify(userProfile, null, 2),
    title: 'Profile page'
  });
});

router.get(
    "/login",
    passport.authenticate("auth0", {
      scope: "openid email profile"
    }),
    (req, res) => {
      res.redirect("/");
    }
  );


router.get("/callback", (req, res, next) => {
  passport.authenticate("auth0", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || "/spotlight");
    });
  })(req, res, next);
});


router.get("/logout", (req, res) => {
    req.logOut();
  
    let returnTo = req.protocol + "://" + req.hostname;
    const port = req.connection.localPort;
  
    if (port !== undefined && port !== 80 && port !== 443) {
      returnTo =
        process.env.NODE_ENV === "production"
          ? `${returnTo}/`
          : `${returnTo}:${port}/`;
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