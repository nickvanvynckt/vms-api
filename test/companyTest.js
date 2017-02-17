'use strict';

var supertest = require('supertest');
var should = require('should');

var server = supertest.agent('http://localhost:3000');

console.log('this is second');
