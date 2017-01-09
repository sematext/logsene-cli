'use strict'
/* jshint node:true */
/* global module, process, console, require */
var stringify = require('safe-json-stringify')
var parseHuman = require('alien-date')
var moment = require('moment')
var intersectCnt = require('./util').intersectionCount
var objToStr = require('./util').objToStr
var isObject = require('./util').isObject
var out = require('./util').out

var durationChars = ['Y', 'y', 'M', 'D', 'd', 'H', 'h', 'm', 'S', 's']
var reservedChars = ['-', '+', 'P', 'p', 'T', 't']
var disallowedChars = durationChars.concat(reservedChars)

/**
 * Is a JS Date object or valid Moment object?
 * @param d Supposedly date
 * @returns {boolean}
 * @public
 */
var isDate = function _isDate (d) {
  if (d && moment.isMoment(d) && d.isValid()) return true
  return isObject(d) && (d instanceof Date || objToStr(d) === '[object Date]') && !isNaN(d)
}

/**
 * Attempts to parse datetime string to JS Date object
 * @param {String} strTime supposedly datetime string
 * @private
 */
var parseTime = function _parseTime (strTime) {
  // mixed up because we want most common on top (slightly optimizes performance)
  var allowedFormats = [
    'YYYY-MM-DD',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DDTHH:mm',
    'YYYY-MM-DD HHmm',
    'YYYYMMDD HH:mm',
    'YYYYMMDD HHmm',
    'YYYYMMDD',
    'YYYY-MM-DDTHHmm',
    'YYYYMMDDTHH:mm',
    'YYYYMMDDTHHmm',
    'YYYYMMDDTHH:mm',
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HHmmss',
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DDTHHmmss',
    'YYYYMMDDTHHmmss',
    'YYYY-MM-DD HH:mmZ',
    'YYYY-MM-DD HHmmZ',
    'YYYY-MM-DD HH:mm:ssZ',
    'YYYY-MM-DD HHmmssZ',
    'YYYYMMDD HH:mmZ',
    'YYYYMMDD HHmmZ',
    'YYYY-MM-DDTHH:mmZ',
    'YYYY-MM-DDTHHmmZ',
    'YYYY-MM-DDTHH:mm:ssZ',
    'YYYY-MM-DDTHHmmssZ',
    'YYYYMMDDTHH:mmZ',
    'YYYYMMDDTHHmmZ',
    'YYYYMMDDTHHmmZ',
    'YYYYMMDDTHHmmssZ',
    'YYYYMMDDTHH:mmZ'
  ]

  // strict parsing (defer to "human time" if none of the above formats is found)
  var d = moment(strTime, allowedFormats, true)

  // try with alien-date (should be able to parse "alien time" e.g. "last Wednesday")
  if (!d || !d.isValid()) {
    // it's not one of the above listed formats
    // let's give it one last shot before bailing out: human datetime
    out.trace('Unable to parse datetime ' + strTime)
    out.trace('Just a ms, will try parsing it as human time...')

    try {
      var human = parseHumanTime(strTime)

      if (isDate(human)) {
        out.trace('Success parsing ' + strTime + ' as human time: ' + human.toISOString())
        return moment(human) // for consistency - return as Moment instance
      }
    } catch (err) {
      out.trace('Unable to parse human time: ' + strTime)
    }
  } else {
    out.trace('Moment parsed ' + strTime + ' as ' + d.format())
    return d // return instance of Moment
  }

  throw new Error('Unable to interpret -t parameter')
}

/**
 * Gives its best shot in parsing datetime range
 * The question is: can we understand human time?
 * The answer is no, not reliably, so we must enforce close variants of ISO8601 format
 * We allow arbitrary separator to spare users the trouble of converting
 * their existing data (e.g. it's common to express range with TO between start and end)
 * @param tr         Supposedly time range string to parse
 * @param sepAt      Position of separator in {tr}
 * @param sep        Separator string
 * @returns {Object} nicely formatted {isRange: Boolean, start: Date[, end: Date]}
 * @private
 */
