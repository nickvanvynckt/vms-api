'use strict';

module.exports = function(Note) {
    Note.information = function(id, cb){
        console.log(id);
        Note.findById(id, { include: ['author']}, function(err, note){
            if(err)
                cb(err);
            console.log(note);
            cb(null, note);
        });
    }

    Note.remoteMethod('information', {
        http: {
            path: '/information',
            verb: 'get'
        },
        accepts: {
            arg: 'id',
            type: 'string'
        },
        returns: {
            arg: 'note',
            type: 'any'
        },
        description: 'Returns notes with author information. Expects a note id.'
    });
};
