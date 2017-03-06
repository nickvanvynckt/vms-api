'use strict';

var path = require('path');
var app = require(path.resolve(__dirname, '../server'));
var GoogleSearch = require('google-search');
var googleSearch = new GoogleSearch({ key: 'AIzaSyDmXoXIey6c-GtQyF9u33o5F8UR2xTfCqU', cx: '002086392339423832635:4taepnplwtq' });
var MongoClient = require('mongodb').MongoClient;
var async = require('async');

module.exports = function(External) {
    External.getInformation = function(fname, lname, cb) {
        var resp;
        External.find({
            where: {
                and: [{
                    fname: fname
                }, {
                    lname: lname
                }]
            }
        }, function(err, external) {
            if (err)
                console.log(err);
            searchAndUpsert(external[0], fname, lname, function(object) {
                cb(null, object);
            });
        });
    };
    External.remoteMethod('getInformation', {
        http: {
            path: '/getInformation',
            verb: 'get'
        },
        accepts: [{
            arg: 'fname',
            type: 'string'
        }, {
            arg: 'lname',
            type: 'string'
        }],
        returns: {
            arg: 'information',
            type: 'Object'
        }
    });

    function searchAndUpsert(external, fname, lname, cb) {
        if (external) {
            // Already in the database, check if data is still viable!');
            var d = new Date(external.last_edited);
            d.setSeconds(d.getSeconds() + external.ttl);
            if (Date.now() < d) {
                // External info is up to date
            } else {
                // External info no longer up to date
                upsert(fname, lname);
            }
            cb(external);
        } else {
            // External not in database, add it
            upsert(fname, lname, function(object) {
                cb(object);
            });
        }

    }

    function upsert(fname, lname, cb) {
        var object;
        var name = fname + ' ' + lname;
        var googleSearch = googleSearchFunction(name, function(data) {
            var index = 0;
            var found = false;

            while (index < 10 && !found) {
                if (data.items[index].pagemap.hcard[0].fn == name) {
                    var fname = data.items[index].pagemap.hcard[0].fn.substr(0, data.items[index].pagemap.hcard[0].fn.indexOf(' '));
                    var lname = data.items[index].pagemap.hcard[0].fn.substr(data.items[index].pagemap.hcard[0].fn.indexOf(' ') + 1);

                    found = true;

                    var external = new External({
                        fname: fname,
                        lname: lname,
                        pictureURL: data.items[index].pagemap.hcard[0].photo,
                        //Date is saved in UTC (one hour off)
                        last_edited: Date.now()
                    });

                    External.upsert(external, function(err, obj) {
                        object = obj;
                        cb(object);
                    });
                } else {
                    index++;
                }
            }
        });
    }

    function googleSearchFunction(name, cb) {
        var data;
        googleSearch.build({
            q: name,
            lr: 'lang_nl'
        }, function(error, response) {
            if (error)
                console.log(error);
            data = response;
            cb(data);
        });
    }
};