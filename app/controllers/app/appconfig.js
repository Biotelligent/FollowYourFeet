/*jshint maxerr:1000 */
'use strict';

/*
* Configuration
*
* @class appconfig
*/
var LOGTAG = 'appconfig';
var args = arguments[0] || {};
$.args = args;
$.lib = $.args.lib || Alloy.Globals.lib;
Ti.API.info('Initialising '+LOGTAG);
if (Ti.Shadow) { addSpy(LOGTAG, $); }

var config = $.lib.config = {
  version: 0.1,
  isloaded: false,
  essentialsloaded: false,
  isdebugmode: Alloy.Globals.lib.isdebugmode,
  signup: false, // not stored, used to ensure back button exits app.
  isnewsetup: true,
  wasnewsetup: true,
  updateheader: false,
  userdisplayname: '',
  useraccount: {},
  useroptions: {},
  usercountry: {},

  lastcachetime: null,       // GMT timestamp of last server check for rates/trunks/config
  lastcontactrefresh: null,  // GMT timestamp of last server check for contacts
  countryprefix: '44',
  countrycode: 'GB',         // TODO: platform.currentCountry = platform.isSimulator ? 'GB' : Ti.Locale.currentCountry;  issue where simulators are all US
  paymentcurrency: 'GBP',
  onChange: undefined,
};
config.checkVersion = function() {
  config.version = 1.0;
  return LOGTAG + ' ' + (( config.version === $.lib.config.version) ? 'ok ' : 'ERROR: version mismatch ') + ' int: ' + config.version + ' ext: ' + $.lib.config.version;
};

/**
 * @method clearConfiguration
 * Wipe all the properties and data tables; for instance after a 401 (account suspended) or country change.
 * @return {Boolean} true if completed
 */
config.clearConfiguration = function(wipeuserconfig) {
  // Don't clear devices property - we don't want to re-post even when cache info changes

  // Ti.App.Properties.removeProperty('lastcachetime'); // The last date the serverconfig was stored
  // Ti.App.Properties.removeProperty('essentialsloaded');

  Ti.App.Properties.removeProperty('signin-password');
  Ti.App.Properties.removeProperty('acspushtoken');
  Ti.App.Properties.removeProperty('oauthtoken');

  if (true === wipeuserconfig) {
    Ti.App.Properties.removeProperty('signin-email');
    Ti.App.Properties.removeProperty('token');
    Ti.App.Properties.removeProperty('isnewsetup');
    Ti.App.Properties.removeProperty('usercountry');
    Ti.App.Properties.removeProperty('useraccount');
    Ti.App.Properties.removeProperty('useroptions');
    config.useraccount = {token: ''};
    config.save();
    config.load();
    
    if (Alloy.Globals.acspush) {
      //Alloy.Globals.acspush.clearPush(); cannot reinit
    }
  }

  return true;
};


/**
 * @method essentialsLoaded
 * @return {Boolean} true if all of the essential configuration elements are available in the cache
 */
config.essentialsLoaded = function(apply) {
  // TODO? verify if this is necessary per country; since we parse serverconfig out for a single country only
  if (true === apply) {
    Alloy.CFG.logging && $.lib.logInfo('Storing essentialsLoaded property', LOGTAG);
    Ti.App.Properties.setInt('essentialstimestamp', _.now());
    Ti.App.Properties.setString('essentialsloaded', (new Date()).toUTCString());
    Ti.App.Properties.setString('lastcachetime', (new Date()).toUTCString());
    return apply;
  }

  if (Ti.App.Properties.hasProperty('essentialsloaded')
  && Ti.App.Properties.hasProperty('devices')
  && Ti.App.Properties.hasProperty('prefixes')) {
    return true;
  } else {
    return false;
  }
};

/**
 * @method contactsProcessed
 * @param {Boolean} apply - updates the property flag to indicate all conditions are met
 * @return {Boolean} true if the essential contact elements are available in the cache (includes linked at least once to the server msisdn/search)
 */
