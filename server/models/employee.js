'use strict';

var GoogleCalendar = require('google-calendar');

module.exports = function(Employee) {

    Employee.getMeetings = function(name, cb) {
        var resp;
        const app = this.app;
        const UserIdentity = this.app.models.UserIdentity;

        Employee.findOne({where: {username:name} }, function(err, emp) {
            if (err !== null) {
                cb(err);
            } else if (emp !== null) {
                var id = emp.id;
                var calendarIds = emp.calendars;

                if(calendarIds.length === 0) {
                    cb("No calendars selected.");
                } else {
                    UserIdentity.findOne({where:{and:[{employeeId:id}, {provider:'google-login'}]}}, function(err, ui) {
                    var accessToken = ui.credentials.accessToken;
                    var errs = [];
                    var meetings = [];
                    var loopDone = 0;

                    for(var i = 0; i < calendarIds.length; i++) {
                        getMeetingsById(app, accessToken, calendarIds[i], function(data) {
                            if(data.err !== null) {
                                errs.push(data.err);
                            } else {
                                meetings = meetings.concat(data.list);
                            }
                            loopDone++;
                            if(loopDone === calendarIds.length) {
                                if(errs.length > 0) {
                                    cb(errs);
                                } else {
                                    cb(null, meetings);
                                }
                            }
                        });
                    }
                });
                }
            } else {
                cb("Unable to find user in database.");
            }
        });        
    }

    Employee.getMeetingsByCalendarId = function(name, calendarId, cb) {
        var resp;
        const app = this.app;
        const UserIdentity = this.app.models.UserIdentity;

        Employee.findOne({where: {username:name} }, function(err, emp) {
            if (err !== null) {
                cb(err);
            } else if (emp !== null) {
                var id = emp.id;

                UserIdentity.findOne({where:{and:[{employeeId:id}, {provider:'google-login'}]}}, function(err, ui) {
                    var accessToken = ui.credentials.accessToken;
                    getMeetingsById(app, accessToken, calendarId, function(data){
                        if(data.err !== null) {
                            cb(data.err);
                        } else {
                            cb(null, data.list);
                        }
                    });
                });
            } else {
                cb("Unable to find user in database.");
            }
        });
    }

    Employee.getCalendars = function(name, cb) {
        var resp;
        const UserIdentity = this.app.models.UserIdentity;

        Employee.findOne({where: {username:name} }, function(err, emp) {
            if (err !== null) {
                cb(err);
            } else if (emp !== null) {
                var id = emp.id;

                UserIdentity.findOne({where:{and:[{employeeId:id}, {provider:'google-login'}]}}, function(err, ui) {
                    var accessToken = ui.credentials.accessToken;

                    var googleCalendar = new GoogleCalendar(accessToken);

                    googleCalendar.calendarList.list(function(err, calendarList) {
                        if(err !== null) {
                            cb(err);
                        } else {
                            cb(null, calendarList.items);
                        }
                    });
                });
            } else {
                cb("Unable to find user in database.");
            }
        });
    }

    function getMeetingsById(app, token, id, cb) {
        var googleCalendar = new GoogleCalendar(token);
        var data = {err: "Unable to get meetings for calendar with id " + id, list:null};
        var oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        var nextTwoWeeks = new Date();
        nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);

        googleCalendar.events.list(id, {timeMin:oneWeekAgo.toISOString(), timeMax:nextTwoWeeks.toISOString()}, function(err, eventsList) {
            if(err !== null) {
                data = {err:err, list:null};
                cb(data);
            } else if(eventsList !== null) {
                cb({err:null, list:eventsList.items});
                //addToMeetings(app, eventsList, cb);
            }
        });
    }

    function addToMeetings(app, list, cb) {
        const Meeting = app.models.Meeting;
        var loopDone = 0;
        var errs = [];
        var returnList = [];

        for(var i = 0; i < list.length; i++) {
            Meeting.upsert({
                room:list[i]
            }, function(err, obj) {
                if(err !== null) {
                    errs.push(err);
                } else {
                    returnList.push(obj);
                }
                if(loopDone === list.length) {
                    if(errs.length > 0) {
                        cb({err:errs, list:null});
                    } else {
                        cb({err:null, list:list});
                    } 
                }
            });
        }
    }

    Employee.remoteMethod('getMeetings', {
        http: {
            path: '/getMeetings',
            verb: 'get'
        },
        accepts: {
          arg: 'username',
          type: 'string'
        },
        returns: {
            arg: 'meetings',
            type: 'array'
        }
    });

    Employee.remoteMethod('getMeetingsByCalendarId', {
        http: {
            path: '/getMeetingsByCalendarId',
            verb: 'get'
        },
        accepts: [
            {
                arg: 'username',
                type: 'string'
            },
            {
                arg: 'calendarId',
                type: 'string'
            }
        ],
        returns: {
            arg: 'meetings',
            type: 'array'
        }
    });

    Employee.remoteMethod('getCalendars', {
        http: {
            path: '/getCalendars',
            verb: 'get'
        },
        accepts: {
          arg: 'username',
          type: 'string'
        },
        returns: {
            arg: 'calendars',
            type: 'array'
        }
    });
};
