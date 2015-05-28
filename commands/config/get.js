'use strict';

var Command = require('ronin').Command,
    argv    = require('minimist')(process.argv.slice(2)),
    fs      = require('graceful-fs'),
    os      = require('os'),
    api     = require('../../lib/logsene-api');



var Get = Command.extend({ //use: ['auth'],
  desc: 'Get client\'s configuration parameter(s)',

  run: function () {
    if (Object.keys(argv).includes('--all')) {
      console.log(this.help());
    }

    if (argv.password ) {

    }
  },

  // returns usage help
  help: function () {
    return 'Usage: logsene ' + this.name + ' [OPTIONS]\n' +
        '  where OPTIONS may be:\n' +
        '    --user <username>\n' +
        '    --pass <password>\n';
  }
});

module.exports = Get;
