/*jshint maxerr:1000 */
'use strict';

/*
* Functions used to support start requirements of app
* Check authentication status
*
* @class appstartup
*/
var LOGTAG = 'appstartup';
var args = arguments[0] || {};
$.args = args;
$.lib = $.args.lib || Alloy.Globals.lib;
Ti.API.info('Initialising '+LOGTAG);
if (Ti.Shadow) { addSpy(LOGTAG, $); }

/**
 * System / app start tasks
 *
 * After the menu loads.
 */
var startup = $.lib.startup = {
  version: 0.1,
  startupWatchTimeoutId: -1,
  startupcompleted: false,
  ismenuloaded: false,
};
startup.checkVersion = function() {
  startup.version = 1.0;
  return LOGTAG + ' ' + (( startup.version === $.lib.startup.version) ? 'ok ' : 'ERROR: version mismatch ') + ' int: ' + startup.version + ' ext: ' + $.lib.startup.version;
};

startup.doAfterSignIn = function() {
};

startup.doAfterUserSelect = function() {
};

startup.doAfterMenuLoaded = function() {
  // TODO: move to startup complete / login done
  Alloy.CFG.logging && $.lib.logInfo('startup.doAfterMenuLoaded', LOGTAG);
  // if (Alloy.Globals.lib.appsettings.enablePush && _.isUndefined(Alloy.Globals.acspush)) {
  //   Alloy.CFG.logging && $.lib.logInfo('startup.doAfterMenuLoaded starting push after timeout', LOGTAG);
  //   setTimeout(function(){
  //     Alloy.Globals.acspush = Alloy.createController('base/libacspush');
  //   },
  //   250);
  //}
};

startup.reloadFromFile = function(){
};
startup.loadFromFile = _.once(startup.reloadFromFile);

/**
 * Return true if our local main cache is out of date (24 hours) and needs a requery
 */
startup.needServerRefresh = function() {
  // TODO: check whether we are online
  return false;
};

/**
 * Return true if our local contact cache is out of date (3 hours) and needs a requery
 */
startup.needServerContactRefresh = function() {
  // No local data
  return false;
};

startup.canServerRefresh = function() {
    return false;
};

startup.isQuickLaunchType = function() {
  return false;
};

/**
 * Verifies that all essentials (trunks, rates, config and contacts) are available in the cache. IF they are not, show an interstitial loading screen.
 * This function has a watchdog timeout, in case the wifi goes up/down whilst halfway through the download.
 *
 * @param {Boolean} forcerefresh - true to refresh NOW (when userinactive refresh from tapping the main menu header)
 */
startup.requireEssentials = function(forcerefresh, callbackOnLoaded) {
  if (_.isFunction(callbackOnLoaded)) {
    callbackOnLoaded();
  }
};

/**
 * Validate the user account (device+country, account not suspended) are OK to continue starting the app
 */
startup.validateAccount = function(forcerefresh, callbackOnLoaded) {
  if (_.isFunction(callbackOnLoaded)) {
    callbackOnLoaded();
  }
};

/**
 * Process all startup tasks on app load, and when the network comes online
 * 1. Validate all the essentials to run the app are present (trunks, rates, and config tables)
 * @param {Boolean} forcerefresh - true to refresh NOW (when userinactive refresh from tapping the main menu header)
 */

startup.startupTasks = function(forcerefresh, callbackOnLoaded) {
  if (!$.lib || !$.appsettings) return;
  Alloy.CFG.logging && $.lib.logInfo('Performing post UI startup tasks (SIP registration, contact caching, server update checks)');
};
startup.doPostUIStartupTasks = _.throttle(startup.startupTasks, 30000, {leading:true, trailing: false});