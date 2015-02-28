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
            console.log(req.accepts('json.html'));
            if( req.xhr || req.accepts('json,html') === 'json') {
                res.json(data);
            } else {
                res.render('packages', {packages: data});
            }
        }
    });

});

module.exports = router;
