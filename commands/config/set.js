var Command = require('ronin').Command,
    argv    = require('minimist')(process.argv.slice(2)),
    fs      = require('graceful-fs'),
    os      = require('os'),
    api     = require('../../lib/logsene-api');



var Set = Command.extend({ use: ['auth'],
  desc: 'Set client\'s configuration parameter',

  run: function () {
    console.log(argv);  // TODO remove

    if (Object.keys(argv).length < 3 || !argv.user || !argv.pass) {
      console.error('Too few parameters\n');
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

module.exports = Set;
