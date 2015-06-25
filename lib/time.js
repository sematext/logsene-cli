'use strict';
/* jshint node:true */
/* global module, process, console, require */
var stringify    = require('safe-json-stringify'),
    parseHuman   = require('date.js'),
    moment       = require('moment'),
    intersectCnt = require('./util').intersectionCount,
    objToStr     = require('./util').objToStr,
    isObject     = require('./util').isObject,
    out          = require('./util').out;

var durationChars   = ['Y', 'y', 'M', 'D', 'd', 'H', 'h', 'm', 'S', 's'],
    reservedChars   = ['-', '+', 'P', 'p', 'T', 't'],
    disallowedChars = durationChars.concat(reservedChars);


/**
 * Is a JS Date object?
 * @param d Supposedly date
 * @returns {boolean}
 * @public
 */
var isDate = function _isDate(d) {
  return isObject(d) && (d instanceof Date || objToStr(d) === '[object Date]');
};


/**
 * Attempts to parse datetime string to JS Date object
 * @param {String} strTime supposedly datetime string
 * @private
 */
var parseTime = function _parseTime(strTime) {
  // mixed up because we want most common on top (slightly optimizes performance)
  var allowedFormats = [
    'YYYY-MM-DD',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD HHmm',
    'YYYYMMDD',
    'YYYYMMDD HH:mm',
    'YYYYMMDD HHmm',
    'YYYYMMDDHHmm',
    'YYYYMMDDHH:mm',
    'YYYY-MM-DDTHH:mm',
    'YYYY-MM-DDTHHmm',
    'YYYYMMDDTHH:mm',
    'YYYYMMDDTHHmm',
    'YYYYMMDDTHHmm',
    'YYYYMMDDTHH:mm',
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HHmmss',
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DDTHHmmss',
    'YYYYMMDDHHmmss',
    'YYYYMMDDTHHmmss',
    'YYYY-MM-DD HH:mmZ',
    'YYYY-MM-DD HHmmZ',
    'YYYY-MM-DD HH:mm:ssZ',
    'YYYY-MM-DD HHmmssZ',
    'YYYYMMDD HH:mmZ',
    'YYYYMMDD HHmmZ',
    'YYYYMMDDHHmmZ',
    'YYYYMMDDHHmmssZ',
    'YYYYMMDDHH:mmZ',
    'YYYY-MM-DDTHH:mmZ',
    'YYYY-MM-DDTHHmmZ',
    'YYYY-MM-DDTHH:mm:ssZ',
    'YYYY-MM-DDTHHmmssZ',
    'YYYYMMDDTHH:mmZ',
    'YYYYMMDDTHHmmZ',
    'YYYYMMDDTHHmmZ',
    'YYYYMMDDTHHmmssZ',
    'YYYYMMDDTHH:mmZ'
  ];

  var d = moment(strTime, allowedFormats, true); // strict parsing


  // try with date.js (should be able to parse "human time" e.g. last Wednesday)
  if (!d || !d.isValid()) {
    // it's not one of the above listed formats
    // let's give this one last shot before bailing out: human datetime
    out.trace('Unable to parse datetime ' + strTime);
    out.trace('Just a ms, will try parsing it as human time...');
    var human = parseHumanTime(strTime);
    if (isDate(human)) {
      out.trace('Success parsing ' + strTime + ' as human time: ' + human.toISOString());
      return moment(human);  // for consistency - return as Moment instance
    }
  } else {
    out.trace('Moment parsed ' + strTime + ' as ' + d.format());
    return d;  // return instance of Moment
  }

  throw new Error('Unable to interpret --t parameter');
};


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
var parseRange = function _parseRange(tr, sepAt, sep) {
  var t1 = tr.substring(0, sepAt);
  var t2 = tr.substring(sepAt + sep.length);
  var ret = {}, d1, d2;

  out.trace('parseRange: from string parsed as: ' + t1);
  out.trace('parseRange: to   string parsed as: ' + t2);

  d1 = parseTime(t1);  // first one is always datetime

  if (d1 && d1.isValid()) {  // we tolerate e.g. 2015-06-21T20:00:00/ (the same as without fwd slash)
    ret.start = d1.toDate();

    if (t2.trim()) {
      if (rangeContainsDuration(tr, sep)) {
        var dur = parseDuration(t2);
        if (dur) {
          var duration = moment.duration(dur);
          var durPrefix = getDurationPrefix(tr, sep);
          out.trace('parseRange: found duration with ' + durPrefix + ' prefix');

          if (durPrefix === '+') {  // add duration to start
            ret.end = d1.clone().add(duration).toDate();  // Moment is mutable so we need to make a copy
          } else if (durPrefix === '-') {  // subtract duration from start and switch end & start
            ret.end = ret.start;
            ret.start = d1.clone().subtract(duration).toDate();
          }
          return ret;

        } else {
          // supposed to be duration but none found
          throw new Error('Duration designator found but unable to parse duration');
        }

      } else {  // so range is simply datetime/datetime
        d2 = parseTime(t2);
        if (d2 && d2.isValid()) {
          out.trace('datetime-from parsed as date: ' + d1.toDate().toString());
          out.trace('datetime-to   parsed as date: ' + d2.toDate().toString());
          var d1ISO = d1.toDate().toISOString(); //.substr(0, 19);
          var d2ISO = d2.toDate().toISOString(); //.substr(0, 19);
          out.trace('datetime-from parsed as ISO 8601 date: ' + d1ISO);
          out.trace('datetime-to   parsed as ISO 8601 date: ' + d2ISO);

          ret.end = d2.toDate();
          return ret;
        }
      }
    } else {
      out.trace('parseRange: range start is valid, but range end isn\'t ' + durPrefix + ' prefix');
      return ret;
    }
  }
  throw new Error('Unrecognized datetime format (start of range: ' + t1 + ')');
};


