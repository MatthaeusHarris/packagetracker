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
        delivered: Boolean,
        eventList: [
            String
        ]
    },
    timestamps: {
        created: Date,
        nextUpdate: Date,
        lastUpdated: Date
    },
    flags: {
        update: Boolean,
        hidden: Boolean
    },
    lastResponse: Object,
    currentLocation: Object
});

packageSchema.index({"carrier": 1});
packageSchema.index({"userId": 1});
packageSchema.index({"timestamps.nextUpdate": 1});
packageSchema.index({"flags.update": 1});
packageSchema.index({"flags.hidden": 1});

var Package = mongoose.model('Package', packageSchema);
module.exports = Package;