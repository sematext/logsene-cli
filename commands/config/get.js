'use strict';
/* jshint node:true */
/* global module, process, console, require */

var Command     = require('ronin').Command,
    argv        = require('minimist')(process.argv.slice(2)),
    forown      = require('lodash.forown'),
    //isEmpty     = require('../../lib/helpers').isEmpty,
    out         = require('../../lib/helpers').out,
    warnAndExit = require('../../lib/helpers').warnAndExit,
    conf        = require('../../lib/config');


var Get = Command.extend({ use: ['auth'],
  desc: 'Get current user\'s configuration parameter(s)',

  run: function() {
    out.trace('argv: ' + JSON.stringify(argv));

    if (argv._.length < 2) {
      warnAndExit('Too few parameters!\n\n', this);
    } else if (argv._.length > 2) {
      warnAndExit('Too many parameters!\n\n', this);
    }

    // logsene config get --all
    if (argv.all) {
      forown(conf.getAllSync(), function(v, k) {
        out.info(k + ': ' + v);
      });
      process.exit(0);  // done
    }

    // only one option param allowed in get
    if (argv['api-key']) {
      out.info('api-key: ' + conf.getSync('api-key'));
    } else if (argv['app-key']) {
      out.info('app-key: ' + conf.getSync('app-key'));
    } else if (argv['app-name']) {
      out.info('app-name: ' + conf.getSync('app-name'));
    } else {
      // no valid params found
      warnAndExit('No parameters specified.\n\n', this);
    }

    process.exit(0); // bail out - that's it
  },

  // returns usage help
  help: function () {
    return 'Usage: logsene ' + this.name + ' [OPTIONS]\n' +
        '  where OPTIONS may be:\n' +
        '    --api-key\n' +
        '    --app-key\n' +
        '    --app-name\n'+
        '    --trace\n\n' +
        '  \n' +
        '--------\n';
  }
});

module.exports = Get;