config.contactsProcessed = function(apply) {
  if (true === apply) {
    Alloy.CFG.logging && $.lib.logInfo('Storing lastcontactrefresh property', LOGTAG);
    $.lib.config.lastcontactrefresh = (new Date()).toUTCString();
    Ti.App.Properties.setString('lastcontactrefresh', $.lib.config.lastcontactrefresh);
    Ti.App.Properties.setInt('contactsprocessedtimestamp', _.now());
    return apply;
  }

  if (OS_IOS && (Ti.Contacts.contactsAuthorization != Ti.Contacts.AUTHORIZATION_AUTHORIZED)) {
    $.lib.logError('Contacts access has not been authorized');
    return false;
  }

  if (Ti.App.Properties.hasProperty('lastcontactrefresh')) {
  //&& Alloy.Globals.contact.hasCache()) {
    return true;
  } else {
    return false;
  }
};

/**
 * (Re)loads the config after each server query which causes a configuration change
 */
config.token = function() {
  $.lib.logInfo('int ' + config.useraccount.token + ' ' + config.countrycode + ' ext ' + $.lib.config.useraccount.token + ' ' + $.lib.config.countrycode, LOGTAG);
};

config.load = function() {
  //initonce();
  var useraccountdefaults = {verified: false, token: undefined, displayname: '', firstname: undefined, lastname: undefined, location: 'GB', msisdn: undefined};
  var useroptiondefaults =  {isnewsetup: true};
  var usercountrydefaults = {countryprefix: '44', countrycode: 'GB', paymentcurrency: 'GBP', systemcountry: Ti.Locale.getCurrentCountry()};


  // If loading the config goes titsup, we need to reinstall
  config.signup = false; // Not stored. Used to ensure the back button exits the app.
  config.isnewsetup = true;
  config.useraccount.verified = false;
  config.doneonce = config.doneonce || false;

  try {
    config.isnewsetup   = Ti.App.Properties.getBool('isnewsetup', config.isnewsetup);
    config.usercountry  = Ti.App.Properties.getObject('usercountry', config.usercountry);
    config.useraccount  = Ti.App.Properties.getObject('useraccount', config.useraccount);
    config.useroptions  = Ti.App.Properties.getObject('useroptions', config.useroptions);
    _.defaults(config.usercountry, usercountrydefaults);
    _.defaults(config.useraccount, useraccountdefaults);
    _.defaults(config.useroptions, useroptiondefaults);

    config.useraccount.token = Ti.App.Properties.getString('token', config.useraccount.token);

    // Server appsettings
    if (false === config.doneonce) {
      config.updateAppSettings(undefined, true);
      config.doneonce = true;
    }

    config.updateUserName();
    config.lastcachetime = Ti.App.Properties.getString('lastcachetime', null);
    config.lastcontactrefresh = Ti.App.Properties.getString('lastcontactrefresh', null);

    config.updateDebugSettings();


    config.isloaded = true;
  } catch(E) {
    $.lib.logError(E, 'CRITICAL');
  }
};

/**
 * Enable certain debug settings when flagged from a build or user account
 */
config.updateDebugSettings = function() {
  config.debug = Alloy.Globals.lib.debug;
  config.debug.isdeveloper = exports.isbeta && _.isString(config.useraccount.email) && (config.useraccount.email.endsWith('@netfuse.org') || config.useraccount.email.containsText('jholloway@gmail.com')) ? true : false;
  config.appversion = Ti.App.name + ' ' + Ti.App.version;
  if (config.debug.isdeveloper) {
    config.appversion += ' [netfused]';
  } else if (config.isdebugmode) {
    config.appversion += ' [debug]';
  }
};

/**
 * Apply the systemwide appsetting overrides from the server (eg. enableZChat)
 * I only want this in a weeklyrelease or production build.
 */
