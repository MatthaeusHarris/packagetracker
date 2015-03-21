/**
 * Created by matt on 3/20/15.
 */

var mongoose = require('mongoose');

var addressSchema = mongoose.Schema({
    address: String,
    geoInfo: Object
});

addressSchema.index({"address": 1});

var Address = mongoose.model('Address', addressSchema);
module.exports = Address;