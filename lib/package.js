/**
 * Created by matt on 2/27/15.
 */
var async = require('async');

var fedexApi = require('shipping-fedex');
var upsApi = require('shipping-ups');
var uspsApi = require('shipping-usps');

var credentials = require('../credentials').shippingProviders;

var fedex = new fedexApi(credentials.fedex);
var ups = new upsApi(credentials.ups);
var usps = new uspsApi(credentials.usps);

var Package = require('../models/package');

module.exports = {
    buildFedexTrackingLink: function(trackingNumber) {
        return "https://www.fedex.com/apps/fedextrack/?tracknumbers="
            + trackingNumber + "&language=en&cntry_code=us";
    },
    buildUPSTrackingLink: function(trackingNumber) {
        return "http://wwwapps.ups.com/WebTracking/track?track=yes&trackNums="
            + trackingNumber + "&loc=en_us";
    },
    buildUSPSTrackingLink: function(trackingNumber) {
        return "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1="
            + trackingNumber;
    },
    buildTrackingLink: function(package) {
        var linkFunctions = {
            fedex: this.buildFedexTrackingLink,
            ups: this.buildUPSTrackingLink,
            usps: this.buildUSPSTrackingLink
        };
        return linkFunctions[package.carrier.toLowerCase()](package.trackingNumber);
    },

    getTrackingInfo: function(package, callback) {
        switch(package.carrier.toLowerCase()) {
            case "usps":
                usps.track([package.trackingNumber], callback);
                break;
            case "ups":
                ups.track(package.trackingNumber, callback);
                break;
            case "fedex":
                var trackInfo = {
                    SelectionDetails: {
                        PackageIdentifier: {
                            Type: 'TRACKING_NUMBER_OR_DOORTAG',
                            Value: package.trackingNumber
                        }
                    }
                };
                fedex.track(trackInfo, callback);
                break;
            default:
                callback('unsupported carrier ' + package.carrier, null);
                break;
        }
    },

    getDeliveryEstimate: function(package) {
        switch(package.carrier.toLowerCase()) {
            case "usps":
                return "Unavailable";
                break;
            case "ups":
                try {
                    if (package.lastResponse.Shipment.Package.Activity[0].Status.StatusType.Description == "DELIVERED") {
                        return "Delivered."
                    }
                } catch(e) {
                    try {
                        return package.lastResponse.Shipment.ScheduledDeliveryDate;
                    } catch(e) {
                        return "Delivery date unavailable<br />" + e.message;
                    }
                }
                break;
            case "fedex":
                try {
                    if (package.lastResponse.CompletedTrackDetails[0].TrackDetails[0].StatusDetail.Code == "DL") {
                        return "Delivered";
                    } else {
                        return package.lastResponse.CompletedTrackDetails[0].trackDetails[0].EstimatedDeliveryTimestamp;
                    }
                } catch(e) {
                    return "Delivery date unavailable<br />" + e.message;
                }
                break;
            default:
                return "What in the name of Shub Niggurath did you ship this with?!";
                break;
        }
    },

    parseFedexTrackingInfo: function(trackingInfo) {
        try {
            return trackingInfo.CompletedTrackDetails[0].TrackDetails[0].StatusDetail.Description;
        } catch(e) {
            console.error("Could not parse FedEx package status from: " + JSON.stringify(trackingInfo));
            console.error(e.message);
            console.error(e.stack);
            return null;
        }
    },

    parseUPSTrackingInfo: function(trackingInfo) {
        try {
            if (trackingInfo.Shipment.Package.Activity.length === undefined) {
                return trackingInfo.Shipment.Package.Activity.Status.StatusType.Description;
            } else {
                return trackingInfo.Shipment.Package.Activity[0].Status.StatusType.Description
            }
        } catch(e) {
            console.error("Could not parse UPS package status from: " + JSON.stringify(trackingInfo));
            console.error(e.message);
            console.error(e.stack);
            return null;
        }
    },

    parseUSPSTrackingInfo: function(trackingInfo) {
        try {
            return trackingInfo.TrackResponse.TrackInfo.TrackSummary;
        } catch(e) {
            return e.message;
        }
    },

    parseTrackingInfo: function(package, trackingInfo) {
        var parseFunctions = {
            fedex: this.parseFedexTrackingInfo,
            ups: this.parseUPSTrackingInfo,
            usps: this.parseUSPSTrackingInfo
        };
        if (typeof trackingInfo === 'string') {
            trackingInfo = JSON.parse(trackingInfo);
        }
        return parseFunctions[package.carrier.toLowerCase()](trackingInfo);
    },

    updatePackage: function(package, callback) {
        this.getTrackingInfo(package, function(err, data) {
            if (err) {
                callback(err, null);
            } else {
                package.lastResponse = data;
                package.timestamps.lastUpdated = Date.now();
                package.timestamps.nextUpdate = (new Date().setHours(new Date().getHours() + 3));
                package.save(function(err, data) {
                    console.log("Package " + package._id + " saved.");
                    callback(err, data);
                });
            }
        });
    },

    updateAllPackages: function(callback) {
        var packageApi = this;
        var generatePackageUpdateFunction = function(package) {
            return function(cb) {
                console.log("Updating package " + package._id);
                packageApi.updatePackage(package, function(err, data) {
                    console.log("Done processing package " + package._id);
                    cb(err, data);
                });
            };
        };

        var now = Date.now();
        console.log('Searching for packages to update.');
        Package.find({}).where('timestamps.nextUpdate').lt(now).exec(function(err, packages) {
            if (err) {
                callback(err, null);
            } else {
                console.log("Updating " + packages.length + " packages.");
                async.parallelLimit(packages.map(generatePackageUpdateFunction), 2, callback);
            }
        });
    }
}
