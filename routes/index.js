/**
 * Created by mharris on 2/21/15.
 */
var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
    res.render('home');
});

router.get('/about', function(req, res) {
    res.render('about');
});

module.exports = router;