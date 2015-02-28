/**
 * Created by mharris on 2/27/15.
 */
var express = require('express');
var router = express.Router();
var auth = require('../lib/auth');
var Package = require('../models/package');
var flash = require('../lib/flash');

router.get('/packages', auth.ensureAuthenticated, function(req, res) {
    var query = {
        userId: req.user.authId
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
                res.render('packages', {packages: data, csrf: 'blarg'});
            }
        }
    });

});

router.post('/package', auth.ensureAuthenticated, function(req, res) {
    var package = new Package({
        carrier: req.body.carrier,
        description: req.body.description,
        trackingNumber: req.body.trackingNumber,
        userId: req.user.authId
    });
    package.save(function(err, data) {
        if (err) {
            flash(req, {
                type: 'error',
                intro: 'Package',
                message: err
            });
        } else {
            flash(req, {
                type: 'info',
                intro: 'Package',
                message: 'saved'
            });
        }
        res.redirect(303, '/packages');
    });
});

router.delete('/package/:id', auth.ensureAuthenticated, function(req, res) {
    var query = {
        _id: req.params.id
    };
    Package.find(query).remove(function(err, data) {
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

module.exports = router;
