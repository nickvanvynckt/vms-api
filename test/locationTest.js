'use strict'

var supertest = require("supertest");
var should = require("should");

var server = supertest.agent("http://localhost:3000/api");
var server1 = require('../server/server');

describe("Location",function(){
    var location = undefined;

    beforeEach("Creating dummy data", function(done) {
        server1.models.Location.create({address:"Street 1", postalCode:3000, country:"BEL"}, function cb(err, obj) {
            location = obj;
            done();
        });
    });

    afterEach("Cleaning database", function(done) {
        server1.models.Location.destroyAll();
        done();
    });

    it("[GET][/locations/{id}] Returns location with id",function(done){
        server
        .get("/locations/" + location.id)
        .expect("Content-type",/json/)
        .expect(200)
        .end(function(err,res){
            res.status.should.equal(200);
            res.body.id.should.equal(location.id.toString());
            done();
        });
    });

    it("[DELETE][/locations/{id}] Deletes location with id",function(done){
        server
        .delete("/locations/" + location.id)
        .expect("Content-type",/json/)
        .expect(200)
        .end(function(err,res){
            res.status.should.equal(200);
            res.body.count.should.equal(1);
            done();
        });
    });

    it("[GET][/locations/findOne] Finds location by filter",function(done){
        server
        .get("/locations/findOne?filter=[where][and][0][address]=" + location.address + "&filter[where][and][1][postalCode]=" + location.postalCode + "&filter[where][and][2][country]=" + location.country)
        .expect("Content-type",/json/)
        .expect(200)
        .end(function(err,res){
            res.status.should.equal(200);
            res.body.id.should.equal(location.id.toString());
            done();
        });
    });
});