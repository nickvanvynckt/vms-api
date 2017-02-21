'use strict';

var GoogleSearch = require('google-search');
var googleSearch = new GoogleSearch({
    key: 'AIzaSyAWqi1qfUyGPOTcmhE0gu-5Ik8hz8Ncjr8',
    cx: '002086392339423832635:4taepnplwtq'
});

module.exports = function(External) {
    External.getInformation = function(name, cb) {
      var resp;
      googleSearch.build({
            q: name,
            lr: 'lang_nl'
      }, function(error, response) {
          var found = false;
          var index = 0;
          while(!found && index < 10) {
            if(response.items[index].pagemap.hcard[0].fn == name){
              resp = response.items[index].pagemap.hcard[0];
              found = true;
            } else {
              console.log("Incrementing the index from: "+index);
              index++;
            }
          }
          cb(null, resp);
        });
    };
    External.remoteMethod('getInformation', {
        http: {
            path: '/getInformation',
            verb: 'get'
        },
        accepts: {
          arg: 'name',
          type: 'string'
        },
        returns: {
            arg: 'information',
            type: 'Object'
        }
    });
};
