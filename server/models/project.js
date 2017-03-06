'use strict';

module.exports = function(Project) {
    Project.information = function(id, cb){
        Project.findById(id, { include: [{meetings: [{notes:['author']}]}]}, function(err, project){
            if(err)
                console.log(err);
            cb(null, project);
        });
    }
    Project.remoteMethod('information', {
        http: {
            path: '/:id/information',
            verb: 'get'
        },
        accepts: {
            arg: 'id',
            type: 'string'
        },
        returns: {
            arg: 'project',
            type: 'any'
        },
        description: 'Returns projects with meetings with notes with author information. Expects a note id.'
    });
};
