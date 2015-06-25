'use strict';
/* jshint node:true */
/* global module, process, console, require */

var Command     = require('ronin').Command,
    camelCase   = require('camel-case'),
    stringify   = require('safe-json-stringify'),
    argv        = require('../../lib/util').argv,
    isEmpty     = require('../../lib/util').isEmpty,
    out         = require('../../lib/util').out,
    enableTrace = require('../../lib/util').enableTrace,
    warnAndExit = require('../../lib/util').warnAndExit,
    conf        = require('../../lib/config');


var Set = Command.extend({ use: ['session', 'auth'],
  desc: 'Set current user\'s configuration parameter(s)',

  run: function _run() {

    if (argv.hasOwnProperty('trace')) {
      enableTrace(argv.trace);
    }

    // check explicitly for trace
    out.trace('Called with arguments: ' + stringify(argv));

    if (argv._.length < 2) {
      warnAndExit('Too few parameters!', this);
    } else if (argv._.length > 2) {
      warnAndExit('Too many parameters!', this);
    }

    if (isEmpty(argv['api-key'])
        && isEmpty(argv['app-key'])
        && isEmpty(argv['app-name'])
        && isEmpty(argv['range-separator'])
        && isEmpty(argv['trace'])) {
      warnAndExit('No known parameters specified.', this);
    }

    var setParam = function _setParam(paramName) {
      if (!isEmpty(argv[paramName])) {
        conf.setSync(paramName, argv[paramName]);
        out.info('Successfuly set ' + paramName + ' to ' + argv[paramName]);
      }
    };

    // multiple option params allowed in a single command
    // slightly smelly is that I don't know
    // with which param the set command was called
    // so I have to check them all
    conf.getAvailableParams().forEach(function _forEachParam(param) {
      setParam(camelCase(param));
    });


    process.exit(0); // bail out - that's it
  },

  // returns usage help
  help: function _help() {
    return 'Usage: logsene ' + this.name + ' [OPTIONS]\n' +
        '  where OPTIONS may be:\n' +
        '    --api-key <apiKey>\n' +
        '    --app-key <appKey>\n' +
        '    --app-name <appName>\n'+
        '    --range-separator <sep>\n'+
        '    --trace <true|false>\n' +
        '\n' +
        'It is not necessary to explicitly set api-key, app-key nor app-name.\n' +
        'logsene-cli will ask you to log in and choose Logsene application\n' +
        'if keys are missing from the configuration\n' +
        'Examples:\n' +
        '  logsene ' + this.name + ' --api-key 11111111-1111-1111-1111-111111111111\n' +
        '      sets the api key for the current session\n' +
        '\n' +
        '  logsene ' + this.name + ' --app-key 22222222-2222-2222-2222-222222222222\n' +
        '      sets Logsene application key for the current session\n' +
        '\n' +
        '  logsene ' + this.name + ' --range-separator TO\n' +
        '      sets default separator of two datetimes for time ranges (default is /, as per ISO6801)\n' +
        '\n' +
        '  logsene ' + this.name + ' --trace [true]\n' +
        '      activates tracing for the current session (true can be omitted)\n' +
        '\n' +
        '  logsene ' + this.name + ' --trace false\n' +
        '      deactivates tracing for the current session\n' +
        '\n' +
        '--------';
  }
});

module.exports = Set;
