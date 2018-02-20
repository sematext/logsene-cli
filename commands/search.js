'use strict';
/* jshint node:true */
/* global module, process, console, require */

// not ideal place, but circular dependency otherwise
require('../lib/bootstrap');  // throw away, just bootstrap

var Command         = require('ronin').Command,
    values          = require('lodash.values'),
    forEach         = require('lodash.foreach'),
    Transform       = require('stream').Transform,
    JSONStream      = require('JSONStream'),
    eos             = require('end-of-stream'),
    Table           = require('cli-table'),
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
    require('colors');  // just bring in colors

var nl = '\n';


var Search = Command.extend({ use: ['session', 'auth'],
  desc: 'Search Logsene logs',

  run: function _run() {
    var logLev = isSOBT(conf.getSync('trace')) || isSOBT(argv.trace) ? 'trace' : 'error';
    out.trace('Initializing ES with log level ' + logLev);
    api.initES(logLev);

    out.trace('Search called with arguments: ' + stringify(argv));

    var opts = {
      appKey:   conf.getSync('appKey'),
      offset:   argv.o || 0,
      logLevel: isSOBT(conf.getSync('trace')) ? 'trace' : 'error',
      body:     getQuerySync(argv),
    };

    // size
    var size = argv.s || conf.getSync('defaultSize') || conf.maxHits;
    if (!isSOBT(size)) {
      opts.size = size;
    }

    // fields
    var f = argv.f;
    var flds = [];  // remember so the order of fields in the printout can be honored
    if (f) {
      // trim each in case of "fld1, fld2, fld3"
      f.split(",").forEach(function(fld){
        flds.push(fld.trim());
      });
      opts.body.stored_fields = flds;
    }

    out.trace('Search: sending to logsene-api:' + nl + stringify(opts));

    // reorder fields as user requested (originally returned as object sorted by keys)
    var reshufleFields = function _reshufleFields(fields) {
      if (Array.isArray(flds)) {
        var reorderedFlds = [];
        flds.forEach(function(fld) {
          reorderedFlds.push(fields[fld]);
        });
        return reorderedFlds;
      }
      return fields;
    };

    // logsene-api:
    api.search(opts, function _apiSearch(err, esReadableHits) {
      if(err) {
        out.error('Search error: ' + err.message);
        process.exit(1); // bail out
      }

      var jsonExtractor = new Transform({objectMode: true}),
          tsvExtractor = new Transform({objectMode: true}),
          hitCnt = 0;

      jsonExtractor._transform = function _jsonTransform(data, encoding, next) {
        var source = isDef(data['_source']) ? data['_source'] : data;
        if (data.fields) source = data.fields;
        this.push(source);
        hitCnt++;
        next();
      };

      tsvExtractor._transform = function _tsvTransform(data, encoding, next) {
        var source = isDef(data['_source']) ? data['_source'] : data;
        if (data.fields) source = reshufleFields(data.fields);
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
    var table = new Table({
      head: ['-t parameter', 'range start', 'range end']
    });

    table.push(
        ['2016-06-24T18:42',                      'timestamp',                    'now'                 ],
        ['2016-06-24T18:42/2016-06-24T18:52:30',  'timestamp',                    'timestamp'           ],
        ['2016-06-24T18:42/+1d',                  'timestamp',                    'timestamp + duration'],
        ['2016-06-24T18:42/-1d',                  'timestamp - duration',         'timestamp'           ],
        ['2h30m8s',                               'now - duration',               'now'                 ],
        ['2h/+1h',                                'now - duration1',              'start + duration2'   ],
        ['2h/-1h',                                'now - duration1 - duration2',  'now - duration1'     ],
        ['5d10h25/2016-06-24T18:42',              'now - duration',               'timestamp'           ]
    );

    return 'Usage: logsene search [query] [OPTIONS]'.bold + nl +
    '  where OPTIONS may be:'.grey + nl +
    '    -q <query>    '.yellow + '  Query string (-q parameter can be omitted)' + nl +
    '    -f <fields>   '.yellow + '  OPTIONAL Fields to return (defaults to all fields)' + nl +
    '    -t <interval> '.yellow + '  OPTIONAL datetime, duration or range (defaults to last hour)' + nl +
    '    -s <size>     '.yellow + '  OPTIONAL Number of matches to return (d)efaults to ' + conf.maxHits + ')' + nl +
    '    -o <offset>   '.yellow + '  OPTIONAL Number of matches to skip from the beginning (defaults to 0)' + nl +
    '    -op AND       '.yellow + '  OPTIONAL Overrides default OR operator between multiple query terms' + nl +
    '    --json        '.yellow + '  OPTIONAL Returns log entries in JSON instead of TSV format' + nl +
    '    --sep         '.yellow + '  OPTIONAL Sets the separator between start and end of time ranges' + nl +
    nl +
    'Examples:'.underline.green + nl +
    '  logsene search'.blue + nl +
    '      returns last 1h of log entries'.grey + nl +
    '      note: default return limit of 200 hits is always in effect unless you'.grey + nl +
    '            explicitly change it with the -s switch (where -s without params'.grey + nl +
    '            disables the limit altogether)'.grey + nl +
    nl +
    '  logsene search -q ERROR'.blue + nl +
    '      returns last 1h of log entries that contain the term ERROR'.grey + nl +
    nl +
    '  logsene search ERROR'.blue + nl +
    '      equivalent to the previous example'.grey + nl +
    nl +
    '  logsene search UNDEFINED SEGFAULT'.blue + nl +
    '      returns last 1h of log entries that have either of the terms'.grey + nl +
    '      note: default operator is OR'.grey + nl +
    nl +
    '  logsene search SEGFAULT Segmentation -op AND'.blue + nl +
    '      returns last 1h of log entries that have both terms'.grey + nl +
    '      note: convenience parameter --and has the same effect'.grey + nl +
    nl +
    '  logsene search -q "Server not responding"'.blue + nl +
    '      returns last 1h of log entries that contain the given phrase'.grey + nl +
    nl +
    '  logsene search "rare thing" -t 1y8M4d8h30m2s'.blue + nl +
    '      returns all the log entries that contain the phrase "rare thing" reaching'.grey + nl +
    '      back to 1 year 8 months 4 days 8 hours 30 minutes and 2 seconds'.grey + nl +
    '      note: when specifying duration, any datetime designator character can be'.grey + nl +
    '            omited (shown in the following two examples)'.grey + nl +
    '      note: months must be specified with uppercase M (distinction from minutes)'.grey + nl +
    '      note: minutes (m) are the default, so "m" can be omited'.grey + nl +
    nl +
    '  logsene search -t 1h30m'.blue + nl +
    '      returns all the log entries from the last 1,5h'.grey + nl +
    nl +
    '  logsene search -t 90'.blue + nl +
    '      equivalent to the previous example (default time unit is minute)'.grey + nl +
    nl +
    '  logsene search -t 2015-06-20T20:48'.blue + nl +
    '      returns all the log entries that were logged after the provided datetime'.grey + nl +
    '      note: allowed formats listed at the bottom of this help message'.grey + nl +
    nl +
    '  logsene search -t "2015-06-20 20:28"'.blue + nl +
    '      returns all the log entries that were logged after the provided datetime'.grey + nl +
    '      note: if a parameter contains spaces, it must be enclosed in quotes'.grey + nl +
    nl +
    '  logsene search -t 2015-06-16T22:27:41/2015-06-18T22:27:41'.blue + nl +
    '      returns all the log entries between the two provided timestamps'.grey + nl +
    '      note: date range must either contain forward slash between datetimes,'.grey + nl +
    '            or a different range separator must be specified (next example)'.grey + nl +
    nl +
    '  logsene search -t "2015-06-16T22:27:41 TO 2015-06-18T22:27:41" --sep " TO "'.blue + nl +
    '      same as previous command, except it sets the custom string separator that'.grey + nl +
    '      denotes a range'.grey + nl +
    '      note: default separator is the forward slash (as per ISO-8601)'.grey + nl +
    '      note: if a parameter contains spaces, it must be enclosed in quotes'.grey + nl +
    nl +
    '  logsene search -t "last Friday at 13/last Friday at 13:30"'.blue + nl +
    '      it is also possible to use "human language" to designate datetime'.grey + nl +
    '      note: it may be used only in place of datetime. Expressing range is not'.grey + nl +
    '            possible (e.g. "last friday between 12 and 14" is not allowed)'.grey + nl +
    '      note: may yield unpredictable datetime values'.grey + nl +
    nl +
    '  logsene search -q ERROR -s 20'.blue + nl +
    '      returns at most 20 log entries (within the last hour) with the term ERROR'.grey + nl +
    nl +
    '  logsene search ERROR -s 50 -o 20'.blue + nl +
    '      returns chronologically sorted hits 21st to 71st (offset is 20)'.grey + nl +
    '      note: default sort order is ascending (latest entries at the bottom)'.grey + nl +
    nl +
    '  logsene search --help'.blue + nl +
    '      outputs this usage information'.grey + nl +
    nl +
    'Allowed datetime formats:'.green + nl +
    '  YYYY[-]MM[-]DD(T, )[HH[:MM[:SS]]]'.yellow + nl +
    '  e.g.' + nl +
    '    YYYY-MM-DD HH:mm:ss' + nl +
    '    YYYY-MM-DDTHH:mm' + nl +
    '    YYYY-MM-DDHH:mm' + nl +
    '    YYYYMMDDTHH:mm' + nl +
    '    YYYYMMDD HH:mm' + nl +
    '    YYYY-MM-DD' + nl +
    '    YYYYMMDD' + nl +
    '    YYYY-MM-DD HHmm' + nl +
    '    YYYYMMDD HHmm' + nl +
    '    YYYY-MM-DDTHHmm' + nl +
    '    YYYYMMDDTHH:mm' + nl +
    '    YYYYMMDDTHHmm' + nl +
    '    YYYYMMDDTHH:mm' + nl +
    '    YYYY-MM-DDTHHmmss' + nl +
    '    YYYYMMDDHHmmss' + nl +
    '  note: date part may be separated from time by T (ISO-8601) or space'.grey + nl +
    '  note: if datetime contains a space, it must be enclosed in double quotes'.grey + nl +
    nl +
    'Allowed duration format:'.green + nl +
    '  [Ny][NM][Nd][Nh][Nm][Ns]'.yellow + nl +
    '  e.g.' + nl +
    '    1y2M8d22h8m48s' + nl +
    '  note: uppercase M must be used for months, lowercase m for minutes'.grey + nl +
    '  note: if only a number is specified, it defaults to minutes'.grey + nl +
    nl +
    'Allowed range formats'.green + nl +
    '  range can be expressed in all datetime/duration combinations:' + nl +
    '  datetime/datetime' + nl +
    '  datetime/(+|-)duration' + nl +
    '  duration/(+|-)duration' + nl +
    '  duration/datetime' + nl +
    '  note: / is default range separator; + or - sign is duration direction'.grey + nl +
    '  note: duration must begin with either + or - when used in end of range position'.grey + nl +
    nl +
    '  The following table shows how ranges are calculated, given the different input parameters'.grey + nl +
    table.toString() +
    nl +
    '  note: all allowable datetime formats are also permitted when specifying ranges'.grey + nl +
    '  note: disallowed range separators:'.grey + nl +
    '       ' + disallowedChars.join(', ').grey + nl +
    nl +
    'Allowed "human" formats (all in local time):'.green + nl +
    '    10 minutes ago' + nl +
    '    yesterday at 12:30pm' + nl +
    '    last night ' + '(night becomes 19:00)'.black + nl +
    '    last month' + nl +
    '    last friday at 2pm' + nl +
    '    3 hours ago' + nl +
    '    2 weeks ago at 17' + nl +
    '    wednesday 2 weeks ago' + nl +
    '    2 months ago' + nl +
    '    last week saturday morning ' + '(morning becomes 06:00)'.black + nl +
    '  note: "human" format can only be used instead of date-time'.grey + nl +
    '  note: it is not possible to express duration with "human" format (e.g. "from 2 to 3 this morining")'.grey + nl +
    '  note: it is recommended to avoid human format, as it may yield unexpected results'.grey + nl +
    nl +
    '--------';
  }
});

/**
 *  Any number of params following -q is allowed and -q can be omitted
 *  so we need to combine -q and commands for multi-term queries
 *  We also need to wrap phrases in quotes
 *  NOTE: -q may originally have only a single phrase or a term
 *  e.g. with -q:
 *      logsene search -q response took --and -t 1d
 *      {"_":["search","took"],"q":"response","and":true,"t":"1d"}
 *  e.g. without -q:
 *      logsene search response took --and -t 1d
 *      {"_":["search","response","took"],"and":true,"t":"1d"}
 *  e.g. with -q and with phrases
 *      logsene search -q "response took" "extra hour" last --and -t 1d
 *      {"_":["search","extra hour","last"],"q":"response took","and":true,"t":"1d"}
 *  e.g. without -q and with phrases
 *      logsene search "response took" "extra hour" last --and -t 1d
 *      {"_":["search","response took","extra hour","last"],"and":true,"t":"1d"}
 * @returns {*}
 * @private
 */
var getQueryStringSync = function _getQueryStringSync(args) {
  var q;

  if (isDef(args.q)) {
    q = quoteIfPhrase(args.q);
  }

  if (args._.length > 1) {  // not only search in _
    // if there are additional search terms/phrases,
    // they were collected as commands by the minimist (see examples above)
    // append those puppies to q
    forEach(args._.splice(1), function _adjQ(str) {
      q = (q ? q + ' ' : '') + quoteIfPhrase(str);
    });
  }

  out.trace('getQueryStringSync query: ' + q);
  return q;
};


/**
 * Wraps string in double quotes if it contains space
 * @param {String} str to check
 * @returns {String} possibly quoted string
 * @private
 */
var quoteIfPhrase = function _quoteIfPhrase(str) {
  return str.toString().indexOf(' ') > -1 ? wrapInQuotes(str) : str;
};


/**
 * Returns AND operator if explicitly specified by the user
 * Otherwise returns default OR
 * @returns {String} Operator
 * @private
 */
var getOperator = function _getOperator(args) {
  out.trace('isSOBT(argv.op): ' + isDef(args.op));
  if (args.and || (isDef(args.op) && args.op.toLowerCase() === 'and')) {
    return 'AND';
  } else {
    return 'OR';
  }
};


/**
 * Assembles filter according to query entered by the user
 * It checks whether user expressed time component and, if yes,
 * composes the filter accordingly
 * @returns assembled range filter
 * @private
 */
var getTimeRangeSync = function _getTimeRangeSync(args) {
  var range = {
    '@timestamp': {},
    "_cache": false
  };

  // first check whether user provided the time component (-t)
  if (!args.t) {
    // if -t is not specified, default time is the last 60m
    var millisInHour      = 3600000,
        nowMinusHour      = Date.now() - millisInHour,
        defaultStartTime  = (new Date(nowMinusHour)).toISOString();

    range['@timestamp'].gte = defaultStartTime;

  } else {

    // datetime param provided
    var t = '' + args.t,  // convert to string (if only digits: m = default)
        sep = args.sep || conf.getSync('rangeSeparator') || '/';

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
      range['@timestamp'].gte = parsed.start;
      if (isDef(parsed.end)) {  // if range, add the 'end' condition to the range
        range['@timestamp'].lt = parsed.end;
      }
    } else {
      warnAndExit('Unrecognized datetime format.', Search);
    }
  }

  out.trace('getTimeRangeSync returning:' + nl + stringify(range));
  return range;
};


/**
 * Assembles query object according to query entered by the user
 * It checks whether user entered one or more terms or a phrase?
 * It also checks whether the default operator, OR, is overridden
 * @returns assembled query object
 * @private
 */
var getQuerySync = function _getQuerySync(args) {
  var query = {
    query: {
      bool: {
        filter: {
          range: getTimeRangeSync(args)
        }
      }
    },
    sort: [{
      '@timestamp': args.sort || 'asc'
    }]
  };

  if (!isDef(args.q) && args._.length === 1) {
    // if client just entered 'logsene search'
    // give him back ALL log entries (from the last hour)
    return query;

  } else {
    query.query.bool.must = {
      query_string: {
        query: getQueryStringSync(args),
        default_operator: getOperator(args)
      }
    }
  }

  out.trace('Query about to be sent:' + nl + stringify(query));
  return query;
};

module.exports = Search;
