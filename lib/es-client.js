/* Extract this API later in a separate public package */

/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence Logsene CLI is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */

/* jshint node:true */
/* global module, process, console, require */
'use strict';

var jsonist         = require('jsonist'),
    esearch         = require('elasticsearch'),
    ReadableSearch  = require('elasticsearch-streams').ReadableSearch;


function ES(opts) {
  var $this = this;
  this.esHost = opts.host || process.env.ES_HOST;

  this.initEs = function _initEs(logLevel) {
    //console.log('logLevel received: ' + logLevel);
    $this.es = new esearch.Client({
      hosts: opts.hosts || this.esHost,
      host: $this.esHost,
      log: logLevel || 'error',
      sniffOnStart: opts.sniffOnStart || true
    });
  };

  this.initEs(opts.logLevel);

}



/**
 * Sends search query to ES
 * Resulting stream is returned in cb's second param
 * First param is err
 * Returns {Stream}
 *
 * @param {Object} opts search options (see search.js)
 * @param {Function} cb callback with err and an object stream
 * @api private
 */
ES.prototype.search = function _search(opts, cb) {

  // streams all the way down
  var offset = opts.offset;
  var limit  = opts.size;
  var page   = 50;

  if (!es || opts.logLevel === 'trace') {
    initEs(opts.logLevel);  // otherwise keep the initialization from the top as is
  }

  var searchExec = function _searchExec(from, esCb) {
    es.search({
      index: opts.appKey,
      q: opts.q,
      from: from + offset,
      size: (offset + from + page) > limit ? (limit - offset - from) : page
    }, esCb);
  };

  var rs = new ReadableSearch(searchExec);

  cb(null, rs);

};


module.exports = ES;
