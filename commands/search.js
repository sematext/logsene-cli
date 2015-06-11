'use strict';
/* jshint node:true */
/* global module, process, console, require */

// not ideal place, but circular dependency otherwise
require('../lib/bootstrap');  // throw away, just bootstrap

var Command         = require('ronin').Command,
    //spinner         = require('simple-spinner'),
    inspect         = require('util').inspect,
    JSONStream      = require('JSONStream'),
    Transform       = require('stream').Transform,
    eos             = require('end-of-stream'),
    argv            = require('../lib/helpers').argv,
    out             = require('../lib/helpers').out,
    isDef           = require('../lib/helpers').isDef,
    isStrOrBoolTrue = require('../lib/helpers').isStrOrBoolTrue,
    conf            = require('../lib/config'),
    api             = require('../lib/logsene-api');

//var $this = this;
//spinner.change_sequence(["◓", "◑", "◒", "◐"]);


var Search = Command.extend({ use: ['auth'],
  desc: 'Search Logsene logs',

  run: function _run() {
    inspect(argv); // TODO clean

    if (argv._.length < 2) {
      out.warn('Too few parameters!\n\n');
      out.info(this.help());
      process.exit(1); // bail out
    } else if (argv._.length === 2) {
      // if no -q use first command after search as q
      // so 'logsene search <query>' works as expected
      argv.q = argv._[1];
    }

    //spinner.start();
    api.search({
      q:        argv.q,
      apiKey:   conf.getSync('apiKey'),
      appKey:   conf.getSync('appKey'),
      size:     argv.size || conf.getSync('defaultSize') || conf.maxHits,
      offset:   argv.offset || 0,
      logLevel: argv.trace || isStrOrBoolTrue(conf.getSync('trace')) ? 'trace' : 'error'
  }, function(err, esReadableHits) {
      //spinner.stop();
      if(err) {
        out.error('Search error: ' + err.message);
        process.exit(1); // bail out
      }

      var extractor = new Transform({objectMode: true}),
          hitCnt = 0;

      extractor._transform = function _extractorTransform(data, encoding, next) {
        this.push(isDef(data['_source']) ? data['_source'] : data);
        hitCnt++;
        next();
      };

      eos(esReadableHits, function(err) {
        if (err) {
          out.error('ES stream had an error or closed early.');
          process.exit(1);
        }
        out.info('\nReturned hits: ' + hitCnt + (hitCnt === 200 ? ' (max)' : ''));
        process.exit(0);
      });

      // pipe em up
      esReadableHits
          .pipe(extractor)
          .pipe(JSONStream.stringify(false))
          .pipe(process.stdout);

    });
  },


  help: function _help() {
    return 'Usage: logsene ' + this.name + ' query [OPTIONS]\n' +
    '  where OPTIONS may be:\n' +
    '    --q <search-query>    (Query string)\n' +
    '    --s <return-size>     (Number of matches to return. Defaults to 200)\n' +
    '    --o <return-offset>   (Number of matches to skip. Defaults to 0)\n' +
    '\n' +
    '  Examples:\n' +
    '  logsene search --q ERROR --s 50\n' +
    '      returns at most 50 matches of term ERROR\n' +
    '\n' +
    '  logsene search ERROR --s 50\n' +
    '      equivalent to the previous example\n' +
    '\n' +
    '  logsene search ERROR --s 50 --o 20\n' +
    '      returns hits from 21th to 71th\n' +
    '  \n' +
    '--------\n';
  }
});

module.exports = Search;
