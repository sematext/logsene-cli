/* Extract this API later in a separate public package */

/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */

/* jshint node:true */
/* global module, process, console, require */
'use strict';

var jsonist         = require('jsonist'),
    hyperquest      = require('hyperquest'),
    esearch         = require('elasticsearch'),
    ReadableSearch  = require('elasticsearch-streams').ReadableSearch,
    JSONStream      = require('JSONStream'),
    VError          = require('verror'),
    inspect         = require('eyespect').inspector(),
    isDef           = require('./helpers').isDef,
    isEmpty         = require('./helpers').isEmpty;


// TODO add application listing to api
// TODO add reset password to api
// test: logseneUri = "https://logsene-receiver.sematext.com/cc5e9c1b-3046-4e43-998e-2a0b2c01b912_2015-05-25%2Ccc5e9c1b-3046-4e43-998e-2a0b2c01b912_2015-05-26%2Ccc5e9c1b-3046-4e43-998e-2a0b2c01b912_2015-05-27%2Ccc5e9c1b-3046-4e43-998e-2a0b2c01b912_free/_search?from=0&size=20&version=true&ignore_unavailable=true";

var logseneEsHost = 'logsene-receiver.sematext.com',
    logseneUri = 'https://apps.sematext.com/users-web/api/v2',
    es,
    initEs = function() {
      es = new esearch.Client({
        host: logseneEsHost,
        log: 'error'
      });
    };

initEs();  // do it here so it's ready (not much overhead)

