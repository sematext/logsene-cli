'use strict';
/* jshint node:true */
/* global module, process, console, require */

// not ideal place, but circular dependency otherwise
require('../lib/bootstrap');  // throw away, just bootstrap

var Command         = require('ronin').Command,
    ejs             = require('elastic.js'),
    values          = require('lodash.values'),
    forEach         = require('lodash.foreach'),
    Transform       = require('stream').Transform,
    JSONStream      = require('JSONStream'),
    eos             = require('end-of-stream'),
    out             = require('../lib/util').out,
    argv            = require('../lib/util').argv,
    isDef           = require('../lib/util').isDef,
    warnAndExit     = require('../lib/util').warnAndExit,
    wrapInQuotes    = require('../lib/util').wrapInQuotes,
    isSOBT          = require('../lib/util').isStrOrBoolTrue,
    stringify       = require('../lib/util').safeJsonStringify,
    parseTime       = require('../lib/time').parse,
    disallowedChars = require('../lib/time').disallowedChars,
    conf            = require('../lib/config'),
    api             = require('../lib/logsene-api');

var nl = '\n';


var Search = Command.extend({ use: ['session', 'auth'],
  desc: 'Search Logsene logs',

  run: function _run() {
    var logLev = isSOBT(conf.getSync('trace')) || isSOBT(argv.trace) ? 'trace' : 'error';
    out.trace ('Initializing ES with log level ' + logLev);
    api.initES(logLev);

    out.trace('Search called with arguments: ' + stringify(argv));

    var opts = {
      appKey:   conf.getSync('appKey'),
      size:     argv.s || conf.getSync('defaultSize') || conf.maxHits,
      offset:   argv.o || 0,
      logLevel: isSOBT(conf.getSync('trace')) ? 'trace' : 'error',
      body:     ejs.Request()
                  .query(ejs.FilteredQuery(getQuerySync(), getTimeFilterSync()))
                  .sort('@timestamp', 'asc')
    };

    out.trace('Search: sending to logsene-api:' + nl + stringify(opts));

    // logsene-api:
    api.search(opts, function(err, esReadableHits) {
      if(err) {
        out.error('Search error: ' + err.message);
        process.exit(1); // bail out
      }

      var jsonExtractor = new Transform({objectMode: true}),
          tsvExtractor = new Transform({objectMode: true}),
          hitCnt = 0;

      jsonExtractor._transform = function _jsonTransform(data, encoding, next) {
        var source = isDef(data['_source']) ? data['_source'] : data;

        this.push(source);
        hitCnt++;
        next();
      };


      tsvExtractor._transform = function _tsvTransform(data, encoding, next) {
        var source = isDef(data['_source']) ? data['_source'] : data;
        var output = '';

        forEach(values(source), function _forEachValue(v) {
          output += v + '\t';
        });

        this.push(output + '\n');
        hitCnt++;  // counting objects = hits
        next();
      };

      eos(esReadableHits, function _esReadableHits(err) {
        if (err) {
          out.error('ES stream had an error or closed early.');
          process.exit(1);
        }

        // only show when trace is turned on or there are no hits (messes up the ability to pipe output)
        var maxHits = conf.maxHits;
        if (hitCnt === 0) {
          out.info('\nReturned hits: ' + hitCnt + (hitCnt === maxHits ? ' (max)' : ''));
        } else {
          out.trace('\nReturned hits: ' + hitCnt + (hitCnt === maxHits ? ' (max)' : ''));
        }
        process.exit(0);
      });


      if (argv.json) {
        esReadableHits
            .pipe(jsonExtractor)
            .pipe(JSONStream.stringify(false))
            .pipe(process.stdout);

      } else {
        esReadableHits
            .pipe(tsvExtractor)
            .pipe(process.stdout);
      }

    });
  },


  help: function _help() {
    return 'Usage: logsene ' + this.name + ' query [OPTIONS]' + nl +
    '  where OPTIONS may be:' + nl +
    '    --q <query>        Query string (--q parameter can be omitted)' + nl +
    '    --op AND           OPTIONAL Overrides default OR operator' + nl +
    '    --t <interval>     OPTIONAL ISO 8601 datetime or duration or time range' + nl +
    '    --s <size>         OPTIONAL Number of matches to return. Defaults to ' + conf.maxHits + '' + nl +
    '    --o <offset>       OPTIONAL Number of matches to skip from the beginning. Defaults to 0' + nl +
    '    --json             OPTIONAL Returns JSON instead of TSV' + nl +
    '    --sep              OPTIONAL Sets the separator between two datetimes when specifying time range' + nl +
    nl +
    'Examples:' + nl +
    '  logsene ' + this.name + '' + nl +
    '      returns last 1h of log entries' + nl +
    nl +
    '  logsene ' + this.name + ' --q ERROR' + nl +
    '      returns last 1h of log entries that contain the term ERROR' + nl +
    nl +
    '  logsene ' + this.name + ' ERROR' + nl +
    '      equivalent to the previous example' + nl +
    nl +
    '  logsene ' + this.name + ' UNDEFINED SEGFAULT' + nl +
    '      returns last 1h of log entries that have either of the terms' + nl +
    '      note: default operator is OR' + nl +
    nl +
    '  logsene ' + this.name + ' SEGFAULT Segmentation --op AND' + nl +
    '      returns last 1h of log entries that have both terms' + nl +
    '      note: convenience parameter --and has the same effect' + nl +
    nl +
    '  logsene ' + this.name + ' --q "Server not responding"' + nl +
    '      returns last 1h of log entries that contain the given phrase' + nl +
    nl +
    '  logsene ' + this.name + ' --t 1y8M4d8h30m2s' + nl +
    '      returns all the log entries reaching back to' + nl +
    '      1 year 8 months 4 days 8 hours 30 minutes and 2 seconds' + nl +
    '      note: any datetime component can be omitted (shown in the following two examples)' + nl +
    '      note: months must be specified with uppercase M (distinction from minutes)' + nl +
    nl +
    '  logsene ' + this.name + ' --t 1h30m' + nl +
    '      returns all the log entries from the last 1,5h' + nl +
    nl +
    '  logsene ' + this.name + ' --t 90' + nl +
    '      equivalent to the previous example (default time unit is minute)' + nl +
    nl +
    '  logsene ' + this.name + ' --t 2015-06-20T20:48' + nl +
    '      returns all the log entries that were logged after the provided datetime' + nl +
    '      note: allowed formats listed at the bottom of this help message' + nl +
    nl +
    '  logsene ' + this.name + ' --t "2015-06-20 20:28"' + nl +
    '      returns all the log entries that were logged after the provided datetime' + nl +
    '      note: if a parameter contains spaces, it must be enclosed in quotes' + nl +
    nl +
    '  logsene ' + this.name + ' --t 2015-06-16T22:27:41/2015-06-18T22:27:41' + nl +
    '      returns all the log entries that were logged between provided timestamps' + nl +
    '      note: date range must either contain forward slash between datetimes,' + nl +
    '            or a different range separator must be specified (shown in the next example)' + nl +
    nl +
    '  logsene ' + this.name + ' --t "2015-06-16T22:27:41 TO 2015-06-18T22:27:41" --sep " TO "' + nl +
    '      same as previous command, except it sets the custom string separator that denotes a range' + nl +
    '      note: default separator is the forward slash (as per ISO-8601)' + nl +
    '      note: if a parameter contains spaces, it must be enclosed in quotes' + nl +
    nl +
    '  logsene ' + this.name + ' --t "last Friday at 13/last Friday at 13:30"' + nl +
    '      it is also possible to use "human language" to designate datetime' + nl +
    '      note: it may be used in place of datetime (e.g. "last friday between 12 and 14" is not allowed)' + nl +
    '      note: may yield unpredictable datetime values' + nl +
    nl +
    '  logsene ' + this.name + ' --q ERROR --s 20' + nl +
    '      returns at most 20 latest log entries with the term ERROR' + nl +
    nl +
    '  logsene ' + this.name + ' ERROR --s 50 --o 20' + nl +
    '      returns chronologically sorted hits 21st to 71st (offset=20)' + nl +
    '      note: default sort order is ascending (for convenience - latest on the bottom)' + nl +
    nl +
    '  logsene ' + this.name + ' --help' + nl +
    '      outputs this usage information' + nl +
    nl +
    'Allowed datetime formats:' + nl +
    '  YYYY[-]MM[-]DD[T][HH[:MM[:SS]]]' + nl +
    '  e.g.' + nl +
    '    YYYY-MM-DD HH:mm:ss' + nl +
    '    YYYY-MM-DDTHH:mm' + nl +
    '    YYYY-MM-DDHH:mm' + nl +
    '    YYYYMMDDTHH:mm' + nl +
    '    YYYYMMDD HH:mm' + nl +
    '    YYYYMMDDHH:mm' + nl +
    '    YYYYMMDDHHmm' + nl +
    '  note: to use UTC instead of local time, append Z to datetime' + nl +
    '  note: all datetime components are optional except date (YYYY, MM and DD)' + nl +
    '        If not specified, component defaults to its lowest possible value' + nl +
    '  note: date part may be separated from time by T (ISO-8601), space or nothing at all' + nl +
    nl +
    'Allowed duration format:' + nl +
    '  [Ny][NM][Nd][Nh][Nm][Ns]' + nl +
    '  e.g.' + nl +
    '    1M1d42s' + nl +
    '  note: duration is specified as a series of number and time designator pairs, e.g. 1y2M8d22h8m48s' + nl +
    nl +
    'Allowed datetime range formats' + nl +
    '  range can be expressed in two ways, with datetime/datetime or with datetime/duration:' + nl +
    '  datetime/datetime' + nl +
    '  datetime/{+|-}duration' + nl +
    '  where / is default range separator string and + or - sign is duration designator (examples listed below)' + nl +
    '    plus  (+) duration designator means that filter\'s end time will be constructed by adding duration to start time' + nl +
    '    minus (-) means that start time will be datetime - duration and end time will be what used to be start time' + nl +
    '    YYYY[-]MM[-]DD[T][HH[:MM[:SS]]]/YYYY[-]MM[-]DD[T][HH[:MM[:SS]]]' + nl +
    '    YYYY[-]MM[-]DD[T][HH[:MM[:SS]]]/+[Ny][NM][Nd][Nh][Nm][Ns]' + nl +
    '  e.g.' + nl +
    '    2015-06-23 17:45/2015-06-23 18:45' + nl +
    '    2015-06-23 17:45/-1M' + nl +
    '        gets translated to: 2015-05-23 17:45/2015-06-23 17:45' + nl +
    '    2015-06-23 17:45/+15m' + nl +
    '        gets translated to: 2015-06-23 17:45/2015-06-23 18:00' + nl +
    '  note: all allowable datetime formats are also permitted when specifying ranges' + nl +
    '  note: disallowed range separators:' + nl +
    '       ' + disallowedChars.join(', ') + nl +
    nl +
    'Allowed "human" formats:' + nl +
    '    10 minutes ago' + nl +
    '    yesterday at 12:30pm' + nl +
    '    last night (night becomes 19:00)' + nl +
    '    last month' + nl +
    '    last friday at 2pm' + nl +
    '    3 hours ago' + nl +
    '    2 weeks ago at 17' + nl +
    '    wednesday 2 weeks ago' + nl +
    '    2 months ago' + nl +
    '    last week saturday morning (morning becomes 06:00)' + nl +
    '  note: "human" format can be used instead of date-time' + nl +
    '  note: it is not possible to express duration with "human" format (e.g. "from 2 to 3 this morining")' + nl +
    '  note: it is recommended to avoid human format, as it may yield unexpected results' + nl +
    nl +
    '--------';
  }
});


