'use strict';

var supertest = require('supertest');
var server = supertest.agent('http://localhost:3000');
var company = require('../common/models/company');

var mongoClient = require('mongodb');
var format = require('util').format;

console.log('Cleaning and populating database');

mongoClient.connect('mongodb://127.0.0.1:27017/vms', function(err, db) {
    db.dropDatabase();
    
});
