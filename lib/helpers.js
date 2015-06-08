'use strict';
/* jshint node:true */
/* global module, process, console, require */

var stringify = require('safe-json-stringify'),
    chalk     = require('chalk');

/**
 * Checks whether the thing is undefined
 * @param {Object} thing the thing to check
 * @private
 */
var isDef = function _isDef(thing) {
  try {
    if (thing === void 0) return false;
  } catch (e) {
    return false;  // catch undefined with nested object errors
  }
  return true;
};

/**
 * Check whether string has contents
 * Intentinally using doubleequals to check both undefined and null
 * @param {String} someString full file path
 * @private
 */
var isEmpty = function _isEmpty(someString) {
  if (isNullOrUndefined(someString) || someString.length === 0) return true;
  return false;
};

/**
 * Creates file if it doesn't exist
 * Won't even touch it if it exists
 * @param {String} filePath full file path
 * @param {Number} mode acl mode number (decimal)
 * @private
 */
var maybeCreateFileSync = function _maybeCreateFileSync(filePath, mode) {
  touch.sync(filePath, {atime: true, mtime: true, force: true});
  fs.chmodSync(filePath, mode);
}


/**
 * stringify that won't blow into your face
 * @param {String} json
 * @returns {String} {*}
 * @private
 */
var safeJsonStringify = function _safeJsonStringify(json) {
  var str;
  try {
    str = JSON.stringify(json) + '\n';
  } catch (e) {
    str = stringify(json) + '\n';
  }
  return str;
};


/**
 * Cool
 * @param {Object} arg
 * @returns {Boolean}
 */
var isNull = function _isNull(arg) {
  return arg === null;
}


/**
 * Type casting double equals has a single good use
 * @param {Object} arg
 * @returns {Boolean}
 */
var isNullOrUndefined = function _isNullOrUndefined(arg) {
  try {
    return arg == null;
  } catch (e) {
    return true;
  }
};


/**
 * Used to color console output
 * @private
 */
var colors = {
  error: chalk.bold.red,
  warn:  chalk.bold.yellow,
  info:  chalk.bold.green,
  trace: chalk.black
};


/**
 * Easily display different types of messages to the CLI
 * @public
 */
var out = {
  error: function _error(strings) {
    console.error(colors.error(strings));
  },
  warn: function _warn(strings) {
    console.warn(colors.warn(strings));
  },
  info: function _info(strings) {
    console.log(colors.info(strings));
  },
  trace: function _trace(strings) {
    console.log(colors.trace(strings));
  }
};


/**
 * Displays warning and command help and then exits the program
 * @param {String} msg
 * @param {Object} that
 * @public
 */
var warnAndExit = function _warnAndExit(msg, that) {
  console.warn(out.warn(msg + '\n\n'));
  console.log(that.help());
  process.exit(1);
};

module.exports = {
  isDef:                isDef,
  isEmpty:              isEmpty,
  maybeCreateFileSync:  maybeCreateFileSync,
  safeJsonStringify:    safeJsonStringify,
  isNull:               isNull,
  isNullOrUndefined:    isNullOrUndefined,
  out:                  out,
  warnAndExit:          warnAndExit
};
