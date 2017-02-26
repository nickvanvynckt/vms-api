'use strict';

module.exports = function autoMigrate(app) {
    app.datasources.mongoDB.automigrate('company', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.automigrate('employee', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.automigrate('external', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.automigrate('location', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.automigrate('meeting', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.automigrate('note', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.automigrate('project', function(err){
        if(err)
            console.log(err);
    });
    app.datasources.mongoDB.automigrate('UserIdentity', function(err){
        if(err)
            console.log(err);
    });
};
