'use strict';

var Command = require('ronin').Command,
    spinner = require('simple-spinner'),
    argv    = require('minimist')(process.argv.slice(2)),
    inspect = require('eyespect').inspector(),
    chalk   = require('chalk'),
    api     = require('../lib/logsene-api');

spinner.change_sequence(["◓", "◑", "◒", "◐"]);
var error = chalk.bold.red,
    info  = chalk.bgGreen.black;

var Search = Command.extend({ use: ['auth'],
  desc: 'Search Logsene logs',

  run: function () {
    inspect(argv); // TODO clean

    // Object.keys(argv).length < 2
    if (argv._.length < 2) {
      console.warn('Too few parameters!\n');
      return console.log(this.help());
      // process.exit(0); // bail out without yelling
    } else if (argv._.length === 2) {
      argv.q = argv._[1];  // if no -q use next command as q
      inspect(argv); // TODO clean
    }

    spinner.start();
    api.search({q: argv.q}, function(err, hits) {
      spinner.stop();
      if(err) {
        return console.error(error('Search error: ' + err.message));
      }
      console.log(info(hits.hits.length + ' results:'));
      console.log(JSON.stringify(hits));
    });
  },

  help: function () {
    return 'Usage: logsene ' + this.name + ' [OPTIONS] query\n' +
    '  where OPTIONS may be:\n' +
    '    --q <search-query>\n' +
    '    -- <>\n';
  }
});

module.exports = Search;
