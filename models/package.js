/**
 * Created by mharris on 2/21/15.
 */

var mongoose = require('mongoose');

var packageSchema = mongoose.Schema({
    carrier: String,
    description: String,
    trackingNumber: String,
    userId: String,
    status: {
        deliveryDate: Date,
        eventList: [
            String
        ]
    }
});

var Package = mongoose.model('Package', packageSchema);
module.exports = Package;