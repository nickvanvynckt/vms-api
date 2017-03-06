'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var flash = require('express-flash');
var cors = require('cors');
var passport = require('passport');
var refresh = require('passport-oauth2-refresh');
var GoogleStrategy = require('passport-google-oauth2').Strategy;
var LinkedinStrategy = require('passport-linkedin-oauth2').Strategy;
var loopbackPassport = require('loopback-component-passport-c');

var app = module.exports = loopback();

app.set('cookieSecret', 'keyboard cat');

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if ('OPTIONS' == req.method) {
        res.send(200);
    } else {
        next();
    }
});

app.use(passport.initialize());
app.use(passport.session());

app.middleware('session:before', cookieParser(app.get('cookieSecret')));
app.middleware('session', session({ secret: 'keyboard cat', saveUninitialized: true, resave: false, signed: true }));

//Body parser config
app.middleware('parse', bodyParser.json());
app.middleware('parse', bodyParser.urlencoded({ extended: true }));
// The access token is only available after boot
app.middleware('auth', loopback.token({ model: app.models.AccessToken }));

// Passport configurators..
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
    if (err)
        throw err;

    // start the server if `$ node server.js`
    if (require.main === module)
        app.start();
});

passportConfigurator.setupModels({
    userModel: app.models.employee,
    userIdentityModel: app.models.userIdentity,
    userCredentialModel: app.models.userCredential
});

// We need flash messages to see passport errors
app.use(flash());

var googleStrategy = new GoogleStrategy({
    clientID: "76402852390-v65bqbapk6tg964tnbveg84rv8abtaea.apps.googleusercontent.com",
    clientSecret: "drYRZn4EiePthBu08gtvjfn-",
    callbackURL: "http://localhost:4000/auth/google/callback",
    passReqToCallback: true
}, function(request, accessToken, refreshToken, profile, done) {
    var data = JSON.parse(request.query.state);
    app.models.employee.findOne({
        where: { id: data.id }
    }, function(err, emp) {
        var id = emp.id;
        profile.externalId = profile.id;
        delete profile["id"];
        profile.employeeId = id;
        profile.credentials = {
            accessToken: accessToken,
            refreshToken: refreshToken
        };
        profile.provider = "google-login";
        app.models.UserIdentity.upsertWithWhere({
            externalId: profile.externalId
        }, profile, function(err, obj) {
            if (emp.pictureURL === undefined && profile.photos.length > 0) {
                emp.pictureURL = profile.photos[0].value;
                app.models.Employee.upsertWithWhere({
                    id: id
                }, emp, function(err1, emp) {
                    return done(err, obj);
                });
            } else {
                return done(err, obj);
            }
        });
    });
});

var linkedInStrategy = new LinkedinStrategy({
    clientID: "86q32krgcwud98",
    clientSecret: "jHTjkR8pKTMWAgZt",
    callbackURL: "http://localhost:4000/auth/linkedin/callback",
    passReqToCallback: true
}, function(req, token, tokenSecret, profile, done) {
    var data = JSON.parse(req.query.state);
    app.models.employee.findOne({
        where: { id: data.id }
    }, function(err, emp) {
        var id = emp.id;
        profile.externalId = profile.id;
        delete profile["id"];
        profile.employeeId = id;
        profile.provider = "linkedin-login";
        profile.credentials = {
            accessToken: tokenSecret
        };
        app.models.UserIdentity.upsertWithWhere({
            externalId: profile.externalId
        }, profile, function(err, obj) {
            if (profile.photos.length > 0) {
                emp.pictureURL = profile.photos[0].value;
                app.models.Employee.upsertWithWhere({
                    id: id
                }, emp, function(err1, emp) {
                    return done(err, obj);
                });
            } else {
                return done(err, obj);
            }
        });
    });
});

passport.use(googleStrategy);
passport.use(linkedInStrategy);
refresh.use(googleStrategy);

app.get('/auth/google', function(req, res, next) {
    passport.authenticate('google', {
        scope: [
            "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/calendar"
        ],
        callbackURL: "http://localhost:4000/auth/google/callback?callback=" + req.query.callback,
        accessType: "offline",
        prompt: "consent",
        action: "page",
        json: true,
        state: JSON.stringify({ id: req.query.id })
    }, function(err, usr, info) {})(req, res, next);
});

app.get('/auth/google/callback', function(req, res, next) {
    passport.authenticate('google', {
        callbackURL: "http://localhost:4000/auth/google/callback?callback=" + req.query.callback,
        successRedirect: 'http://localhost:3000/integrations?success=google&callback=' + req.query.callback,
        failureRedirect: 'http://localhost:3000/',
        responseType: "token",
        failureFlash: true
    })(req, res, next);
});

app.get('/auth/linkedin', function(req, res, next) {
    passport.authenticate('linkedin', {
        "scope": ["r_basicprofile", "r_emailaddress"],
        "callbackURL": "http://localhost:4000/auth/linkedin/callback?callback=" + req.query.callback,
        "json": true,
        "state": JSON.stringify({ id: req.query.id })
    })(req, res, next);
});

app.get('/auth/linkedin/callback', function(req, res, next) {
    passport.authenticate('linkedin', {
        callbackURL: "http://localhost:4000/auth/linkedin/callback?callback=" + req.query.callback,
        successRedirect: 'http://localhost:3000/integrations?success=linkedin&callback=' + req.query.callback,
        failureRedirect: 'http://localhost:3000/',
        responseType: "token",
        failureFlash: true
    })(req, res, next);
});

app.start = function() {
    // start the web server
    return app.listen(function() {
        app.emit('started');
        var baseUrl = app.get('url').replace(/\/$/, '');
        console.log('Web server listening at: %s', baseUrl);
        if (app.get('loopback-component-explorer')) {
            var explorerPath = app.get('loopback-component-explorer').mountPath;
            console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
        }
    });
};