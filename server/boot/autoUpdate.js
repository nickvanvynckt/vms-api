'use strict';

module.exports = function autoMigrate(app) {
    app.datasources.mongoDB.autoupdate('company', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.autoupdate('employee', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.autoupdate('external', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.autoupdate('location', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.autoupdate('meeting', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.autoupdate('note', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.autoupdate('project', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.autoupdate('UserIdentity', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.autoupdate('AccessToken', function(err){
        if(err)
            console.log(err);
    });
};
