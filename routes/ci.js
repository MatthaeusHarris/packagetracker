/**
 * Created by matt on 4/10/15.
 */

var githubApi = require('node-github');
var express = require('express');
var router = express.Router();
var gitlog = require('../lib/gitlog');

var githubInstance = new githubApi({
    version: '3.0.0'
});

router.get('/ci/hook/update', function(req, res) {
    githubInstance.repos.getCommits({
        user: "MatthaeusHarris",
        repo: "packagetracker"
    }, function(err, data) {
        if (err) {
            return res.render('500', err);
        }

        if (data[0].sha !== gitlog.log[0].hash) {
            // We need to update
            child_process.exec('git pull', function(err, stdout, stderr) {
                if (err) {
                    return res.render('500', [err, stdout, stderr].join('\n'));
                }
                child_process.exec('npm install', function(err, stdout, stderr) {
                    if (err) {
                        return res.render('500', [err, stdout, stderr].join('\n'))
                    }
                    process.nextTick(function() {
                        console.log("Process exiting to restart after CI chain trigger");
                        process.exit(0);
                    });
                });
            });
        } else {
            res.json({'status': 'ok'});
        }
    });
});

module.exports = router;
