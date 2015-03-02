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
        switch(package.carrier) {
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

    trackPackages: function(packages, callback) {

    }
}
