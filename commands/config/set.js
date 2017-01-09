'use strict'
/* jshint node:true */
/* global module, process, console, require */

var Command = require('ronin').Command
var stringify = require('safe-json-stringify')
var argv = require('../../lib/util').argv
var isEmpty = require('../../lib/util').isEmpty
var out = require('../../lib/util').out
var camelCase = require('../../lib/util').camelCase
var enableTrace = require('../../lib/util').enableTrace
var warnAndExit = require('../../lib/util').warnAndExit
var conf = require('../../lib/config')
require('colors')  // just bring in colors

var Set = Command.extend({ use: ['session', 'auth'],
  desc: 'Set current user\'s configuration parameter(s)',

  run: function _run () {
    if (argv.hasOwnProperty('trace')) {
      enableTrace(argv.trace)
    }

    // check explicitly for trace
    out.trace('Called with arguments: ' + stringify(argv))

    if (argv._.length < 2) {
      warnAndExit('Too few parameters!', this)
    } else if (argv._.length > 2) {
      warnAndExit('Too many parameters!', this)
    }

    if (isEmpty(argv['api-key']) && isEmpty(argv['token']) &&
        isEmpty(argv['default-size']) && isEmpty(argv['range-separator']) && isEmpty(argv['trace'])) {
      warnAndExit('No known parameters specified.', this)
    }

    var setParam = function _setParam (paramName) {
      if (!isEmpty(argv[paramName])) {
        conf.setSync(camelCase(paramName), argv[paramName])
        out.info('Successfuly set ' + paramName + ' to ' + argv[paramName])
      }
    }

    // multiple option params allowed in a single command
    // slightly smelly is that I don't know
    // with which param the set command was called
    // so I have to check them all
    conf.getAvailableParams().forEach(function _forEachParam (param) {
      setParam(param)
    })

    process.exit(0) // bail out - that's it
  },

  // returns usage help
  help: function _help () {
    return 'Usage: logsene config set [OPTIONS]\n'.bold +
        '  where OPTIONS may be:\n'.grey +
        '    --api-key <apiKey>\n'.yellow +
        '    --token <appKey>\n'.yellow +
        '    --default-size <size>\n'.yellow +
        '    --range-separator <sep>\n'.yellow +
        '    --trace <true|false>\n'.yellow +
        '\n' +
        'It is not necessary to explicitly set api-key nor token.\n' +
        'Logsene CLI will ask you to log in and choose Logsene application\n' +
        'if keys are missing from the configuration\n' +
        'Examples:\n'.underline.green +
        '  logsene config set --api-key 11111111-1111-1111-1111-111111111111\n'.blue +
        '      sets the api key for the current session\n'.grey +
        '\n' +
        '  logsene config set --token 22222222-2222-2222-2222-222222222222\n'.blue +
        '      sets Logsene application key for the current session\n'.grey +
        '\n' +
        '  logsene config set --default-size 3000\n'.blue +
        '      sets default number of hits returned for the current session (overrides the default 200)\n'.grey +
        '\n' +
        '  logsene config set --range-separator TO\n'.blue +
        '      sets default separator of two datetimes for time ranges (default is /, as per ISO6801)\n'.grey +
        '\n' +
        '  logsene config set --trace [true]\n'.blue +
        '      activates tracing for the current session (true can be omitted)\n'.grey +
        '\n' +
        '  logsene config set --trace false\n'.blue +
        '      deactivates tracing for the current session\n'.grey +
        '\n' +
        '--------'
  }
})

module.exports = Set
