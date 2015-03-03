/**
 * Created by matt on 3/3/15.
 */
var packageApi = require('../lib/package');

module.exports = {
    start: function() {
        console.log("Setting up cron to run every " + (this.updateTime/1000) + " seconds");
        this.interval = setInterval(function() {
            console.log("starting cron run");
            packageApi.updateAllPackages(function(err, data) {
                if (err) {
                    console.error("An error occurred during the cron run");
                    console.error(err);
                } else {
                    console.log("cron run complete.");
                }
            });
        }, this.updateTime);
    },
    //updateTime: 5 * 60 * 1000
    updateTime: 30 * 1000
};