module.exports = {

    // add application listing to api
    // add reset password to api


  /**
   * Retrieves api-key of the user whose
   * username and password are provided as params
   *
   * @param {String} uri Logsene endpoint
   * @param {String} user Logsene account username
   * @param {String} pass Logsene account password
   * @param {Function} cb called upon completion
   * @api public
   */
  login: function _login(user, pass, cb) {
    if (isEmpty(user) || isEmpty(pass)) {
      return cb(new VError('No username or password!'));
    }

    var endpoint = logseneUri + '/account/login',

    opts = {
      method: "POST",
      json: true
    },

    data = {
      'username': user,
      'password': pass
    },

    fn = function (err, body, res) {
      if (err) return cb(new VError(err, 'Error while performing login.'));

      if (isDef(res) && res.statusCode == 200) {  // are we good?
        if (isDef(body.data.apiKey)) {

          return cb(null, body.data.apiKey);

        } else {
          return cb(new Error('No apiKey in reponse'));
        }
      } else {

        if (isDef(res)) {  // we got something back, but not 200
          inspect(res.headers);  // TODO clean
          inspect(res.body);     // TODO clean
          return cb(new Error('Something is weird with HTTP status code: ' + res.statusCode));

        } else {  // we didn't get response at all
          return cb('Something went wrong. No response from the API server.');
          //process.exit(1);  // bail out but don't yell
        }
      }
    };

    jsonist.post(endpoint, data, opts, fn);

    /*
    request({
      method: "POST",
      uri: uri,
      json: true,
      body: {'username': user, 'password': pass}
    }, function (errReq, res, body) {
      if (isDef(res) && res.statusCode == 200) {  // are we good?

     if (isDef(body.data.apiKey)) cb('');

     cb(body.data.apiKey);

      } else {
        if (res == undefined) {  // we're not good
          console.log("Something went wrong: ", errReq);
          process.exit(1);
        } else {  // not 200
          inspect(res.headers);  // TODO clean
          inspect(res.body);     // TODO clean
          throw Error('Something went wrong: HTTP status code: ' + res.statusCode);
        }
      }
    });*/
  },



  /**
   * Retrieves list of Logsene applications
   * that correspond to the provided api-key
   *
   * @param {String} apiKey user account api-key
   * @param {Function} cb(err, data)
   * @api public
   */
  getApps: function _getApps(apiKey, cb) {
    if(isEmpty(apiKey)) {
      return cb(new Error('API key was not supplied.'));
    }

    var endpoint = logseneUri + '/app/list',

    opts = {
      method: "POST",
      json: true
    },

    data = {
      'apiKey': apiKey
    },

    fn = function (err, body, res) {
      if (err) return cb(new VError(err, 'Error while getting Logsene application list.'));

      if (isDef(res) && res.statusCode == 200 && body.success) {  // are we good?
        if (isDef(body.data.apps.logsene)) {
          inspect(body);          // TODO clean
          return cb(null, body.data.apps.logsene);

        } else {
          return cb(new Error('Could not get application list. No Logsene apps available.'));
        }

      } else {

        if (isDef(res)) {  // we got something back, but not 200
          inspect(res.headers);  // TODO clean
          inspect(res.body);     // TODO clean
          return cb(new Error('Something is weird with HTTP status code: ' + res.statusCode));

        } else {  // we didn't get response at all
          return cb(new Error('Something went wrong. No response from the API server.'));
          // process.exit(1);  // bail out but don't yell

        }
      }
    };

    /*var r = hyperquest.post(endpoint, data);
    cb(null, r);*/

    //r.pipe(process.stdout, {end: false});
    //r.on('end', function() {
    //  if (--pending === 0) server.close();
    //});
    jsonist.post(endpoint, data, opts, fn);

  },



  /**
   * Sends search query to Logsene
   * Results are returned in cb's second param
   * First param is err
   * Returns JSON
   *
   * @param {Array} opts search options (see search.js)
   * @param {Function} cb callback with err and a stream of hits
   * @api private
   */
  search: function _search(opts, cb) {


/*
    // returns a promise
    es.search({
      q: opts.q,
      index: opts.appKey/!*,
      ignore: [404]*!/
    }).then(function(searchRes) {
      console.log('in then', JSON.stringify(searchRes));
      cb(null, searchRes.hits);

    }, function (searchErr) {
      console.log('in searchErr', searchErr);
      return cb(new VError(searchErr, 'Search request did not succeed!'));

    });
*/


// streams all the way down
/*
    var ReadableSearch = require('elasticsearch-streams').ReadableSearch;

    var searchExec = function searchExec(/!*from,*!/ callback) {
      es.search({
        index: opts.apiKey,
        q: opts.q,
        //from: from,
        size: opts.size
      }, callback);
    };

    var rs = new ReadableSearch(searchExec);
    cb(null, rs);
*/




    var offset = opts.offset;
    var limit  = opts.size;
    var page   = 50;

    //var client = new require('elasticsearch').Client();
    var searchExec = function searchExec(from, esCb) {
      es.search({
        index: opts.apiKey,
        q: opts.q,
        //from: from,
        //size: 2 //opts.size
        //body: { query: opts.q }
        from: from + offset,
        size: (offset + from + page) > limit ? (limit - offset - from) : page
      }, esCb);
    };

    var rs = new ReadableSearch(searchExec);

    /*var ws = new require('stream').Writable({objectMode:true});
    ws._write = function(chunk, enc, next) {
      console.log('a hit', JSON.stringify(chunk));
      next();
    };

    rs.pipe(ws).on('close', cb);*/

    rs.pipe(JSONStream.stringify(false))
        .pipe(process.stdout)
        .on('close', function() {
      process.exit(0);
    });





    /*    var ws = new require('stream').Writable({objectMode:true});
        ws._write = function(chunk, enc, next) {
          console.log('a hit', JSON.stringify(hit));
          next();
        };

        rs.pipe(ws).on('close', cb);*/


    /* using plain request (without ES)
    request(options, function(err, res, body) {
      if (!err && res.statusCode == 200) {  // are we good?
        cb(null, body);
      } else {
        if (res == undefined) {  // we're not good
          console.log("Something went wrong: ", err);
        } else {
          console.log("Something went wrong: HTTP status code: " + res.statusCode);
        }
      }
    });
    */

  },


  // TODO later
/*
  streamLogEvents: function _streamLogEvents(args, cb) {
    var url = args.hostUrl + "log-stream/" + args.streamId;

    request({uri: url, json: true}, function(err, response, body) {
      if (!err && response.statusCode == 200) {  // we're good
        cb(body)
      } else {
        if (response == undefined) {  // we're not good
          console.log("Something went wrong: Unable to get the log stream!", err)
        } else {
          console.log("Something went wrong: Unable to get the log stream. HTTP error code " + response.statusCode)
        }
      }
    })
  }
*/

};
