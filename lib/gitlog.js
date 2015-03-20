/**
 * Created by matt on 3/20/15.
 */
var gitlog = require('gitlog');
var fs = require('fs');

var options = {
    repo: fs.realpathSync(__dirname + '/../'),
    number: 20,
    fields: [ 'subject', 'authorName', 'authorDateRel', 'authorDate' ]
};

var log = [];

gitlog(options, function(err, data) {
    module.exports.log = data;
});

module.exports = {
    log: log
};