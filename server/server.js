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

var passport = require('passport');
var refresh = require('passport-oauth2-refresh');
var GoogleStrategy = require('passport-google-oauth2').Strategy;

var googleStrategy = new GoogleStrategy({
    clientID: "258576207390-v3eeisflali8goj9dp4qrq9q0p98rpfg.apps.googleusercontent.com",
    clientSecret: "G0Vu58pzXxN-Yggbcu8O3BvO",
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback: true
},
    function (request, accessToken, refreshToken, profile, done) {
        app.models.employee.findOne({ where: { and: [{ fname: profile.name.givenName }, { lname: profile.name.familyName }] } }, function (err, emp) {
            var id = emp.id;
            profile.externalId = profile.id;
            delete profile["id"];
            profile.employeeId = id;
            profile.credentials = {accessToken:accessToken, refreshToken:refreshToken};
            profile.provider = "google-login";
            app.models.UserIdentity.upsertWithWhere({externalId:profile.externalId}, profile, function(err, obj) {
                return done(err, obj);
            });
        });
    }
);

passport.use(googleStrategy);
refresh.use(googleStrategy);


app.get('/auth/google',
    passport.authenticate('google', {
        scope: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/calendar"],
        accessType: "offline",
        prompt: "consent",
        json: true
    }));

app.get('/auth/google/callback',
    passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login', failureFlash: true }));

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
