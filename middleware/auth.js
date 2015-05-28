'use strict';

var json    = require('jsonfile'),
    touch   = require('touch'),
    home    = require('user-home'),
    ask     = require('asking').ask,
    request = require('request'),
    fs      = require('graceful-fs'),
    path    = require('path');

var apiUri  = 'https://apps.sematext.com/spm-reports/'

module.exports = function (next) {
  // check whether there is api-key in ~/.logsene
  var fullPath = path.join(home, '.logsene');
  touch.sync(fullPath, {atime: true, mtime: true});  // fails if it exists - so OK

  try {
    var conf = json.readFileSync(fullPath);
  } catch(fileEmptyError) {
    // JSON.parse requires try, since it's inherently synchronous
    // so the config file is empty

  }

  var apiKey = conf['api-key'];  // TODO check this

  if (!apiKey) {
    console.log('no api-key')  // TODO clean

    getApiKeyByCredentials(apiUri, function(err, resp) {
      if (err) throw err; // TODO
      console.log('response: ', resp);
      json.writeFileSync(fullPath, {'api-key': resp.data.apiKey});
    });
  }

  // we should have api-key here




  // throw new Error('Authentication failed');
  setTimeout(next, 500);
};



/**
 * Retrieves api key of the user whose
 * username and password is entered by
 * the client
 *
 * @param {Error} mainErr
 * @param {function} mainCb
 * @api private
 */
function getApiKeyByCredentials(url, mainCb) {
  ask ('Enter your username: ', function (err, user) {
    if (user && user !== '') {
      ask('Enter your password: ', {hidden: true}, function (err1, pass) {
        if (pass && pass !== '') {

          request({uri: url, json: true}, function (errReq, response, body) {
            if (!errReq && response.statusCode == 200) {  // are we good?

              mainCb(null, body);

            } else {
              if (response == undefined) {  // we're not good
                console.log("Something went wrong: ", errReq);
              } else {
                console.log("Something went wrong: HTTP status code: " + response.statusCode);
              }
            }
          });

        } else {
          console.warn('Password cannot be empty!');  // use chawk or prompt here
          process.exit(0);  // no errors, just message
        }
      });
    } else {
      console.warn('Username cannot be empty!');
      process.exit(0);
    }
  });
}