var parseRange = function _parseRange (tr, sepAt, sep) {
  var t1 = tr.substring(0, sepAt)
  var t2 = tr.substring(sepAt + sep.length)
  var ret = {}
  var d1
  var d2

  out.trace('parseRange: start string extracted as: ' + t1)
  out.trace('parseRange:   end string extracted as: ' + t2)

  // start of range:
  if (isDuration(t1)) { // start is duration?
    d1 = applyDuration(moment(), t1)
  } else {
    d1 = parseTime(t1) // if not, try to parse it as a date-time
  }

  if (d1 && d1.isValid()) {
    if (t2.trim()) {
      // end of range:
      if (isDuration(t2)) { // end is duration?
        var durPrefix = getDurationPrefix(t2)
        d2 = applyDuration(d1, t2)

        if (d2 && d2.isValid()) {
          if (durPrefix === '+') { // we just apply duration to start to get end
            ret.start = d1.toDate()
            ret.end = d2.toDate()
          } else if (durPrefix === '-') { // subtract duration from start and switch start and end
            ret.start = d2.toDate()
            ret.end = d1.toDate()
          } else { // false - no prefix
            throw new Error("Duration must start with '+' or '-' when used as end of range (" + t2 + ')')
          }
        } else {
          throw new Error('Unrecognized format of range end: ' + t2)
        }
      } else {
        d2 = parseTime(t2) // not duration, try to parse it as a date-time

        if (d2 && d2.isValid()) {
          ret.start = d1.toDate()
          ret.end = d2.toDate()
        } else {
          throw new Error('')
        }
      }

      out.trace('parseRange: start parsed as date: ' + ret.start.toISOString())
      out.trace('parseRange:   end parsed as date: ' + ret.end.toISOString())
      return ret
    } else {
      out.trace("parseRange: there's nothing behind range separator " + sep)
      throw new Error('Range separator found (' + sep + "), but there's nothing behind it")
    }
  }
  throw new Error('Unrecognized format of range start: ' + t1)
}

/**
 * Attempts to parse human-entered datetimes
 * @param {String} strTime maybe messy time
 * @private
 */
var parseHumanTime = function _parseHumanTime (strTime) {
  return parseHuman(strTime)
}

/**
 * Checks whether string has duration properties:
 *   - must contain at least one digit
 *   - it must contain either only digits (with possible + or - prefix) or one of these letters 'YyMDdHhms'
 *   - if those are both in check, we check the string against the duration parsing regex
 * @param {String} duration string to check
 * @returns {boolean}
 * @private
 */
var isDuration = function _isDuration (duration) {
  if (/^((?![0-9]).)*$/.test(duration)) return false // if it doesn't contain digits it cannot be duration
  if (/^[+-]?\d+$/.test(duration) || // it can contain only digits and possibly + or - (minutes)
    intersectCnt(duration.split(''), durationChars) > 0) { // if it contains time designators
    // only then do the long regex (explained in detail at the bottom of this file, for easier maintenance)
    var r = /^\/?[+-]?P?([0-9]+[Yy])?([0-9]+M)?([0-9]+[Dd])?[Tt]?([0-9]+[Hh])?([0-9]+m|(?:[0-9]+m?(?![0-9]+[Ss])))?([0-9]+[Ss])?$/g
    var matched = r.test(duration)
    out.trace('isDuration: established that ' + duration + ' is ' + (matched ? '' : 'not ') + 'duration')
    return matched
  } else {
    return false
  }
}

/**
 * Parses duration string
 * If it's a string with only digits inside, those are minutes (only lowercase m is optional)
 * @param {String}   duration e.g. '2M1d4h30m' (M - months, m - minutes)
 * @returns {Object} e.g. {y: 1, m: 6} = 1 year + 6 minutes
 * @private
 */
