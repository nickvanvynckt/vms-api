'use strict';

var GoogleCalendar = require('google-calendar');
var refresh = require('passport-oauth2-refresh');

module.exports = function (Employee) {

    function refreshToken(UserIdentity, token, id, cb) {
        refresh.requestNewAccessToken('google', token, function (err, accessToken, refreshToken) {
            if (refreshToken === null || refreshToken === undefined) {
                refreshToken = token;
            }
            UserIdentity.upsertWithWhere({ and: [{ employeeId: id }, { provider: 'google-login' }] }, { credentials: { accessToken: accessToken, refreshToken: refreshToken } }, function (err, obj) {
                cb(accessToken);
            });
        });
    }

    Employee.getMeetings = function (name, cb) {
        var resp;
        const app = this.app;
        const UserIdentity = this.app.models.UserIdentity;

        Employee.findOne({ where: { or: [{ username: name }, { email: name }] } }, function (err, emp) {
            if (err !== null) {
                cb(err);
            } else if (emp !== null) {
                var id = emp.id;
                var calendarIds = emp.calendars;

                if (calendarIds === undefined || calendarIds.length === 0) {
                    cb("No calendars selected.");
                } else {
                    UserIdentity.findOne({ where: { and: [{ employeeId: id }, { provider: 'google-login' }] } }, function (err, ui) {
                        refreshToken(UserIdentity, ui.credentials.refreshToken, id, function (accessToken) {
                            var errs = [];
                            var meetings = [];
                            var loopDone = 0;

                            for (var i = 0; i < calendarIds.length; i++) {
                                getMeetingsById(app, accessToken, calendarIds[i], function (data) {
                                    if (data.err !== null) {
                                        errs.push(data.err);
                                    } else {
                                        meetings = meetings.concat(data.list);
                                    }
                                    loopDone++;
                                    if (loopDone === calendarIds.length) {
                                        if (errs.length > 0) {
                                            cb(errs);
                                        } else {
                                            cb(null, meetings);
                                        }
                                    }
                                });
                            }
                        });
                    });
                }
            } else {
                cb("Unable to find user in database.");
            }
        });
    }

    Employee.getMeetingsByCalendarId = function (name, calendarId, cb) {
        var resp;
        const app = this.app;
        const UserIdentity = this.app.models.UserIdentity;

        Employee.findOne({ where: { or: [{ username: name }, { email: name }] } }, function (err, emp) {
            if (err !== null) {
                cb(err);
            } else if (emp !== null) {
                var id = emp.id;
                UserIdentity.findOne({ where: { and: [{ employeeId: id }, { provider: 'google-login' }] } }, function (err, ui) {
                    refreshToken(UserIdentity, ui.credentials.refreshToken, id, function (accessToken) {
                        getMeetingsById(app, accessToken, calendarId, function (data) {
                            if (data.err !== null) {
                                cb(data.err);
                            } else {
                                cb(null, data.list);
                            }
                        });
                    });
                });
            } else {
                cb("Unable to find user in database.");
            }
        });
    }

    Employee.getCalendars = function (name, cb) {
        var resp;
        const UserIdentity = this.app.models.UserIdentity;

        Employee.findOne({ where: { or: [{ username: name }, { email: name }] } }, function (err, emp) {
            if (err !== null) {
                cb(err);
            } else if (emp !== null) {
                var id = emp.id;

                console.log(id);
                
                UserIdentity.findOne({ where: { and: [{ employeeId: id }, { provider: 'google-login' }] } }, function (err, ui) {

                    refreshToken(UserIdentity, ui.credentials.refreshToken, id, function (accessToken) {
                        var googleCalendar = new GoogleCalendar(accessToken);

                        googleCalendar.calendarList.list(function (err, calendarList) {
                            if (err !== null) {
                                cb(err);
                            } else {
                                cb(null, calendarList.items);
                            }
                        });
                    });
                });
            } else {
                cb("Unable to find user in database.");
            }
        });
    }

    function getMeetingsById(app, token, id, cb) {
        var googleCalendar = new GoogleCalendar(token);
        var data = { err: "Unable to get meetings for calendar with id " + id, list: null };
        var oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        var nextTwoWeeks = new Date();
        nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);

        googleCalendar.events.list(id, { timeMin: oneWeekAgo.toISOString(), timeMax: nextTwoWeeks.toISOString() }, function (err, eventsList) {
            if (err !== null) {
                data = { err: err, list: null };
                cb(data);
            } else if (eventsList !== null && eventsList.items.length > 0) {
                addToMeetings(app, eventsList.items, cb);
            } else {
                cb({ err: null, list: [] });
            }
        });
    }

    function addToMeetings(app, list, cb) {
        const Meeting = app.models.Meeting;
        var loopDone = 0;
        var errs = [];
        var returnList = [];
        var cbCalled = false;

        for (let i = 0; i < list.length; i++) {
            seperateAttendees(app, list[i].attendees, function (data) {
                //WHOLE DAY EVENTS ARE SKIPPED
                if (list[i].start.dateTime !== undefined && list[i].end.dateTime !== undefined) {
                    Meeting.upsertWithWhere({ externalId: list[i].id },
                        {
                            externalId: list[i].id,
                            summary: list[i].summary,
                            room: list[i].location,
                            start: list[i].start.dateTime,
                            end: list[i].end.dateTime,
                        }, function (err, obj) {
                            if (err !== null) {
                                errs.push(err);
                                loopDone++;
                            } else {
                                var obj1 = JSON.parse(JSON.stringify(obj));
                                obj1.meetees = data.employees;
                                obj1.externals = data.externals;
                                returnList.push(obj1);
                                addEmployeesToMeeting(obj, data.employees, function () {
                                    addExternalsToMeeting(obj, data.externals, function () {
                                        loopDone++;
                                        if (loopDone === list.length) {
                                            if (errs.length > 0) {
                                                cbCalled = true;
                                                cb({ err: errs, list: null });
                                            } else {
                                                cbCalled = true;
                                                cb({ err: null, list: returnList });
                                            }
                                        }
                                    });
                                });
                            }
                        });
                } else {
                    loopDone++;
                }
                if (loopDone === list.length && !cbCalled) {
                    if (errs.length > 0) {
                        cbCalled = true;
                        cb({ err: errs, list: null });
                    } else {
                        cbCalled = true;
                        cb({ err: null, list: returnList });
                    }
                }
            });
        }
    }

    function seperateAttendees(app, attendees, cb) {
        var UserIdentity = app.models.UserIdentity;
        var External = app.models.External;
        var Employee = app.models.Employee;
        var loopDone = 0;
        var employees = [];
        var externals = [];
        var errs = [];

        for (let i = 0; attendees !== null && attendees !== undefined && i < attendees.length; i++) {
            UserIdentity.findOne({ where: { and: [{ email: attendees[i].email }, { provider: 'google-login' }] } }, function (err, obj) {
                if (err !== null) {
                    errs.push(err);
                    loopDone++;
                } else if (obj !== null) {
                    Employee.findOne({ where: { id: obj.employeeId } }, function (err, obj) {
                        employees.push(obj);
                        loopDone++;
                        if (loopDone === attendees.length) {
                            if (errs.length > 0) {
                                cb({ err: errs, employees: null, externals: null });
                            } else {
                                cb({ err: null, employees: employees, externals: externals });
                            }
                        }
                    })
                } else {
                    External.getInformation(attendees[i].displayName.substr(0, attendees[i].displayName.indexOf(' ')), attendees[i].displayName.substr(attendees[i].displayName.indexOf(' ') + 1), function (err, obj) {
                        externals.push(obj);
                        loopDone++;
                        if (loopDone === attendees.length) {
                            if (errs.length > 0) {
                                cb({ err: errs, employees: null, externals: null });
                            } else {
                                cb({ err: null, employees: employees, externals: externals });
                            }
                        }
                    });
                }
                if (loopDone === attendees.length) {
                    if (errs.length > 0) {
                        cb({ err: errs, employees: null, externals: null });
                    } else {
                        cb({ err: null, employees: employees, externals: externals });
                    }
                }
            });
        }

        if (attendees === null || attendees === undefined) {
            cb({ err: null, employees: [], externals: [] });
        }
    }

    function addEmployeesToMeeting(meeting, employees, cb) {
        var loopDone = 0;
        if (employees.length === 0) {
            cb();
        }
        for (var i = 0; i < employees.length; i++) {
            meeting.meetees.add(employees[i].id, function (err) {
                loopDone++;
                if (loopDone === employees.length) {
                    cb();
                }
            });
        }
    }

    function addExternalsToMeeting(meeting, externals, cb) {
        var loopDone = 0;
        if (externals.length === 0) {
            cb();
        }
        for (var i = 0; i < externals.length; i++) {
            meeting.externals.add(externals[i].id, function (err) {
                loopDone++;
                if (loopDone === externals.length) {
                    cb();
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
            arg: 'name',
            type: 'string'
        },
        returns: {
            arg: 'meetings',
            type: 'array'
        },
        description: 'Get all meetings from all calendars by username or email of the employee.'
    });

    Employee.remoteMethod('getMeetingsByCalendarId', {
        http: {
            path: '/getMeetingsByCalendarId',
            verb: 'get'
        },
        accepts: [
            {
                arg: 'name',
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
        },
        description: 'Get all meetings from a given calendar by username or email of the employee.'
    });

    Employee.remoteMethod('getCalendars', {
        http: {
            path: '/getCalendars',
            verb: 'get'
        },
        accepts: {
            arg: 'name',
            type: 'string'
        },
        returns: {
            arg: 'calendars',
            type: 'array'
        },
        description: 'Get information about the calendars by username or email of the employee.'
    });

    Employee.afterRemoteError("create", function (ctx, next) {
        ctx.error.message = (ctx.error.message.substr(ctx.error.message.indexOf("Details:"))).substr(9);
        next();
    });
};
