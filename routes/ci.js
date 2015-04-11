/**
 * Created by matt on 4/10/15.
 */

var githubApi = require('node-github');
var express = require('express');
var router = express.Router();
var gitlog = require('../lib/gitlog');
var child_process = require('child_process');

var githubInstance = new githubApi({
    version: '3.0.0'
});

router.post('/ci/hook/update', function(req, res) {
    console.log(req.body);
    githubInstance.repos.getCommits({
        user: "MatthaeusHarris",
        repo: "packagetracker"
    }, function(err, data) {
        if (err) {
            return res.render('500', err);
        }

        if (data[0].sha !== gitlog.log[0].hash) {
            // We need to update
            console.log("CI update hook triggered.  Fetching updates");
            child_process.exec('git pull', function(err, stdout, stderr) {
                if (err) {
                    console.log(stderr);
                    return res.render('500', [err, stdout, stderr].join('\n'));
                }
                console.log(stdout);
                console.log(stderr);
                console.log("Installing any new libraries");
                child_process.exec('npm install', function(err, stdout, stderr) {
                    if (err) {
                        console.log(stderr);
                        return res.render('500', [err, stdout, stderr].join('\n'))
                    }
                    console.log(stdout);
                    console.error(stderr);
                    process.nextTick(function() {
                        console.log("Process exiting to restart after CI chain trigger");
                        process.exit(0);
                    });
                });
            });
            child_process.exec('env', function(err, stdout, stderr) {
                console.log("ENV DUMP");
                console.log(stdout);
                console.log(stderr);
                console.log("END ENV DUMP");
            });
        } else {
            res.json({'status': 'ok'});
        }
    });
});

module.exports = router;
