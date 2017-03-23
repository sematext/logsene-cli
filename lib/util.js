'use strict'
/* jshint node:true */
/* global module, process, console, require */

var stringify = require('safe-json-stringify')
var intersect = require('lodash.intersection')
var toCamelCase = require('camel-case')
var chalk = require('chalk')

/**
 * Checks whether the thing is undefined
 * @param {Object} thing the thing to check
 * @public
 */
var isDef = function _isDef (thing) {
  try {
    if (thing === void 0) return false
  } catch (e) {
    return false // catch undefined with nested object errors
  }
  return true
}

/**
 * Check whether string has contents
 * Intentinally using doubleequals to check both undefined and null
 * @param {String} someString full file path
 * @public
 */
var isEmpty = function _isEmpty (someString) {
  return !!(isNullOrUndefined(someString) || someString.length === 0)
}

/**
 * Returns true if it receives true or 'true'
 * @param {String|Boolean} strOrBool
 * @returns {boolean}
 * @public
 */
var isStrOrBoolTrue = function _isStrOrBoolTrue (strOrBool) {
  if (!strOrBool) return false
  return ('' + strOrBool).toLowerCase() === 'true'
}

/**
 * stringify that won't blow up into your face
 * @param {String} json
 * @returns {String} {*}
 * @public
 */
var safeJsonStringify = function _safeJsonStringify (json) {
  var str
  try {
    str = JSON.stringify(json) + '\n'
  } catch (e) {
    str = stringify(json) + '\n'
  }
  return str
}

/**
 * Cool null
 * @param {Object} arg
 * @returns {Boolean}
 * @public
 */
var isNull = function _isNull (arg) {
  return arg === null
}

/**
 * Type casting of double equals has a single good use
 * @param {Object} arg
 * @returns {Boolean}
 * @public
 */
var isNullOrUndefined = function _isNullOrUndefined (arg) {
  try {
    return arg == null // checks both null and undefined
  } catch (e) {
    return true
  }
}

/**
 * Safely convert object to string
 * @param {Object} o
 * @returns {string}
 * @private
 */
var objToStr = function _objToStr (o) {
  return Object.prototype.toString.call(o)
}

/**
 * Real object?
 * @param o Supposable object
 * @returns {boolean}
 * @public
 */
var isObject = function _isObject (o) {
  return typeof o === 'object' && o !== null
}

/**
 * Converts camel case string to dash case
 * @param camelStr camelCaseString
 * @returns {String} dash-case-string
 * @public
 */
var camelToDashCase = function _camelToDashCase (camelStr) {
  return camelStr.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Returns whateverStringFormatToCamelCase
 * @param str
 * @returns {*|exports|module.exports}
 * @private
 */
var camelCase = function _camelCase (str) {
  return toCamelCase(str)
}

/**
 * Returns number of common elements in 2 arrays
 * @param arr1
 * @param arr2
 * @returns {Number} number of common elements
 * @public
 */
var intersectionCount = function _intersectionCount (arr1, arr2) {
  return intersect(arr1, arr2).length
}

/**
 * Returns whether there are common elements in 2 arrays
 * @param arr1
 * @param arr2
 * @returns {Boolean}
 * @public
 */
var intersectable = function _intersectable (arr1, arr2) {
  return intersectionCount(arr1, arr2) > 0
}

/**
 * Really?
 * @param str
 * @returns {string}
 * @public
 */
var wrapInQuotes = function _wrapInQuotes (str) {
  var q = str.substr(0, 1)
  var quoted = q === '"' || q === "'"
  var quote = quoted ? '' : '"'
  return quote + str + quote
}

/**
 * Used to color console output
 * @private
 */
var colors = {
  error: chalk.bold.red,
  warn: chalk.bold.yellow,
  info: chalk.bold.green,
  trace: chalk.black
}

/**
 * Easily display different types of messages to the CLI
 * with varargs support
 * @public
 */
var out = {
  error: function _error () {
    var collect = ''
    for (var i = 0; i < arguments.length; i++) {
      collect += colors.error(arguments[i])
    }
    console.error(collect)
  },

  warn: function _warn () {
    var collect = ''
    for (var i = 0; i < arguments.length; i++) {
      collect += colors.warn(arguments[i])
    }
    console.warn(collect)
  },

  info: function _info () {
    var collect = ''
    for (var i = 0; i < arguments.length; i++) {
      collect += colors.info(arguments[i])
    }
    console.log(collect)
  },

  trace: function _noOp () {}, // disabled by default

  origTrace: function _trace () {
    var collect = ''
    for (var i = 0; i < arguments.length; i++) {
      collect += colors.trace(arguments[i])
    }
    console.log(collect)
  }

}

/**
 * Enables or disables trace logging
 * @param {Boolean|String} enable (true enables, false disables)
 * @public
 */
function enableTrace (enable) {
  if (isStrOrBoolTrue(enable)) {
    out.trace = out.origTrace
  } else {
    out.trace = function _noOp () {}
  }
}

/**
 * Displays warning and command help and then exits the program
 * @param {String} msg
 * @param {Object} that
 * @public
 */
var warnAndExit = function _warnAndExit (msg, that) {
  out.warn(msg + '\n\n')
  out.info(that.help())
  process.exit(1)
}

module.exports = {
  isDef: isDef,
  isEmpty: isEmpty,
  isStrOrBoolTrue: isStrOrBoolTrue,
  safeJsonStringify: safeJsonStringify,
  isNull: isNull,
  isNullOrUndefined: isNullOrUndefined,
  isObject: isObject,
  objToStr: objToStr,
  camelToDashCase: camelToDashCase,
  camelCase: camelCase,
  intersectable: intersectable,
  intersectionCount: intersectionCount,
  wrapInQuotes: wrapInQuotes,
  out: out,
  colors: colors,
  warnAndExit: warnAndExit,
  enableTrace: enableTrace,
  argv: require('minimist')(process.argv)
}