/**
 * Assembles ejs query according to query entered by the user
 * It checks whether user entered one or more terms or a phrase?
 * It also checks whether the default operator OR is overridden
 * @returns assembled ejs query
 * @private
 */
var getQuerySync = function _getQuery() {
  var query;

  if (!isDef(argv.q) && argv._.length === 1) {
    // if client just entered 'logsene search'
    // give him back ALL log entries (from the last hour - see getTimeSync)
    query = ejs.MatchAllQuery();

  } else {
    var q = adjustQuery();
    query = ejs.QueryStringQuery().query(q).defaultOperator(getOperator());
  }

  out.trace('Returning query from getQuerySync:' + nl + stringify(query.toJSON()));
  return query;
};


/**
 *  Any number of params is allowed and --q can be omitted
 *  so we need to potentially combine --q and commands
 *  we also need to wrap phrases in quotes
 *  NOTE: --q may originally have only a single phrase or a term
 *  e.g. with --q:
 *      logsene search --q response took --and --t 1d
 *      {"_":["search","took"],"q":"response","and":true,"t":"1d"}
 *  e.g. without --q:
 *      logsene search response took --and --t 1d
 *      {"_":["search","response","took"],"and":true,"t":"1d"}
 *  e.g. with --q and with phrases
 *      logsene search --q "response took" "extra hour" last --and --t 1d
 *      {"_":["search","extra hour","last"],"q":"response took","and":true,"t":"1d"}
 *  e.g. without --q and with phrases
 *      logsene search "response took" "extra hour" last --and --t 1d
 *      {"_":["search","response took","extra hour","last"],"and":true,"t":"1d"}
 * @returns {*}
 * @private
 */
