'use strict';
/* jshint node:true */
/* global module, process, console, require */

var Command     = require('ronin').Command,
    forown      = require('lodash.forown'),
    camelCase   = require('camel-case'),
    argv        = require('../../lib/helpers').argv,
    out         = require('../../lib/helpers').out,
    isEmpty     = require('../../lib/helpers').isEmpty,
    warnAndExit = require('../../lib/helpers').warnAndExit,
    conf        = require('../../lib/config');


var Get = Command.extend({ use: ['session', 'auth'],
  desc: 'Get current user\'s configuration parameter(s)',

  run: function _run() {
    out.trace('get command: argv: ' + JSON.stringify(argv));

    if (argv._.length < 2) {
      warnAndExit('Too few parameters!', this);
    } else if (argv._.length > 2) {
      warnAndExit('Too many parameters!', this);
    }

    // logsene config get --all
    if (argv.all) {
      forown(conf.getAllSync(), function(v, k) {
        out.info(k + ': ' + v);
      });
      process.exit(0);  // done
    }

    var getParam = function _getParam(paramName) {
      if (!isEmpty(argv[paramName])) {
        out.info(paramName + ': ' + conf.getSync(paramName));
        process.exit(0);  // only a single param per get command (or use get --all)
      }
    };

    // slightly dirty is that I don't know
    // which param the get command was called with
    // so I have to check all of them
    conf.getAvailableParams().forEach(function _forEachParam(param) {
      getParam(camelCase(param));
    });

    process.exit(0); // bail out - that's it
  },

  // returns usage help
  help: function _help() {
    return 'Usage: logsene ' + this.name + ' [OPTIONS]\n' +
        '  where OPTIONS may be:\n' +
        '    --api-key\n' +
        '    --app-key\n' +
        '    --app-name\n'+
        '    --trace\n\n' +
        '--------';
  }
});

module.exports = Get;