config.updateAppSettings = function(newsettings, firechangeevent) {
  firechangeevent = firechangeevent || false;
  if (newsettings) {
    Alloy.CFG.logging && $.lib.logInfo('*** APPLYING SERVER APPSETTINGS ');
    _.extend($.lib.appsettings, newsettings);
    if (! _.isUndefined(newsettings.enableBetaTester)) {
      config.updateDebugSettings();
    }
    firechangeevent = true;
  }

  if (true === firechangeevent) {
    config.fireChangeEvent();
  }
};

/**
 * Updates the details linked to the user name fields
 */
config.updateUserName = function(force) {
  if (force || (config.useraccount.displayname === '')) {
    config.useraccount.displayname = (config.useraccount.firstname || '') + ' ' + (config.useraccount.lastname || '');
    config.useraccount.displayname = config.useraccount.displayname.trim();
  }
  config.userdisplayname = config.useraccount.displayname; //Ti.App.Properties.getString('userdisplayname', config.user);
  config.useraccount.verified = $.lib.isNullOrBlank(config.useraccount.token)/* || $.isNullOrBlank(config.useraccount.displayname)*/ ? false : true;
};

/**
 * Set the location; when it has changed we need to reload the rates (prefixes)
 * @param {String} isocode - 2-alpha iso code eg. GB
 * @param {Boolean} userconfirmed - the user has confirmed any mismatch against the system location is OK
 * @param {String} countryname - the country name displayed in the message
 */
config.updateLocation = function(isocode, userconfirmed, onLocationChanged) {
  if (isocode != $.lib.config.useraccount.location) {
    Alloy.CFG.logging && $.lib.logInfo('config.updateLocation ' + ' new isocode=' + isocode + ' Ti.Locale.getCurrentCountry()=' + Ti.Locale.getCurrentCountry() + ' $.lib.config.countrycode=' + $.lib.config.countrycode + ' $.lib.config.useraccount.location=' + $.lib.config.useraccount.location);
    $.lib.logError('TODO: apply rates, payment, currency changes, and callbar minutes on country change', LOGTAG);
  }
};

/**
 * Save the user configuration on change...
 * Db style objects like trunks/rates/contacts are saved as by the respective libraries to reduce overhead
 */
config.save = function() {
  config.wasnewsetup = config.isnewsetup;
  config.isnewsetup = false;

  config.updateUserName();
  Ti.App.Properties.setBool('isnewsetup', config.isnewsetup);
  Ti.App.Properties.setObject('useraccount', config.useraccount);
  Ti.App.Properties.setString('token', config.useraccount.token);

  if (! $.lib.isNull(config.lastcachetime)) { Ti.App.Properties.setString('lastcachetime', config.lastcachetime); }
  if (! $.lib.isNull(config.lastcontactrefresh)) { Ti.App.Properties.setString('lastcontactrefresh', config.lastcontactrefresh); }
  config.userdisplayname = config.useraccount.displayname;
};

/**
 * Callback to update menu headers, recording counts etc
 */
config.fireChangeEvent = function() {
  try {
    if (_.isFunction(config.onChange)) {
      config.onChange();
    }
  } catch(E) {
    $.lib.logError(E, 'config.save.onChange');
  }
};

config.exists = function() {
  return ! config.isnewsetup;
};

/**
 * Has the user successfully completed the full registration process
 * @result {Boolean} Return true if the user has valid stored data and a token to authenticate
 */
config.isverifieduser = function() {
  return (config.useraccount && config.useraccount.verified && ! $.lib.isNullOrBlank(config.useraccount.token)) ? true : false;
};

/**
 * The country code from the msisdnprefix
 * This depends on the prefixes table being reverse sorted long to short so 188 (Antigua) matches before 1 (US)
 *
 * @param {Number} msisdnprefix - the (stripped) 5 digit prefix that will match a country table entry.
 * @result {Object} the country object as {id": "171", "name": "Slovenia", "iso": "SI", "prefix": "386"}
 */