var parseDuration = function _extractDuration (duration) {
  // maintenance: the following regex is explained in detail at the bottom of this file
  var r = /^\/?[+-]?P?([0-9]+[Yy])?([0-9]+M)?([0-9]+[Dd])?[Tt]?([0-9]+[Hh])?([0-9]+m|(?:[0-9]+m?(?![0-9]+[Ss])))?([0-9]+[Ss])?$/g
  var matched = r.exec(duration)

  if (matched) {
    // clean up so that it contains only numbers as values
    var ret = {}
    if (matched[1]) ret.y = +matched[1].slice(0, -1)
    if (matched[2]) ret.M = +matched[2].slice(0, -1)
    if (matched[3]) ret.d = +matched[3].slice(0, -1)
    if (matched[4]) ret.h = +matched[4].slice(0, -1)
    if (matched[5]) ret.m = matched[5].indexOf('m') > -1 ? +matched[5].slice(0, -1) : +matched[5]
    if (matched[6]) ret.s = +matched[6].slice(0, -1)

    out.trace('parseDuration returned: ' + stringify(ret))
    return ret
  } else {
    return false
  }
}

//
// /**
// * Checks whether range {str} ends with a duration expression
// * If it contains (for sep = '/') '/+' or '/-' then it means
// * it adds or subtracts time from the start time
// * Therefore, it's a range expressed with date and duration
// * e.g. 2015-06-20/-1M represents range 2015-05-20/2015-06-20
// * @param {String}    str string to check
// * @param {String}    sep range separator
// * @returns {Boolean}
// * @private
// */
// var rangeContainsDuration = function _rangeContainsDuration(str, sep) {
//  return str.indexOf(sep + '+') > -1 || str.indexOf(sep + '-') > -1
// }

/**
 * Returns the prefix used with duration (+ or -)
 * @param {String} str Range string to check
 * @returns {String|Boolean} '+' or '-' or false
 * @private
 */
var getDurationPrefix = function _getDurationPrefix (str) {
  if (str.indexOf('+') > -1) {
    return '+'
  } else if (str.indexOf('-') > -1) {
    return '-'
  }
  return false
}

/**
 * Applies duration {durStr} to {dateTime}
 * @param dateTime will be used as a starting point (does not change itself)
 *                 which will be moved by +/- duration
 * @param durStr duration string, as specified by the user
 * @returns {Date|Boolean} clone of {dateTime} with duration applied
 * @private
 */
var applyDuration = function _applyDuration (dateTime, durStr) {
  var dstr = durStr[0] === '/' ? durStr.substr(1) : durStr
  var dur = parseDuration(dstr)
  if (!dur) {
    // why does it nor return a date?
    return false
  }

  var duration = moment.duration(dur)
  var durPrefix = getDurationPrefix(durStr)
  out.trace('applyDuration: found duration with ' + durPrefix ? '' : 'no' + ' prefix')

  if (durPrefix === '+') { // add duration
    return dateTime.clone().add(duration) // Moment is mutable so clone it
  } else if (!durPrefix || durPrefix === '-') { // Range start or standalone duration don't have prefix
    return dateTime.clone().subtract(duration) // subtract duration
  }
  // return ret -> rest was not defined, replaced with null
  return null
}

/**
 * Attempts to parse datetime or duration or range string to JS Date objects
 *
 * Examples:
 *  -t parameter                           start                   end
 *  2016-06-24T18:42                        timestamp               now
 *  2016-06-24T18:42/2016-06-24T18:52:30    timestamp               timestamp
 *  2016-06-24T18:42/-1d                    timestamp - duration    timestamp
 *  2016-06-24T18:42/+1d                    timestamp               timestamp + duration
 *  2h30m8s                                 now - duration          now
 *  2h/+1h                                  now - first duration    start + second duration
 *  2h/+30                                  now - first duration    start + second duration (in minutes)
 *
 *  If duration contains only digit(s), then it's minutes (default duration unit)
 *
 * @param {String} t    supposedly datetime or duration or range string
 * @param {Object} opts options object. Default: {rangeSeparator: '/'}
 * @returns {Object}    {start: startTime[, end: endTime]}
 * @public
 */
