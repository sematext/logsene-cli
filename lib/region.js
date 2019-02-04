'use strict';
/* jshint node:true */
/* global module, process, console, require */

var RegionEnum = Object.freeze({
  'US': {
    esHost: process.env.LOGSENE_ES_HOST,
    uri: process.env.LOGSENE_URI
  },
  'EU': {
    esHost: process.env.LOGSENE_ES_HOST_EU,
    uri: process.env.LOGSENE_URI_EU
  }
});

/**
 * Return a valid region string from the input string, or null if it is invalid.
 * @param {String} region region string entered by user
 * @public
 */
var getValidRegionString = function _getValidRegionString(region) {
  switch (String(region).toUpperCase()) {
    case 'EU':
      return 'EU';
    case 'US':
    case '': // empty string means default value => US
      return 'US';
    default:
      return null;
  }
}

/**
 * Return the ES Host URI for the given region
 * @param {String} region valid region string returned by getValidRegionString
 * @public
 */
var getEsHost = function _getEsHost(region) {
  return RegionEnum[region].esHost;
}

/**
 * Return the Logsene URI for the given region
 * @param {String} region valid region string returned by getValidRegionString
 * @public
 */
var getLogseneUri = function _getLogseneUri(region) {
  return RegionEnum[region].uri;
}

module.exports = {
    getEsHost:             getEsHost,
    getLogseneUri:         getLogseneUri,
    getValidRegionString:  getValidRegionString,
};