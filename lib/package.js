/**
 * Created by matt on 2/27/15.
 */
var async = require('async');

var fedexApi = require('shipping-fedex');
var upsApi = require('shipping-ups');
var uspsApi = require('shipping-usps');

var credentials = require('../credentials');//.shippingProviders;

var fedex = new fedexApi(credentials.shippingProviders.fedex);
var ups = new upsApi(credentials.shippingProviders.ups);
var usps = new uspsApi(credentials.shippingProviders.usps);

var Package = require('../models/package');
var Address = require('../models/address');

var geocoder = require('node-geocoder')('openstreetmap', 'https');

module.exports = {
    getPackageLatLong: function(package, callback) {
        var city = this.getCurrentLocation(package);
        console.log(city);
        if (city) {
            Address.findOne({address: city}, function(err, data) {
                console.log(err, data);
                if (err) {
                    callback(err, null);
                } else {
                    if (data) {
                        callback(null, data);
                    } else {
                        console.log("Address cache not found.  Looking up");
                        geocoder.geocode(city, function(err, data) {
                            if (err) {
                                callback(err, null);
                            } else {
                                console.log(data);
                                var address = new Address({
                                    address: city,
                                    geoInfo: data
                                });
                                address.save(callback);
                            }
                        });
                    }
                }
            });
        } else {
            callback('invalid city', city);
        }
    },
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
                    } else {
                        throw new Error("This is an ugly hack.");
                    }
                } catch(e) {
                    try {
                        var deliveryDate = package.lastResponse.Shipment.ScheduledDeliveryDate;

                        return deliveryDate.substr(4,2) + "/" + deliveryDate.substr(6,2) + "/" + deliveryDate.substr(0,4) +  " (Scheduled)";
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
                        try {
                            return package.lastResponse.CompletedTrackDetails[0].TrackDetails[0].EstimatedDeliveryTimestamp;
                        } catch(e) {
                            return "Delivery date unavailable";
                        }
                    }
                } catch(e) {
                    return "Delivery date unavailable";
                }
                break;
            default:
                return "What in the name of Shub Niggurath did you ship this with?!";
                break;
        }
    },

    getCurrentLocation: function(package) {
        var event;
        switch(package.carrier.toLowerCase()) {
            case "usps":
                try {
                    event = package.lastResponse.TrackResponse.TrackInfo;
                    console.log(event);
                    var regex = /[A-Z ]+, [A-Z0-9, ]+/;
                    if (typeof event.TrackDetail === 'string') {
                        return event.TrackDetail.match(regex)[0];
                    } else {
                        return event.TrackDetail[0].match(/[A-Z][A-Z0-9,\npm. ]*$/)[0];
                    }
                } catch(e) {
                    console.error(package.description);
                    console.error(e);
                    return null;
                }

                break;
            case "ups":
                try {
                    event = package.lastResponse.Shipment.Package.Activity[0];
                } catch(e) {
                    try {
                        event = package.lastResponse.Shipment.Package.Activity;
                    } catch(e) {
                        console.error(package.description);
                        console.error(e);
                        return null;
                    }
                }
                try {
                    return event.ActivityLocation.Address.City + ", " + event.ActivityLocation.Address.StateProvinceCode;
                } catch(e) {
                    console.error(package.description);
                    console.error(e);
                    return null;
                }
                break;
            case "fedex":
                try {
                    event = package.lastResponse.CompletedTrackDetails[0].TrackDetails[0].StatusDetail;
                    if (event.Location.City && event.Location.StateOrProvinceCode) {
                        return event.Location.City + ", " + event.Location.StateOrProvinceCode;
                    } else {
                        return null;
                    }
                } catch(e) {
                    console.error(package.description);
                    console.error(e);
                    return null;
                }
                break;
            default:
                return null;
                break;
        }
    },

    parseFedexTrackingInfo: function(trackingInfo) {
        try {
            var status = trackingInfo.CompletedTrackDetails[0].TrackDetails[0].StatusDetail;
            return status.Description + " at " + status.Location.City + ", " + status.Location.StateOrProvinceCode;
        } catch(e) {
            console.error("Could not parse FedEx package status from: " + JSON.stringify(trackingInfo));
            console.error(e.message);
            console.error(e.stack);
            return null;
        }
    },

    parseUPSTrackingInfo: function(trackingInfo) {
        var event;
        try {
            if (trackingInfo.Shipment.Package.Activity.length === undefined) {
                event = trackingInfo.Shipment.Package.Activity;
                //return trackingInfo.Shipment.Package.Activity.Status.StatusType.Description;
            } else {
                event = trackingInfo.Shipment.Package.Activity[0];
                //return trackingInfo.Shipment.Package.Activity[0].Status.StatusType.Description
            }
            return event.Status.StatusType.Description + " in " + event.ActivityLocation.Address.City + ", " + event.ActivityLocation.Address.StateProvinceCode;
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
                this.getPackageLatLong(package, function(err, data) {
                    package.currentLocation = data;
                    package.save(function(err, data) {
                        console.log("Package " + package._id + " saved.");
                        callback(err, data);
                    });
                });
            }
        }.bind(this));
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
        Package.find({'flags.hidden': false, 'flags.update': true}).where('timestamps.nextUpdate').lt(now).exec(function(err, packages) {
            if (err) {
                callback(err, null);
            } else {
                console.log("Updating " + packages.length + " packages.");
                async.parallelLimit(packages.map(generatePackageUpdateFunction), 2, callback);
            }
        });
    }
}
