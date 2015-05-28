/* Extract this API later in a separate public package */

var request = require('request'),
    api     = require('../lib/logsene-api'),

    // logseneUri = "https://logsene-receiver.sematext.com";
    logseneUri = "https://logsene-receiver.sematext.com/cc5e9c1b-3046-4e43-998e-2a0b2c01b912_2015-05-25%2Ccc5e9c1b-3046-4e43-998e-2a0b2c01b912_2015-05-26%2Ccc5e9c1b-3046-4e43-998e-2a0b2c01b912_2015-05-27%2Ccc5e9c1b-3046-4e43-998e-2a0b2c01b912_free/_search?from=0&size=20&version=true&ignore_unavailable=true";

/* We handle authentication with framework-style: with middleware/auth.js */

module.exports = {

  /**
   * Sends search query to Logsene
   * results in callback's second param
   * First param is err (which is always null)
   * returns search hits as JSON
   *
   * @param {cli args} arguments quasi-array
   * @param {cb} function callback
   * @api public
   */
  search: function _search(args, cb) {
    //var url = args.hostUrl + "search/" + args.q
    var url = logseneUri;

    request({uri: url, json: true}, function(err, response, body) {
      if (!err && response.statusCode == 200) {  // are we good?
        cb(null, body);
      } else {
        if (response == undefined) {  // we're not good
          console.log("Something went wrong: ", err);
        } else {
          console.log("Something went wrong: HTTP status code: " + response.statusCode);
        }
      }
    });
  },

  streamLogEvents: function _streamLogEvents(args, cb) {
    var url = args.hostUrl + "log-stream/" + args.streamId;

    request({uri: url, json: true}, function(err, response, body) {
      if (!err && response.statusCode == 200) {  // we're good
        cb(body)
      } else {
        if (response == undefined) {  // we're not good
          console.log("Something went wrong: Unable to get the log stream!", err)
        } else {
          console.log("Something went wrong: Unable to get the log stream. HTTP error code " + response.statusCode)
        }
      }
    })
  }

};
