'use strict';
/* jshint node:true */
/* global module, process, console, require */

var Command     = require('ronin').Command,
    argv        = require('minimist')(process.argv.slice(2)),
    isEmpty     = require('../../lib/helpers').isEmpty,
    out         = require('../../lib/helpers').out,
    warnAndExit = require('../../lib/helpers').warnAndExit,
    conf        = require('../../lib/config');


var Set = Command.extend({ use: ['auth'],
  desc: 'Set current user\'s configuration parameter(s)',

  run: function() {
    out.trace('argv: ', argv); // TODO Cleanup

    if (argv._.length !== 3) {
      warnAndExit('Too few or too many parameters.\n\n', this);
    }

    if (isEmpty(argv['api-key'])
        && isEmpty(argv['app-key'])
        && isEmpty(argv['app-name'])) {
      warnAndExit('No known parameters specified.\n\n', this);
    }

    // multiple option params allowed in a single command
    if (isEmpty(argv['api-key'])) {
      conf.setSync('api-key', argv['api-key']);
      out.info('Success.')
    }
    if (isEmpty(argv['app-key'])) {
      conf.setSync('app-key', argv['app-key']);
      out.info('Success.')
    }
    if (isEmpty(argv['app-name'])) {
      conf.setSync('app-name', argv['app-name']);
      out.info('Success.')
    }

    process.exit(0); // bail out - that's it
  },

  // returns usage help
  help: function () {
    return 'Usage: logsene ' + this.name + ' [OPTIONS]\n' +
        '  where OPTIONS may be:\n' +
        '    --api-key <apiKey>\n' +
        '    --app-key <appKey>\n' +
        '    --app-name <appName>\n'+
        '    --trace\n' +
        '  \n' +
        '--------\n';
  }
});

module.exports = Set;
