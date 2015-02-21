/**
 * Created by mharris on 2/21/15.
 */
var express = require('express');
var router = express.Router();
var auth = require('../lib/auth');

router.get('/user', auth.ensureAuthenticated, function(req, res) {
    res.render('user', {
        authId: req.user.authId,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        created: req.user.created
    });
});

module.exports = router;