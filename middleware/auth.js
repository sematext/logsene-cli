var config  = require('config-file-nodash'),
    touch   = require('touch'),
    home    = require('user-home'),
    ask     = require('asking').ask,
    request = require('request'),
    fs      = require('graceful-fs'),
    path    = require('path');

module.exports = function (next) {
  // check whether there is api-key in ~/.logsene
  var fullPath = path.join(home, '.logsene');
  touch.sync(fullPath, {atime: true, mtime: true});  // fails if it exists - so OK

  var conf = config.load('.logsene', {});
  var apiKey = conf['api-key'];

  if (!apiKey) {
    getApiKeyByCredentials(errDummy, function() {
      //fs.writeFileSync(fullPath, {})  // TODO find better config-json package
    });
  }



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
function getApiKeyByCredentials(mainErr, mainCb) {
  ask ('Enter your username: ', function (err, user) {
    if (user && user !== '') {
      ask('Enter your password: ', {hidden: true}, function (err1, pass) {
        if (pass && pass !== '') {

          request({uri: url, json: true}, function (errReq, response, body) {
            if (!errReq && response.statusCode == 200) {  // are we good?
              cb(null, body);
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