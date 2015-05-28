var Command = require('ronin').Command,
    spinner = require('simple-spinner'),
    argv    = require('minimist')(process.argv.slice(2)),
    ask     = require('asking').ask,
    api     = require('../lib/logsene-api');

spinner.change_sequence(["◓", "◑", "◒", "◐"]);


var Search = Command.extend({ use: ['auth'],
  desc: 'Search Logsene log',

  run: function () {

    if (Object.keys(argv).length < 2) {
      console.log(this.help());
    }

    api.search([], function(err, body) {

      console.log(JSON.stringify(body));
    });
  },

  help: function () {
    return 'Usage: logsene ' + this.name + ' [OPTIONS] query\n' +
    '  where OPTIONS may be:\n' +
    '    -g <username>\n' +
    '    -- <password>\n';
  }
});

module.exports = Search;
