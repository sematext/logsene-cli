'use strict';
/* jshint node:true */
/* global module, process, console, require */

var Command     = require('ronin').Command,
    spinner     = require('simple-spinner'),
    argv        = require('minimist')(process.argv.slice(2)),
    inspect     = require('util').inspect,
    stream      = require('stream'),
    JSONStream  = require('JSONStream'),
    eventstream = require('event-stream'),
    stringify   = require('../lib/helpers').safeJsonStringify,
    out         = require('../lib/helpers').out,
    conf        = require('../lib/config'),
    api         = require('../lib/logsene-api');

//var $this = this;
spinner.change_sequence(["◓", "◑", "◒", "◐"]);


var Search = Command.extend({ use: ['auth'],
  desc: 'Search Logsene logs',

  run: function () {
    inspect(argv); // TODO clean

    // Object.keys(argv).length < 2
    if (argv._.length < 2) {
      console.warn(out.warn('Too few parameters!\n\n'));
      console.log(this.help());
      process.exit(1); // bail out
    } else if (argv._.length === 2) {
      // if no -q use first command after search as q
      // so we can do 'logsene search <query>'
      argv.q = argv._[1];
    }

    //spinner.start();  // TODO replace with isaacs spinner, which doesn't leave anything behind
    api.search({
      q:      argv.q,
      appKey: conf.getSync('appKey'),
      apiKey: conf.getSync('apiKey'),
      size:   argv.size || 200,
      offset: argv.offset || 0
    }, function(err, esReadable) {
      //spinner.stop();
      if(err) {
        console.error(out.error('Search error: ' + err.message));
        process.exit(1); // bail out
      }

      // TODO return final counter
      //console.log(out.info(hits.hits.length + ' results:'));

      // TODO pass back readable stream and handle the rest from here
      /*esReadable
          .pipe(JSONStream.parse('_source.*'))
          .pipe(eventstream.mapSync(function(data) {
            //out.info(data);
            return data._source || data;
          })).pipe(process.stdout);*/


      //console.log(stringify(hits));
      //esReadable.on('close', function() {process.exit(0);})
    });

  },


  help: function () {
    return 'Usage: logsene ' + this.name + ' query [OPTIONS]\n' +
    '  where OPTIONS may be:\n' +
    '    --q <search-query>       (Optional, but then query must come immediately after keyword ' + this.name + ')\n' +
    '    --size <return-size>     (Number of matches to return. Defaults to 20)\n' +
    '    --offset <return-offset> (Number of matches to skip. Defaults to 0)\n' +
    '\n' +
    '  Examples:\n' +
    '  logsene search --q ERROR --s 50\n' +
    '  returns at most 50 matches of term ERROR\n' +
    '\n' +
    '  logsene search ERROR --s 50\n' +
    '  equivalent to first example\n' +
    '\n' +
    '  logsene search ERROR --s 50 --offset 20\n' +
    '  returns hits from 21th to 71th (useful for paging)\n' +
    '  \n' +
    '--------\n';
  }
});

module.exports = Search;
