/**
 * Created by mharris on 2/21/15.
 */
var express = require('express');
var router = express.Router();
var gitLog = require('../lib/gitlog');

router.get('/', function(req, res) {
    res.render('about', {log: gitLog.log});
});

router.get('/about', function(req, res) {
    console.log(gitLog);
    res.render('about', {log: gitLog.log});
});

module.exports = router;