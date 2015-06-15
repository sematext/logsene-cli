'use strict';
/* jshint node:true */
/* global module, process, console, require */

// not ideal place, but circular dependency otherwise
require('../lib/bootstrap');  // throw away, just bootstrap

var Command         = require('ronin').Command,
    inspect         = require('util').inspect,
    JSONStream      = require('JSONStream'),
    values          = require('lodash.values'),
    forEach         = require('lodash.foreach'),
    Transform       = require('stream').Transform,
    eos             = require('end-of-stream'),
    argv            = require('../lib/helpers').argv,
    out             = require('../lib/helpers').out,
    isDef           = require('../lib/helpers').isDef,
    isStrOrBoolTrue = require('../lib/helpers').isStrOrBoolTrue,
    conf            = require('../lib/config'),
    api             = require('../lib/logsene-api');


var Search = Command.extend({ use: ['session', 'auth'],
  desc: 'Search Logsene logs',

  run: function _run() {
    inspect(argv); // TODO clean

    if (argv._.length < 2) {
      out.warn('Too few parameters!\n');
      out.info(this.help());
      process.exit(1); // bail out
    } else if (argv._.length === 2) {
      // if no -q use first command after search as q
      // so 'logsene search <query>' works as expected
      argv.q = argv._[1];
    }


    api.search({
      q:        argv.q,
      apiKey:   conf.getSync('apiKey'),
      appKey:   conf.getSync('appKey'),
      size:     argv.s || conf.getSync('defaultSize') || conf.maxHits,
      offset:   argv.o || 0,
      logLevel: argv.trace || isStrOrBoolTrue(conf.getSync('trace')) ? 'trace' : 'error'
  }, function(err, esReadableHits) {
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
        hitCnt++;
        next();
      };

      eos(esReadableHits, function _esReadableHits(err) {
        if (err) {
          out.error('ES stream had an error or closed early.');
          process.exit(1);
        }
        // remove so that client gets pure tsv or json
        //out.info('\nReturned hits: ' + hitCnt + (hitCnt === 200 ? ' (max)' : ''));
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
    return 'Usage: logsene ' + this.name + ' query [OPTIONS]\n' +
    '  where OPTIONS may be:\n' +
    '    --q <query>    (Query string)\n' +
    '    --s <size>     (Number of matches to return. Defaults to ' + conf.maxHits + ')\n' +
    '    --o <offset>   (Number of matches to skip. Defaults to 0)\n' +
    '    --json         (Returns JSON instead of TSV)\n' +
    '    --trace        (Turns on one-time tracing. Use only for troubleshooting, it messes up output)\n' +
    '\n' +
    'Examples:\n' +
    '  logsene ' + this.name + ' --q ERROR --s 50\n' +
    '      returns at most 50 highest ranked matches of term ERROR\n' +
    '\n' +
    '  logsene ' + this.name + ' ERROR --s 50\n' +
    '      equivalent to the previous example\n' +
    '\n' +
    '  logsene ' + this.name + ' ERROR --s 50 --o 20\n' +
    '      returns hits from 21th to 71th\n' +
    '\n' +
    '--------';
  }
});

module.exports = Search;
