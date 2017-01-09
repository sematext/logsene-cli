'use strict'
/* jshint node:true */
/* global module, process, console, require */
var help = require('./util')
var conf = require('./config')

var bootstrapped = {}

/**
 * Function that is executed once, used to setup
 * logsene specific stuff
 * @private
 */
var bootstrap = function _bootstrap () {
  process.title = 'logsene'

  // bootstrap tracing
  // first check cli params (has priority)
  // for one-time trace, it must be together with search (not get or set)
  if (help.argv._.hasOwnProperty('search') && help.argv.hasOwnProperty('trace')) {
    // console.log('argv trace: ' + help.argv.trace)
    help.enableTrace(help.argv.trace)
  } else if (typeof conf.getSync('trace') !== 'undefined') { // from the current session
    // console.log('conf trace: ' + conf.getSync('trace'))
    help.enableTrace(conf.getSync('trace'))
  }

  // put API URIs from the configuration to the env (to avoid hard-coding them in the API)
  process.env.LOGSENE_ES_HOST = conf.logseneEsHost
  process.env.LOGSENE_URI = conf.logseneUri

  // make this a one time gig
  bootstrapped.done = true
}

if (!bootstrapped.done) bootstrap()
