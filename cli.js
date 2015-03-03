/**
 * Created by matt on 3/2/15.
 */
var packageApi = require('./lib/package');
var credentials = require('./credentials');
var fs = require('fs');


module.exports = {
    packageApi: packageApi,
    credentials: credentials,
    cb: function(err, data) {
        e = err;
        d = data;
        console.log('done');
    },
    createSample: function(carrier, trackingNumber) {
        this.packageApi.getTrackingInfo({carrier: carrier, trackingNumber: trackingNumber}, function(err, data) {
            if (err) {
                console.error(err);
            } else {
                fs.writeFileSync('./test/samples/' + carrier.toLowerCase() + '/' + trackingNumber + '.json', JSON.stringify(data, null, '    '));
                console.log('done');
            }
        })
    }
};