/**
 * Attempts to parse human-entered datetimes
 * @param {String} strTime maybe messy time
 * @private
 */
var parseHumanTime = function _parseHumanTime(strTime) {
  return parseHuman(strTime);
};


/**
 * Parses duration string
 * If it's a string with only digits inside, those are minutes (only lowercase m is optional)
 * @param {String}   duration e.g. '2M1d4h30m' (M - months, m - minutes)
 * @returns {Object} e.g. {y: 1, m: 6} = 1 year + 6 minutes
 * @private
 */
var extractDuration = function _extractDuration(duration) {
  var r = /^[\+,\-]?P?([0-9]+[Y,y]|)?([0-9]+M|)?([0-9]+[D,d]|)?[T,t]?([0-9]+[H,h]|)?([0-9]+m?|)?([0-9]+[S,s]|)?$/g;
  var matched = r.exec(duration);

  if (matched) {
    out.trace('Duration matched: ' + matched.join(', '));

    // clean up so that it contains only numbers as values
    var ret = {};
    if (matched[1]) ret.y = +matched[1].slice(0, -1);
    if (matched[2]) ret.M = +matched[2].slice(0, -1);
    if (matched[3]) ret.d = +matched[3].slice(0, -1);
    if (matched[4]) ret.h = +matched[4].slice(0, -1);
    if (matched[5]) ret.m = +matched[5].slice(0, -1);
    if (matched[6]) ret.s = +matched[6].slice(0, -1);

    out.trace('extractDuration returned: ' + stringify(ret));
    return ret;

  } else {
    return false;
  }
};


/**
 * Checks whether range {str} ends with a duration expression
 * If it contains (for sep = '/') '/+' or '/-' then it means
 * it adds or subtracts time from the start time
 * Therefore, it's a range expressed with date and duration
 * e.g. 2015-06-20/-1M represents range 2015-05-20/2015-06-20
 * @param {String}    str string to check
 * @param {String}    sep range separator
 * @returns {Boolean}
 * @private
 */
var rangeContainsDuration = function _rangeContainsDuration(str, sep) {
  return str.indexOf(sep + '+') > -1 || str.indexOf(sep + '-') > -1;
};


/**
 * Returns the prefix used with duration (+ or -)
 * @param {String} str Range string to check
 * @param {String} sep Range separator (immediately followed by our duration prefix)
 * @returns {String|Boolean} '+' or '-' or false
 * @private
 */
var getDurationPrefix = function _getDurationPrefix(str, sep) {
  if (str.indexOf(sep + '+') > -1) {
    return '+';
  } else if (str.indexOf(sep + '-') > -1) {
    return '-';
  } else {
    return false;
  }

};


/**
 * Checks whether the {str} has duration characteristics
 * (to avoid additionally completting Regex in extractDuration)
 * and if not returns {false} otherwise it parses it
 * and returns object with datetime components
 * @param {String}   str
 * @returns {Object} or {false} e.g. {y: 1, M: 3, m: 2, s: 888}
 * @private
 */
var parseDuration = function _parseDuration(str) {
  if (/^((?![0-9]).)*$/.test(str)) return false;  // if it doesn't contain digits it cannot be duration
  if (/^\d+$/.test(str) ||   // if it's a string with only digits inside, those are minutes
      intersectCnt(str.split(''), durationChars) > 0) {  // if it contains time designators
    return extractDuration(str);
  }
};


/**
 * Attempts to parse datetime or duration or range string to nicely packaged JS Date objects
 * @param {String}   strTime supposedly datetime or datetime range string
 * @param {Object}   opts options object. Default: {rangeSeparator: '/'}
 * @returns {Object} {start: startTime[, end: endTime]}
 * @public
 */
var parse = function _parseDatetimeOrDurationOrRange(strTime, opts) {
  var sep = opts && opts.separator ? opts.separator.toUpperCase() : '/';
  var t = strTime;
  var ret = {};

  // first check whether it's a datetime range
  var sepAt = t.indexOf(sep);

  if (sepAt > -1) {  // it looks like range
    return parseRange(t, sepAt, sep);

  } else {
    // not a range. Is it a duration?
    var durationParsed = parseDuration(t);
    if (durationParsed) {
      var duration = moment.duration(durationParsed);
      var durPrefix = getDurationPrefix(t, sep);
      out.trace('parse: found duration with ' + durPrefix + ' prefix');

      // we ignore the fact that + was used, we'll behave just as if - was used, or no prefix at all
      //if (durPrefix === '+') {  // add duration to start
      //  throw new Error('Duration cannot have + prefix when used by itself (relative to now). ' +
      //      'Try without prefix');
      //} else {  // subtract duration from start and switch end & start
        ret.start = moment().subtract(duration).toDate();  // now - duration
      //}

    } else {
      // not range, not duration, jeez!
      // then it should be just a regular ISO-8601 datetime?
      var d = parseTime(t);
      if (d && d.isValid()) {
        ret.start = d.toDate();
        return ret;
      } else {
        // it's also not a regular datetime
        // let's try human date before bailing out
        var human = parseHumanTime(t);
        if (human && human.isValid()) {
          ret.start = human;
          return ret;
        }

        throw new Error('Unable to interpret --t parameter');
      }
    }
  }
  return ret;
};


module.exports = {
  isDate:          isDate,
  parse:           parse,
  disallowedChars: disallowedChars
};
