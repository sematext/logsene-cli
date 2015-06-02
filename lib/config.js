'use strict';
var levelup             = require('levelup'),
    home                = require('user-home'),
    path                = require('path'),
    logsene             = require('./logsene-api');

var fullPath  = path.join(home, 'logsene'),
    db = levelup(path.join(fullPath + 'logseneDB'), {valueEncoding: 'json'});


module.exports = {

  /**
   * Gets configuration parameter
   * @param {String} key
   * @param {Function} cb
   * @public
   */
  get: function _get(key, cb) {
    // not going with .logsene file - level to the rescue
    db.get(key, function (err, value) {
      if (err) return cb(new Error('Key not found: ', key));
      cb(null, value);
    });
    // when calling (err):
    // console.log(chalk.bold.red("Unable to get configuraion parameter " + key), confErr);
  },


  /**
   * Sets the configuration parameter
   * If {{override}} is {{false}} it doesn' change
   * the existing param (default is {{true}})
   * @param {String} key
   * @param {String} value
   * @param {Function} cb
   * @public
   */
  set: function _set(key, value, cb) {

    db.get(key, function (err, value) {
      if (err) return cb(new Error('Key not found: ', key));
      cb(null, value);
    });


    /*  ~/.logsene option

     // first check whether configuration exists and, if not, initialize the store
     maybeCreateFileSync(fullPath, 384); // decimal for octal 600 (strict)

     // check whether there is key in the conf file
     json.readFile(fullPath, function(err, conf) {
     inspect(conf);  // clean

     if (err) { // file is not a valid json

     // file is weird - scrap it (since we only have apiKey for now)
     // later we could instruct user to check it out manually
     // or, as a more convenient option, prompt her with values
     // to correct and then reconstruct the configuration store
     fs.writeSync(fullPath);
     maybeCreateFileSync(fullPath, 384);

     } else {
     // is our key inside
     if (conf.hasOwnProperty(key)) {

     } else {
     // config is KOK, but no our key inside - stick it in there
     json.writeFile(fullPath, {key: value}, {}, function() {
     console.log(chalk.green('API key stored successfully.'));
     })
     }
     }

     if (isDef(apiKey)) {
     // key found in configuration
     process.env.apiKey = apiKey;  // keep it in process-wide env var
     } else {
     console.log('no apiKey')  // clean

     getApiKeyUsingCredentials(apiUri, function(body) {
     if (err) throw err; // clean
     inspect(body);      // clean
     json.writeFileSync(fullPath, {'apiKey': body.data.apiKey});
     process.env.apiKey = body.data.apiKey;  // until the process dies
     });
     }
     });

     });
     */
  }



  /**
   * Retrieves api key of the user whose
   * username and password is entered by
   * the client
   *
   * @param {Error} mainErr
   * @param {function} mainCb
   * @api private
   */
  /*
   function getApiKeyUsingCredentials(mainErr, mainCb) {
   ask ('Enter your username: ', function (err, user) {
   if (user && user !== '') {
   ask('Enter your password: ', {hidden: true}, function (err1, pass) {
   if (pass && pass !== '') {

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
   }*/
};