var adjustQuery = function _adjustQuery() {
  var q;

  if (isDef(argv.q)) {
    q = quoteIfPhrase(argv.q);
  }

  if (argv._.length > 1) {  // not only search in _
    // if there are additional search terms/phrases,
    // they were collected as commands by the minimist (see examples above)
    // append those puppies to q
    forEach(argv._.splice(1), function _adjQ(str) {
      q = (q ? q + ' ' : '') + quoteIfPhrase(str);
    });
  }

  out.trace('adjustQuery: adjusted query to ' + q);
  return q;
};


/**
 * Wraps string in double quotes if it contains space
 * @param {String} str to check
 * @returns {String} possibly quoted string
 * @private
 */
var quoteIfPhrase = function _quoteIfPhrase(str) {
  return str.indexOf(' ') > -1 ? wrapInQuotes(str) : str;
};


/**
 * Returns AND operator if explicitly specified by the user
 * Otherwise returns default OR
 * @returns {String} Operator
 * @private
 */
var getOperator = function _getOperator() {
  out.trace('isSOBT(argv.op): ' + isDef(argv.op));
  if (argv.and || (isDef(argv.op) && argv.op.toLowerCase() === 'and')) {
    return 'and';
  } else {
    return 'or';
  }
};


/**
 * Assembles ejs filter according to query entered by the user
 * It checks whether user expressed time component and, if yes,
 * composes the filter accordingly
 * @returns assembled ejs filter
 * @private
 */
