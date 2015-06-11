'use strict';
/* jshint node:true */
/* global module, process, console, require */

var stringify = require('safe-json-stringify'),
    chalk     = require('chalk');

/**
 * Checks whether the thing is undefined
 * @param {Object} thing the thing to check
 * @public
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
 * @public
 */
var isEmpty = function _isEmpty(someString) {
  return !!(isNullOrUndefined(someString) || someString.length === 0);
};


/**
 * Returns true if it receives true or 'true'
 * @param {String|Boolean} strOrBool
 * @returns {boolean}
 * @public
 */
var isStrOrBoolTrue = function _isStrOrBoolTrue(strOrBool) {
  return '' + strOrBool === 'true';
};

/**
 * Creates file if it doesn't exist
 * Won't even touch it if it exists
 * @param {String} filePath full file path
 * @param {Number} mode acl mode number (decimal)
 * @public
 */
var maybeCreateFileSync = function _maybeCreateFileSync(filePath, mode) {
  touch.sync(filePath, {atime: true, mtime: true, force: true});
  fs.chmodSync(filePath, mode);
};


/**
 * stringify that won't blow into your face
 * @param {String} json
 * @returns {String} {*}
 * @public
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
 * @public
 */
var isNull = function _isNull(arg) {
  return arg === null;
}


/**
 * Type casting double equals has a single good use
 * @param {Object} arg
 * @returns {Boolean}
 * @public
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
 * with varargs support
 * @public
 */
var out = {

  error: function _error() {
    var collect = '';
    for (var i = 0; i < arguments.length; i++) {
      collect += colors.error(arguments[i]);
    }
    console.error(collect);
  },

  warn: function _warn() {
    var collect = '';
    for (var i = 0; i < arguments.length; i++) {
      collect += colors.warn(arguments[i]);
    }
    console.warn(collect);
  },

  info: function _info() {
    var collect = '';
    for (var i = 0; i < arguments.length; i++) {
      collect += colors.info(arguments[i]);
    }
    console.log(collect);
  },

  trace: function _noOp() {},  // disabled by default

  origTrace: function _trace() {
    var collect = '';
    for (var i = 0; i < arguments.length; i++) {
      collect += colors.trace(arguments[i]);
    }
    console.log(collect);
  }

};


/**
 * Enables or disables trace logging
 * @param {Boolean|String} enable (true enables, false disables)
 * @public
 */
function enableTrace(enable) {
  if (isStrOrBoolTrue(enable)) {
    out.trace = out.origTrace;
    //console.log('trace set back to original');
  } else {
    out.trace = function _noOp(){};
    //console.log('trace set to noOp');
  }
}


/**
 * Displays warning and command help and then exits the program
 * @param {String} msg
 * @param {Object} that
 * @public
 */
var warnAndExit = function _warnAndExit(msg, that) {
  out.warn(msg + '\n\n');
  out.info(that.help());
  process.exit(1);
};

module.exports = {
  isDef:                isDef,
  isEmpty:              isEmpty,
  isStrOrBoolTrue:      isStrOrBoolTrue,
  maybeCreateFileSync:  maybeCreateFileSync,
  safeJsonStringify:    safeJsonStringify,
  isNull:               isNull,
  isNullOrUndefined:    isNullOrUndefined,
  out:                  out,
  warnAndExit:          warnAndExit,
  enableTrace:          enableTrace,
  argv:                 require('minimist')(process.argv.slice(2))
};
