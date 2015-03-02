/**
 * Created by matt on 2/20/15.
 */
var GoogleStrategy = require('passport-google-oauth2').Strategy;
var passport = require('passport');
var credentials = require('../credentials');
var User = require('../models/user');
var flash = require('../lib/flash');

var initialize = function(app) {
    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            if (err || !user) return done(err, null);
            done(null, user);
        });
    });

    passport.use(new GoogleStrategy(
        {
            clientID: credentials.authProviders.google.clientId,
            clientSecret: credentials.authProviders.google.secret,
            callbackURL: credentials.authProviders.google.redirect[0],
            passReqToCallback: true
        },
        function (req, accessToken, refreshToken, profile, done) {
            //console.log(profile);
            User.findOne({authId: 'google:' + profile.id}, function (err, user) {
                if (err) {
                    //console.log("Error: " + err);
                    return done(err, null);
                }
                if (user) {
                    //console.log("User found: " + user);
                    done(null, user);
                } else {
                    //console.log("New user");
                    user = new User({
                        authId: 'google:' + profile.id,
                        name: profile.displayName,
                        email: profile.email,
                        role: 'user',
                        created: Date.now()
                    });
                    //console.log("Saving new user");
                    user.save(function (err, user) {
                        if (!err && user) {
                            //console.log("User successfully saved.");
                            done(null, user);
                        } else {
                            //console.log("Big problem: " + err);
                            done(err, null);
                        }
                    });
                }
            });
        }
    ));
    app.use(passport.initialize());
    app.use(passport.session());
};

var registerRoutes = function(app) {
    app.get('/auth/google',
        passport.authenticate('google', {
            scope: [
                'https://www.googleapis.com/auth/plus.login',
                'https://www.googleapis.com/auth/plus.profile.emails.read'
            ]
        })
    );

    app.get('/auth/google/callback',
        passport.authenticate('google', {
            successRedirect: '/auth/google/success',
            failureRedirect: '/auth/google/failure'
        })
    );

    app.get('/auth/google/success', function(req, res) {
        flash(req, {
            type: 'info',
            intro: 'Login',
            message: 'Authentication successful.'
        });
        if (req.session && req.session.redirect) {
            var redirect = req.session.redirect;
            delete req.session.redirect;
            res.redirect(redirect);
        } else {
            res.redirect('/');
        }
    });

    app.get('/auth/google/failure', function(req, res) {
        res.render('500', {error: "login failure"});
    });

    app.get('/logout', function(req, res) {
        flash(req, {
            type: 'info',
            intro: 'Logout',
            message: 'User logged out.'
        });
        req.logout();
        res.redirect('/');
    });
};

var ensureAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    req.session.redirect = req.path;
    res.redirect('/auth/google');
}


module.exports = {
    initialize: initialize,
    registerRoutes: registerRoutes,
    ensureAuthenticated: ensureAuthenticated
};