var calculateRange = function _calculateRange (t, opts) {
  out.trace('calcRange called with: ' + typeof t + ' ' + t + (opts ? ' and options: ' + stringify(opts) : ''))
  var sep = opts && opts.separator ? opts.separator.toUpperCase() : '/'
  var ret = {}

  // first check whether it's a datetime range
  var sepAt = ('' + t).indexOf(sep)

  if (sepAt > -1) { // it looks like range
    ret = parseRange(t, sepAt, sep)
  } else { // it appears to be a single entry (date-time or duration)
    if (isDuration(t)) {
      var duration = applyDuration(moment(), t) // now - duration
      out.trace('parse: found a standalone duration which yielded date-time: ' + duration.toISOString())

      ret.start = duration.toDate()
    } else {
      // then it should be just a regular ISO-8601 datetime?
      // try 'human time' if that also fails
      var d = parseTime(t)
      if (d && d.isValid()) {
        ret.start = d.toDate()
      } else {
        // not a range, not a duration, not a date-time, jeez!
        throw new Error('Unable to interpret -t parameter. Open up help ' +
          "with 'logsene search --help' to see usage info and examples")
      }
    }
  }
  return ret
}

module.exports = {
  isDate: isDate,
  parse: calculateRange,
  disallowedChars: disallowedChars
}

/*
 Regex from parseDuration function explained:
 /^\/?[+-]?P?([0-9]+[Yy])?([0-9]+M)?([0-9]+[Dd])?[Tt]?([0-9]+[Hh])?([0-9]+m|(?:[0-9]+m?(?![0-9]+[Ss])))?([0-9]+[Ss])?$/

 ^     assert position at start of the string
 \/?   matches the character / literally
 ?     Quantifier: Between zero and one time, as many times as possible, giving back as needed [greedy]
 [+-]? match a single character present inside the brackets
 P?    matches the character P literally (case sensitive), zero or one time

 1st Capturing group ([0-9]+[Yy])?

   [0-9]+ match a single character present inside the brackets, one or many times
   +      Quantifier: Between one and unlimited times, as many times as possible, giving back as needed [greedy]
   0-9    a single character in the range between 0 and 9
   [Yy]   match a single character present in the list below
   Yy     a single character in the list Yy literally (case sensitive)

 2nd Capturing group ([0-9]+M)?

   [0-9]+ match a single character present inside the brackets
   0-9    a single character in the range between 0 and 9
    M     matches the character M literally (case sensitive)

 3rd Capturing group ([0-9]+[Dd])?

   [0-9]+ match a single character present inside the brackets
   0-9    a single character in the range between 0 and 9
   [Dd]   match a single character present in the list below
   Dd     a single character in the list Dd literally (case sensitive)
   [Tt]?  match a single character present in the list below
   Tt     a single character in the list Tt literally (case sensitive)

 4th Capturing group ([0-9]+[Hh])?

   [0-9]+ match a single character present inside the brackets
   0-9    a single character in the range between 0 and 9
   [Hh]   match a single character present in the list below
   Hh     a single character in the list Hh literally (case sensitive)

 5th Capturing group ([0-9]+m|(?:[0-9]+m?(?![0-9]+[Ss])))?

   1st Alternative: [0-9]+m
     [0-9]+ match a single character present inside the brackets
     0-9    a single character in the range between 0 and 9
     m      matches the character m literally (case sensitive)

   2nd Alternative: (?:[0-9]+m?(?![0-9]+[Ss]))
     (?:[0-9]+m?(?![0-9]+[Ss])) Non-capturing group
     [0-9]+ match a single character present inside the brackets
     0-9    a single character in the range between 0 and 9
     m?     matches the character m literally (case sensitive)
     (?![0-9]+[Ss]) Negative Lookahead - Assert that it is impossible to match the regex below
     [0-9]+ match a single character present inside the brackets
     0-9    a single character in the range between 0 and 9
     [Ss]   match a single character present in the list below
     Ss     a single character in the list Ss literally (case sensitive)

 6th Capturing group ([0-9]+[Ss])?

   [0-9]+ match a single character present inside the brackets
   0-9    a single character in the range between 0 and 9
   [Ss]   match a single character present in the list below
   Ss     a single character in the list Ss literally (case sensitive)

 $ assert position at end of the string
 */
