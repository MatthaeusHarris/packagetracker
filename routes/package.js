/**
 * Created by mharris on 2/27/15.
 */
var express = require('express');
var router = express.Router();
var auth = require('../lib/auth');
var Package = require('../models/package');
var flash = require('../lib/flash');
var packageUtils = require('../lib/package');
var credentials = require('../credentials');

router.get('/packages', auth.ensureAuthenticated, function(req, res) {
    var query = {
        userId: req.user.authId,
        'flags.hidden': false
    };
    Package.find(query, function(err, data) {
        if (err) {
            flash(req, {
                type: 'error',
                intro: 'DB Error',
                message: err
            });
            res.redirect('/');
        } else {
            if( req.xhr || req.accepts('json,html') === 'json') {
                res.json(data);
            } else {
                for(var package in data) {
                    data[package].trackingLink = packageUtils.buildTrackingLink(data[package]);
                    data[package].latestEvent = packageUtils.parseTrackingInfo(data[package], data[package].lastResponse);
                    data[package].deliveryEstimate = packageUtils.getDeliveryEstimate(data[package]);
                }
                res.render('packages', {packages: data});
            }
        }
    });

});

router.post('/package', auth.ensureAuthenticated, function(req, res) {
    var now = new Date();
    var package = new Package({
        carrier: req.body.carrier.toLowerCase(),
        description: req.body.description,
        trackingNumber: req.body.trackingNumber,
        userId: req.user.authId,
        timestamps: {
            created: now.getTime(),
            nextUpdate: now.setHours(now.getHours() + 3),
            lastUpdated: now.getTime()
        },
        status: {
            delivered: false
        },
        flags: {
            hidden: false,
            update: true
        }
    });
    package.save(function(err, data) {
        if (err) {
            flash(req, {
                type: 'error',
                intro: 'Package',
                message: JSON.stringify(err)
            });
            console.log(err);
            res.redirect(303, '/packages');
        } else {
            flash(req, {
                type: 'info',
                intro: 'Package',
                message: 'saved'
            });
            packageUtils.updatePackage(package, function(err, data) {
                if (err) {
                    flash(req, {
                        type: 'error',
                        intro: 'Error retrieving package status',
                        message: err
                    });
                } else {
                    flash(req, {
                        type: 'info',
                        intro: 'Package status',
                        message: 'updated'
                    });
                }
                res.redirect(303, '/packages');
            });
        }
    });
});

router.delete('/package/:id', auth.ensureAuthenticated, function(req, res) {
    var query = {
        _id: req.params.id,
        userId: req.user.authId
    };
    var update = {
        flags: {
            hidden: true
        }
    };
    Package.findOneAndUpdate(query, update, function(err, data) {
        if (req.xhr || req.accepts('json,html') === 'json') {
            if (err) {
                res.status(500);
                res.json({error: err});
            } else {
                res.json({status: 'ok'});
            }
        } else {
            if (err) {
                flash(req, {
                    type: 'error',
                    intro: 'Package',
                    message: err
                });
            }
            res.redirect(303, '/packages');
        }
    });
});

router.get('/package/:id', auth.ensureAuthenticated, function(req, res) {
    var query = {
        userId: req.user.authId,
        _id: req.params.id
    };
    Package.findOne(query, function(err, data) {
        if (err) {
            res.render('500', {error: err});
        } else {
            res.header('content-type', 'text/plain');
            res.send(JSON.stringify(data, null, '    '));
            res.end();
        }
    });
});

router.get('/map', auth.ensureAuthenticated, function(req, res) {
    var query = {
        userId: req.user.authId,
        'flags.hidden': false
    };

    Package.find(query, function(err, data) {
        if (err) {
            res.render('500', {error: err});
        } else {
            for(var package in data) {
                if (data[package].currentLocation) {
                    data[package].location = {
                        latitude: data[package].currentLocation.geoInfo[0].latitude,
                        longitude: data[package].currentLocation.geoInfo[0].longitude
                    };
                } else {
                    data.splice(package, 1);
                }
            }
            res.render('map', {packages: data, mapsApiKey: credentials.apiKeys.googleMaps});
        }
    });
});

module.exports = router;
