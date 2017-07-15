'use strict';
/* jshint node:true */
/* global module, process, console, require */

var async             = require('async'),
    ask               = require('asking').ask,
    choose            = require('asking').choose,
    spinner           = require('simple-spinner'),
    VError            = require('verror'),
    stringify         = require('safe-json-stringify'),
    map               = require('lodash.map'),
    pick              = require('lodash.pick'),
    forEach           = require('lodash.foreach'),
    filter            = require('lodash.filter'),
    size              = require('lodash.size'),
    argv              = require('../lib/util').argv,
    isEmpty           = require('../lib/util').isEmpty,
    out               = require('../lib/util').out,
    isNullOrUndefined = require('../lib/util').isNullOrUndefined,
    conf              = require('../lib/config'),
    logsene           = require('../lib/logsene-api');

/* We handle authentication framework-style: this function
 * gets called before every run method of each command.
 *
 * In order to do anything with Logsene CLI, user has to
 * have apiKey and appKey.
 * We help by allowing user to authenticate with user/pass.
 * The process of authentication writes apiKey in the user's
 * configuration file, located in ~/.config folder.
 * The configuration file name is either SSH tty name,
 * (if the user has SSHd into the box) or logsene-<username>
 *
 * List of all apps for that API key is retrieved from the
 * API server. In there are both, app names and app keys.
 * We write down both to the local configuration file.
 */

var apiKey,
    appKey,
    traceMsg = '\nTurn on tracing (logsene config set --trace) and try again.';

spinner.change_sequence(["◓", "◑", "◒", "◐"]);


module.exports = function _auth(next) {

  // if the client is just turning tracing on, skip auth
  if (argv._.indexOf('set') > -1 && argv.trace) {
    return setTimeout(next, 50);
  }

  async.waterfall([
      // functions are basically sync if keys are found locally
      // so we need to wrap them to be executed on the next tick
      async.ensureAsync(verifyApiKey),
      async.ensureAsync(verifyAppKey)
    ],
    // this one doesn't need to be async
    function _finally(err, result) {
      if (err) {
        return out.error('Error logging in ' + (err.message ? err.message : '') + traceMsg);
      }
      if (result) {
        setTimeout(next, 50); // all good - back to command or the next middleware
      } else {
        out.error('Unable to login.' + traceMsg);
        process.exit(1);
      }
    }
  );
};


/**
 * Checks the current session for the API key
 * If not found locally, asks the user to login.
 * Login, if successful, yields the API key
 * Which is then written to the current session.
 * @param cb
 */
function verifyApiKey(cb) {
  // try the config file
  apiKey = conf.getSync('apiKey');

  if (!isEmpty(apiKey)) {
    out.trace('Got API key from local config: ', apiKey);
    return cb(null, apiKey);
  }

  if (isEmpty(apiKey)) {
    // if conf file doesn't deliver (first session or session timeout), ask the user to login
    getApiKeyWithCredentials(function(err, logseneApiKey) {
      if (err) return out.error('Unable to login: ' + err.message);
      out.trace('API key returned from the API server: ', logseneApiKey);
      conf.setSync('apiKey', logseneApiKey);
      return cb(null, logseneApiKey);
    });
  }
}


/**
 * Verifies whether application key is available in the session.
 * If not, prompts the user to choose an app (upon fetching them from API)
 * and stores the choice (appKey and appName) in the session.
 * @param cb
 * @param {String} apiKey
 * @returns {Boolean} success
 */
