'use strict';
var json    = require('jsonfile'),
    touch   = require('touch'),
    inspect = require('eyespect').inspector(),  // TODO dev only
    home    = require('user-home'),
    ask     = require('asking').ask,
//    fs      = require('graceful-fs'),
    argv    = require('minimist')(process.argv.slice(2)),
    path    = require('path'),
    spinner = require('simple-spinner'),
    chalk   = require('chalk'),
    logsene = require('../lib/logsene-api');

/* We handle authentication framework-style: this function
 * gets called before every run method of each command */

var apiUri  = 'https://apps.sematext.com/users-web/api/v2/account/login';
var error = chalk.bold.red;
spinner.change_sequence(["◓", "◑", "◒", "◐"]);


module.exports = function _auth(next) {

  // check whether there is api-key in ~/.logsene
  var fullPath = path.join(home, '.logsene');

  touch(fullPath, {atime: true, mtime: true}, function() {
    // won't even touch it if it exists

    json.readFile(fullPath, function(err, conf) {
      if (!err) {
        // file is a valid json
        // override since we only have apiKey for now
        var apiKey = conf['apiKey'];
        inspect(conf);  // TODO clean
      }

      if (!apiKey) {
        console.log('no apiKey')  // TODO clean

        getApiKeyWithCredentials(apiUri, function(body) {
          if (err) throw err; // TODO
          inspect(body);  // TODO clean
          json.writeFileSync(fullPath, {'apiKey': body.data.apiKey});
          process.env.apiKey = body.data.apiKey;  // until the process dies
        });
      } else {
        // apiKey found in .logsene
        process.env.apiKey = apiKey;  // keep it in process-wide env var
      }
    });

  });

  // throw new Error('Authentication failed');
  setTimeout(next, 100);
};



/**
 * Retrieves api key of the user whose
 * username and password is entered by
 * the client
 *
 * @param {String} url api endpoint
 * @param {Function} mainCb
 * @api private
 */
function getApiKeyWithCredentials(errKey, mainCb) {
  ask ('Enter your username: ', function (err, user) {
    if (user && user !== '') {
      ask('Enter your password: ', {hidden: true}, function (err1, pass) {
        if (pass && pass !== '') {

          spinner.start();
          logsene.login(user, pass, function _loginCall(err, cb) {
            spinner.stop();
            if (err) {
              console.error(error('Password cannot be empty!'));  // use chawk or prompt here
              process.exit(0);  // no errors, just message
            }
          })

/*
          request({
            method: "POST",
            uri: url,
            json: true,
            body: {'username': user, 'password': pass}
          }, function (errReq, response, body) {
            if (!errReq && response.statusCode == 200) {  // are we good?

              mainCb(body);

            } else {
              if (response == undefined) {  // we're not good
                console.log("Something went wrong: ", errReq);
              } else {  // not 200
                console.log("Something went wrong: HTTP status code: " + response.statusCode);
                inspect(response.headers);
                inspect(response.body);
              }
            }
          });
*/
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