var getTimeFilterSync = function _getTimeFilterSync() {
  var filter;

  // first check whether user provided the time component (--t)
  if (!argv.t) {
    // when not specified, default time is the last 60m
    var millisInHour      = 3600000,
        nowMinusHour      = Date.now() - millisInHour,
        defaultStartTime  = (new Date(nowMinusHour)).toISOString();

    filter = ejs.RangeFilter('@timestamp').gte(defaultStartTime);

  } else {

    // datetime param provided
    var t = argv.t,
        argvSep = argv.sep,
        confSep = conf.getSync('rangeSeparator'),
        sep = argvSep ? argvSep : (confSep ? confSep : '/');

    out.trace('Range separator for this session: ' + sep);

    if (disallowedChars.indexOf(sep) > -1)
      warnAndExit(sep + ' is not allowed as a range separator. That\'s because it' + nl +
          'clashes with standard ISO 8601 datetime or duration notation' + nl +
          'The default separator, forward slash, should be used.' + nl +
          'It is also possible to use a custom separator (e.g. \' TO \').' + nl +
          'Disallowed chars: ' + disallowedChars.join(', ') + '' + nl +
          'e.g. logsene config set --sep TO', Search);

    try {

      // we get back {start: Date[, end: Date]} and that's all we care about
      var parsed = parseTime(t, {separator: sep});

    } catch (err) {
      out.error('DateTime parser: ' + err.message);
      process.exit(1);
    }

    if (parsed) {
      filter = ejs.RangeFilter('@timestamp').gte(parsed.start);
      if (isDef(parsed.end)) {  // if range, add the 'end' condition to the filter
        filter = filter.lte(parsed.end);
      }
    } else {
      warnAndExit('Unrecognized datetime format.', Search);
    }
  }

  out.trace('getTimeFilterSync returning:' + nl + stringify(filter.toJSON()));
  return filter;
};


module.exports = Search;