function verifyAppKey(apiKey, cb) {

  if (isEmpty(apiKey)) {
    return cb(new Error('No API key in APP request.'));
  }

  // if we find appKey in conf, use it
  appKey = conf.getSync('appKey');

  if (!isEmpty(appKey)) {
    out.trace('Got APP key from local config: ' + appKey);
    return cb(null, true);

  } else {
    // if appKey is not in local config, ask the API server for all Logsene apps
    // then ask the user to choose if more than one app exists
    out.trace('calling getApps API');
    getApps(apiKey, function(err, logseneApps) {
      if (err) {
        out.error(err.message);
        out.error('Exiting');
        process.exit(1);
      }

      out.trace('API server returned these apps: ');
      out.trace(stringify(logseneApps));

      if (isNullOrUndefined(logseneApps)) {
        out.warn('There are no Logsene applications for your API key.\nExiting');
        process.exit(0);
      }


      // from now on, work only with active apps
      var activeApps = filter(logseneApps, function(app) {
        return app.appStatus.toUpperCase() === 'ACTIVE';
      });

      var activeAppsCnt = size(activeApps);
      out.trace('Total # of apps: ' + size(logseneApps));
      out.trace('# of active apps: ' + activeAppsCnt);


      // keep only a subset of useful keys per each app
      var apps = map(logseneApps, function(a) {
        return pick(a, ['app-key', 'name']);
      });

      out.trace('Picked only subset of app keys: ');
      out.trace(stringify(apps));


      if (activeAppsCnt === 0) {
        out.warn('There are no active Logsene apps for your apiKey.\nExiting...');
        process.exit(0);
      }

      out.trace('Active apps:\n');
      out.trace(stringify(activeApps));

      if (activeAppsCnt > 1) {
        // prompt user to choose one of active apps
        chooseApp(activeApps, function(err, chosenApp) {
          // error handled in chooseApp
          out.trace('Back in chooseApp callback.');

          conf.setSync('appKey', chosenApp.token);
          conf.setSync('appName', chosenApp.name);
          out.info('Successfuly established Logsene ' + chosenApp.name + ' application session.');
          return cb(null, true);
        });
      } else {
        // there's only one active Logsene app - use it without prompting the user
        conf.setSync('appKey', apps[0].token);
        conf.setSync('appName', apps[0].name);
        out.info('Successfuly established Logsene ' + apps[0].name + ' application session.');
        return cb(null, true);
      }
    });
  }
}


/**
 * Asks the client for username and password
 * Retrieves api key of that user
 *
 * @param {Function} cb
 * @api private
 */
function getApiKeyWithCredentials(cb) {
  out.info('No active sessions. Please log in using your Sematext account:');
  ask ('Enter your username: ', function _usernameCb(errUser, user) {

    if (!isEmpty(user)) {
      conf.setSync('username', user);  // keep username around
      ask('Enter your password: ', {hidden: true}, function _passCb(errPass, pass) {

        if (!isEmpty(pass)) {
          spinner.start();
          logsene.login(user, pass, function _loginAPICb(errApi, key) {
            spinner.stop();
            if (errApi) {
              out.error('Login was not successful' + stringify(errApi));
              return cb(
                new VError('Login was not successful. Possibly wrong username or password.', errApi)
              );
            }

            out.info('Successfuly logged in and retrieved API key.');
            cb(null, key);

          })

        } else {
          out.warn('Password cannot be empty!. Try again');
          //getApiKeyWithCredentials(cb);
          process.exit(1);  // bail out, but stay quiet
        }
      });
    } else {
      out.warn('Username cannot be empty! Try again.');
      //getApiKeyWithCredentials(cb);
      process.exit(1);
    }
  });
}


/**
 * Prompts the user with active apps to choose
 * which one she wants to work with
 * @param {Array} apps - contains active app objects
 * @param cb
 */
function chooseApp(apps, cb) {
  var appsPrompt = {};

  forEach(apps, function(ap) {
    appsPrompt[ap['token']] = ap.name;
  });

  out.trace('Prepared list of apps for user prompt:\n' + JSON.stringify(appsPrompt));

  choose('Choose a Logsene app that you want to work with:\n',
      appsPrompt,
      function _chooseApp(err, name, token) {
        if (err) {
          out.error('Error occurred while prompting user to choose an app.');
          out.error(err.message);
          process.exit(1);
        } else {
          out.trace('Chosen app\'s name: ' + name);
          out.trace('Chosen app\'s token: ' + token);
          cb(null, {'token': token, 'name': name});
        }
      }
  );
}

/**
 * Get logsene applications for the suplied API key
 * from the API server
 * @param apiKey
 * @param cb - second param is Array of Logsene app objects
 * @private
 */
function getApps(apiKey, cb) {
  logsene.getApps(apiKey, function _getAppsCall(err, apps) {
    if (err) return cb(new VError(err));
    return cb(null, apps);
  });
}
