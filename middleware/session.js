'use strict';
/* jshint node:true */
/* global module, process, console, require */

var //isNaN  = require('util').isNaN,
    conf    = require('../lib/config'),
    out     = require('../lib/helpers').out;


module.exports = function _session(next) {

  // here we're just extending session
  // every time user interacts with the app
  if (!isSessionExpired()) {
    extendSession();
  } else {
    // or delete the configuration and start new session
    // if the previous session has expired
    conf.deleteAllSync();
    extendSession();
  }

  setTimeout(next, 50); // back to command or the next middleware
};


/**
 * Checks whether {sessionDuration} (from config.js) amount
 * of minutes has passed since user's last interaction with the app
 *
 * @returns {Boolean}
 * @public
 */
function isSessionExpired() {
  var millisInSessionDuration = 1000 * 60 * conf.sessionDuration;
  var sessionStart = conf.getSync('sessionStart');
  var startTime = Date.parse(sessionStart);

  if (isNaN(startTime)) {
    out.trace('Session duration is not a number');  // todo trace
    return true;
  }
  out.trace('sessionStart: ' + new Date(startTime).toISOString());  // TODO trace
  return Date.now() - startTime > millisInSessionDuration;
}


/**
 * Writes now() as the new last accessed time in the configuration
 * @public
 */
function extendSession() {
  // e.g. '2015-06-11T12:28:48.888Z' (no DST)
  conf.setSync('sessionStart', (new Date).toISOString());
}
