'use strict';

var path = require('path');
var app = require(path.resolve(__dirname, '../server'));
var GoogleSearch = require('google-search');
var googleSearch = new GoogleSearch({key: 'AIzaSyAWqi1qfUyGPOTcmhE0gu-5Ik8hz8Ncjr8', cx: '002086392339423832635:4taepnplwtq'});
var MongoClient = require('mongodb').MongoClient;

module.exports = function(External) {
    External.getInformation = function(fname, lname, cb) {
        var resp;
        External.find({
            where: {
                and: [
                    {
                        fname: fname
                    }, {
                        lname: lname
                    }
                ]
            }
        }, function(err, external) {
            if (err)
                console.log(err);
            if(external[0]) {
                var d = new Date(external[0].last_edited);
                d.setSeconds(d.getSeconds() + external[0].ttl);
                if (Date.now() < d) {
                    resp = external[0];
                } else {
                    resp = searchAndUpdate(external[0]);
                }
            } else {
                resp = searchAndInsert(fname, lname);
            }

            cb(null, resp);
        });
    };
    External.remoteMethod('getInformation', {
        http: {
            path: '/getInformation',
            verb: 'get'
        },
        accepts: [
            {
                arg: 'fname',
                type: 'string'
            }, {
                arg: 'lname',
                type: 'string'
            }
        ],
        returns: {
            arg: 'information',
            type: 'Object'
        }
    });
    function searchAndUpdate(external) {
        var name = external.fname + ' ' + external.lname;
        googleSearch.build({
            q : name,
            lr : 'lang_nl'
        }, function(error, response) {
            var index = 0;
            var found = false;
            while (index < 10  && !found) {
                if (response.items[index].pagemap.hcard[0].fn == name) {
                    console.log('match');
                    var fname = response.items[index].pagemap.hcard[0].fn.substr(0,response.items[index].pagemap.hcard[0].fn.indexOf(' '));
                    var lname = response.items[index].pagemap.hcard[0].fn.substr(response.items[index].pagemap.hcard[0].fn.indexOf(' ')+1);

                    found = true;

                    app.models.External.update({
                        fname: external.fname,
                        lname: external.lname
                    }, {
                        pictureURL: response.items[index].pagemap.hcard[0].photo,
                        //Date gets saved in UTC (one hour off)
                        last_edited: Date.now(),
                        ttl: 1209600
                    }, function cb(err, obj){
                        return obj;
                    });
                } else {
                    index++;
                }
            }
        });
    }
    function searchAndInsert(fname, lname) {
        var name = fname + ' ' + lname;
        googleSearch.build({
            q : name,
            lr : 'lang_nl'
        }, function(error, response) {
            var found = false;
            var index = 0;
            while (index < 10 && !found) {
                if (response.items[index].pagemap.hcard[0].fn == name) {
                    var fname = response.items[index].pagemap.hcard[0].fn.substr(0,response.items[index].pagemap.hcard[0].fn.indexOf(' '));
                    var lname = response.items[index].pagemap.hcard[0].fn.substr(response.items[index].pagemap.hcard[0].fn.indexOf(' ')+1);

                    found = true;

                    var external = new External({
                        fname: fname,
                        lname: lname,
                        pictureURL: response.items[index].pagemap.hcard[0].photo,
                        //Date get's saved in UTC (one hour off)
                        last_edited: Date.now(),
                    });

                    app.models.External.upsert(external, function cb(err, obj){
                        return obj;
                    });

                } else {
                    index++;
                }
            }
        });
    }
};
