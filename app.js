var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var credentials = require('./credentials');
var session = require('express-session');

var uri = 'mongodb://localhost/packagetracker';
mongoose.connect(uri);

var handlebars = require('express-handlebars').create({
    defaultLayout: 'main',
    helpers: {
        section: function( name, options){
            if(! this. _sections) this. _sections = {};
            this. _sections[ name] = options.fn(this);
            return null;
        }
    }
});

var app = express();

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(express.static(__dirname + '/public'));
app.use(cookieParser(credentials.cookieSecret));
app.use(session({
    secret: credentials.cookieSecret
}));
app.use(logger('combined'));

var auth = require('./lib/auth');
auth.initialize(app);
auth.registerRoutes(app);

app.use(require('./routes/index'));
app.use(require('./routes/user'));

app.use(function(req, res) {
    res.status(404);
    res.render('404');
});

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
});

module.exports = app;