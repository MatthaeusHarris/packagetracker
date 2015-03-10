/**
 * Created by mharris on 2/21/15.
 */
var express = require('express');
var router = express.Router();
var auth = require('../lib/auth');
var User = require('../models/user');
var flash = require('../lib/flash');

router.get('/user', auth.ensureAuthenticated, function(req, res) {
    res.render('user', {
        authId: req.user.authId,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        created: req.user.created
    });
});

router.post('/user', auth.ensureAuthenticated, function(req, res) {
    var query = {
        authId: req.user.authId
    };
    var update = {
        name: req.body.name,
        email: req.body.email
    };
    User.findOneAndUpdate(query, update, function(err, user) {
        if (err || !user) {
            flash(req, {
                type: 'error',
                intro: 'User',
                message: err || 'User not found.  How did that happen?'
            });
        } else {
            flash(req, {
                type: 'info',
                intro: 'User',
                message: 'Updated'
            });
        }
        res.redirect(303, '/user');
    });
});

module.exports = router;