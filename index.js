'use strict';

var ronin = require('ronin');

var program = ronin({
  path: __dirname,
  desc: 'Logsene command-line interface',
  options: {
    'api-key': '',
    'app-token': ''
  }
});

program.run();
