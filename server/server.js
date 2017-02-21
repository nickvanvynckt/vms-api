'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var flash = require('express-flash');

var app = module.exports = loopback();

app.set('cookieSecret', 'keyboard cat');

// Passport configurators..
var loopbackPassport = require('loopback-component-passport-c');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

//Passport config through providers.json
var config = {};
try {
    config = require('../providers.json');
} catch (err) {
    console.trace(err);
    process.exit(1); // fatal
}

app.middleware('session:before', cookieParser(app.get('cookieSecret')));
app.middleware('session', session({
    secret: 'keyboard cat',
    saveUninitialized: true,
    resave: false,
    signed: true
}));
passportConfigurator.init();

//Body parser config
app.middleware('parse', bodyParser.json());
app.middleware('parse', bodyParser.urlencoded({
    extended: true
}));
// The access token is only available after boot
app.middleware('auth', loopback.token({
    model: app.models.AccessToken
}));

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function (err) {
    if (err) throw err;

    // start the server if `$ node server.js`
    if (require.main === module)
        app.start();
});

// We need flash messages to see passport errors
app.use(flash());

passportConfigurator.setupModels({
    userModel: app.models.employee,
    userIdentityModel: app.models.userIdentity,
    userCredentialModel: app.models.userCredential
});

for (var s in config) {
    var c = config[s];
    c.session = c.session !== false;
    passportConfigurator.configureProvider(s, c);
}

app.start = function () {
    // start the web server
    return app.listen(function () {
        app.emit('started');
        var baseUrl = app.get('url').replace(/\/$/, '');
        console.log('Web server listening at: %s', baseUrl);
        if (app.get('loopback-component-explorer')) {
            var explorerPath = app.get('loopback-component-explorer').mountPath;
            console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
        }
    });
};
