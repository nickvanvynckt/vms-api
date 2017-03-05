'use strict';

module.exports = function(Meeting) {

    Meeting.getAll = function(cb) {
        Meeting.find({ include: ['meetees', 'externals'] }, function(err, list) {
            if (err !== null) {
                cb(err);
            } else {
                cb(null, list);
            }
        });
    }

    Meeting.remoteMethod('getAll', {
        http: {
            path: '/all',
            verb: 'get'
        },
        returns: {
            arg: 'meetings',
            type: 'array'
        },
        description: 'Returns all meetings in the database.'
    });

};