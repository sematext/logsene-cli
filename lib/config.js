'use strict';
/* jshint node:true */
/* global module, process, console, require */

var osenv = require('osenv'),
    Configstore = require('configstore');

var conf = new Configstore(process.env.SSH_TTY || osenv.user());


module.exports = {

  // TODO IMPORTANT: still missing timestamp check

  /**
   * Gets configuration parameter synchronously
   * @param {String} key
   * @public
   */
  getSync: function _getSync(key) {
    return conf.get(key);
  },


  /**
   * Sets the configuration parameter
   * If {{override}} is {{false}} it doesn' change
   * the existing param (default is {{true}})
   * @param {String} key
   * @param {String} value
   * @public
   */
  setSync: function _setSync(key, value) {
    conf.set(key, value);
  },


  /**
   * Gets all configuration parameters
   * for the current user
   * @returns {*|{get, set}}
   * @public
   */
  getAllSync: function _getAllSync() {
    return conf.all;
  }

};