config.countryFromPrefix = function(msisdnprefix) {
  if (_.isString(msisdnprefix)) {
    try {
      if (_.isUndefined($.lib.config.prefixes)) {
        $.lib.config.prefixes = Ti.App.Properties.getObject('prefixes', {});
      }
      var matched = _.find($.lib.config.prefixes, function(country) {
        return msisdnprefix.startsWith(country.prefix);
      });
      return matched;
    } catch(E) {
      $.lib.logError(E, LOGTAG+'.callRate');
      return undefined;
    }
  } else {
    return undefined;
  }
};

/**
 * The country flag from the msisdnprefix
 *
 * @param {Number} msisdnprefix - the (stripped) 5 digit prefix that will match a rate table entry.
 * @result {String} the flag image file /flags/GB.png
 */
config.countryFlag = function(msisdnprefix) {
  var country = $.lib.config.countryFromPrefix(msisdnprefix);
  if (country && country.iso) {
    return '/flags/' + country.iso + '.png';
  } else {
    return $.lib.noimage;
  }
};

/**
 * Save and reload the last "favourite" screen without having to go through the menu
 *
 * @param {String} name - controllername, ie. ZCall/ZRec/ZMsg
 * @param {Integer} tabindex - last active tab, where that applies
 */
config.saveLastScreen = function(name, tabindex) {
  if ($.lib.debug.isunittest) return;
  Ti.App.Properties.setObject('app_lastscreen', {controllername: name, tabindex:tabindex});
};

config.openLastScreen = function() {
  if ($.lib.debug.isunittest) return;
  var _lastscreen = Ti.App.Properties.getObject('app_lastscreen', {});
  if (_.isObject($.lib.debug.testlastscreen)) {
    _lastscreen = $.lib.debug.testlastscreen;
  } else {
    return;
  }
  try {
    if (_lastscreen && _lastscreen.controllername) {
      Alloy.CFG.logging && $.lib.logInfo('Loading lastscreen - startup is completed ' + _lastscreen.controllername, LOGTAG);
      if (Alloy.Globals.mainmenu && _.isFunction(Alloy.Globals.mainmenu.selectMenuItemByName)) {
        Alloy.Globals.mainmenu.selectMenuItemByName(_lastscreen.controllername);
      }
      $.lib.nav.showController(_lastscreen.controllername, {tabindex: _lastscreen.tabindex});
    } else {
      Alloy.CFG.logging && $.lib.logInfo('Loading lastscreen - none saved', LOGTAG);
    }
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.openLastScreen');
    Ti.App.Properties.setObject('app_lastscreen', {});
    $.lib.nav.showMainMenu();
  }
};

/*
 * Handle an authentication error, which may happen anytime.
 * Its likely this will occur whilst in background, in which case we need to send a notification
 *
 * We generally only check the server once every 3 hours.
 * If we get an authorization failed" 401 message, we should block all other activity (PSTN dialling etc) and have the user reverify from the signup screen
 *
 */
//config.singleAuthenticationError = _.once(function(e) {
config.singleAuthenticationError = function(e) {
  $.lib.logError('authenticationError - triggering signout process once');
  try {
    //var currentcontroller = Alloy.Globals.activecontroller;
    config.useraccount.verified = false;
    config.useraccount.token = null;
    config.useraccount = {};
    config.save();
    config.load();
    config.isnewsetup = true;
    if (Alloy.Globals.sip) {
      Alloy.Globals.sip.signOut();
    }
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.singleAuthenticationError');
  } finally {
    if (! $.lib.nav.isActive('Signup')) {
      $.lib.nav.openModalWindow('Signup');
    }
   setTimeout(function(e) { $.lib.nav.showError(L('error-authfailed', 'Please verify your ZoopaChat account')); }, 1000);
  }
};
config.throttledAuthenticationError = _.throttle(config.singleAuthenticationError, 20000, {leading:true, trailing: false});
config.authenticationError = function(e) {
  $.lib.logError('authenticationError 401');
  config.singleAuthenticationError(e);
};

//_.extend($.lib.config, config);
