'use strict';
/* jshint node:true */
/* global module, process, console, require */

var inspect           = require('eyespect').inspector(),  // TODO dev only
    ask               = require('asking').ask,
    choose            = require('asking').choose,
    spinner           = require('simple-spinner'),
    VError            = require('verror'),
    map               = require('lodash.map'),
    pick              = require('lodash.pick'),
    forEach           = require('lodash.foreach'),
    filter            = require('lodash.filter'),
    size              = require('lodash.size'),
    isEmpty           = require('../lib/helpers').isEmpty,
    out               = require('../lib/helpers').out,
    isNullOrUndefined = require('../lib/helpers').isNullOrUndefined,
    conf              = require('../lib/config'),
    logsene           = require('../lib/logsene-api');

/* We handle authentication framework-style: this function
 * gets called before every run method of each command.
 *
 * In order to do anything with Logsene CLI, user has to
 * have api-key and appKey.
 * We help by allowing user to authenticate with user/pass.
 * The process of authentication writes api-key in the user's
 * configuration file, located in ~/.config folder.
 * The configuration file name is either SSH tty name,
 * (if the user has SSHd into the box) or logsene-[username]
 *
 * List of all apps for that API key is retrieved from the
 * API server. In there are both, app names and app keys.
 * We write down both to the local configuration file.
 */

var env = process.env,
    apiKey,
    appKey;

spinner.change_sequence(["◓", "◑", "◒", "◐"]);


module.exports = function _auth(next) {
  verifyApiKey(function(apiSuccess) {
    if (apiSuccess) {       // errors handled in the method
      verifyAppKey(function(appSuccess) {
        if (!appSuccess) {  // errors handled in the method
          out.error('Error verifying application token.');
          out.error('Exiting...');
          process.exit(1);
        } else {
          // all good
          setTimeout(next, 10); // back to command or the next middleware function
        }
      });
    }
  });
};

/**
 * Checks the local config for the API key
 * If not found locally, asks the user to login.
 * Login, if successful, yields the API key
 * Which is then written to the local configuration.
 * @param cb
 */
function verifyApiKey(cb) {

  // first try env var, but should never be there (new process)
  apiKey = env.LOGSENE_API_KEY;  //
  console.log('API key from env: ', apiKey);                    // TODO clean

  // then try the config file
  if (isEmpty(apiKey)) {
    apiKey = conf.getSync('api-key');
  }

  console.log('API key from config: ', apiKey);                 // TODO clean

  if (isEmpty(apiKey)) {
    console.log('No API key in local configuration.');          // TODO clean

    // if env and conf file don't deliver, ask the user to login
    getApiKeyWithCredentials(function(err, logseneApiKey) {
      if (err) return out.error('Unable to get the API KEY: ', err.message);
      console.log('api key from API: ', logseneApiKey);         // TODO clean
      conf.setSync('api-key', logseneApiKey);
      env.LOGSENE_API_KEY = logseneApiKey;  // until this process dies
    });

  } else {
    console.log('API key found in local user configuration.');  // TODO clean
    env.LOGSENE_API_KEY = apiKey;  // keep it in process-wide env var
  }

  return cb(!isEmpty(apiKey));
}


/**
 * Verifies whether all required app-related params are present
 * If not, prompts the user to choose an app (upon fetching them from API)
 * and stores the choice (app-key and app-name) in the configuration
 * Errors are not propagated back, they are handled in place
 * @param cb
 * @returns {Boolean} success
 */
function verifyAppKey(cb) {
  // if we find app-key in conf, use it
  appKey = conf.getSync('app-key');
  //appName = conf.getSync('app-name');

  if (!isEmpty(appKey)) {
    out.trace('Got APP key from local config: ' + appKey);
    return cb(true);

  } else {
    // if app-key is not in local config, ask the API server for all Logsene apps
    // then ask the user to choose if more than one app exists
    out.trace('calling getApps API');
    getApps(apiKey, function(err, logseneApps) {
      if (err) {
        out.error('Unable to get Logsene application list from the server.', err.message);
        out.error('Exiting');
        process.exit(1);
      }

      out.trace('API server returned: ', inspect(logseneApps));

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
        return pick(a, ['token', 'name']);
      });
      out.trace('Picked only subset of keys for apps: ');
      inspect(apps);                     // TODO clean


      if (activeAppsCnt === 0) {
        out.warn('There are no active Logsene apps for your api-key.\nExiting...');
        process.exit(0);
      }

      out.trace('Active apps:\n');
      inspect(activeApps);                  // TODO clean

      if (activeAppsCnt > 1) {
        // prompt user to choose one of active apps
        chooseApp(activeApps, function(err, chosenApp) {
          // error handled in chooseApp
          out.trace('Back in chooseApp callback.');

          conf.setSync('app-key', chosenApp.token);
          conf.setSync('app-name', chosenApp.name);
          return cb(true);
        });
      } else {
        // there's only one active Logsene app - use it without prompting the user
        conf.setSync('app-key', apps[0].token);
        conf.setSync('app-name', apps[0].name);
        return cb(true);
      }
    });

    // streaming doesn't make sense here since I have to prompt the user
    /*data
        .pipe(JSONStream.stringifyObject('body.data.apps.logsene'))
        .pipe(eventstream.mapSync(function(app){
          return {
            token: app.token,
            name: app.name,
            appStatus: app.appStatus
          };
        })).pipe(process.stdout);*/
  }
}


/**
 * Asks the client for username and password
 * Retrieves api key of that user
 *
 * @param {Function} mainCb
 * @api private
 */
function getApiKeyWithCredentials(mainCb) {

  ask ('Enter your username: ', function _usernameCb(errUser, user) {
    if (!isEmpty(user)) {
      conf.setSync('username', user);  // keep username around (btw: conf is sync)
      ask('Enter your password: ', {hidden: true}, function _passCb(errPass, pass) {
        if (!isEmpty(pass)) {

          spinner.start();
          logsene.login(user, pass, function _loginAPICall(errApi, key) {
            spinner.stop();
            if (errApi) return mainCb(new VError('Wrong username or password!', errApi));

            mainCb(null, key);
          })

        } else {
          out.warn('Password cannot be empty!. Try again');
          //getApiKeyWithCredentials(mainCb);
          process.exit(0);  // bail out, but stay quiet
        }
      });

    } else {
      out.warn('Username cannot be empty! Try again.');
      //getApiKeyWithCredentials(mainCb);
      process.exit(0);
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
    if (err) return cb(new VError(err, 'Cannot get application list from the API server.'));
    return cb(null, apps);
  });
}
