/*jshint maxerr:1000 */
'use strict';

/*
* Configuration
*
* @class libplatform
*/
var LOGTAG = 'libplatform';
var args = arguments[0] || {};
$.args = args;
$.lib = $.args.lib || Alloy.Globals.lib || {};
Ti.API.info('Initialising '+LOGTAG);
if (Ti.Shadow) { addSpy(LOGTAG, $); }

var moment = require('alloy/moment');
var self = {};

/*
 * PLATFORM HELPERS
 */
var platform = $.lib.platform = {
  version: 0.1,
  allowLandscape: false,
  initialised: false,
  orientation: -1,
  IOS7: false,
  IOS8: false,
  IOS9: false,
  workingTop: 0,
  workingWidth: 0,
  workingHeight: 0,
  tabHeight: 0,
  isSimulator: false,
  isTablet: false,
  showTabFunction: null,
  fixAndroidTitlebar: false,
  currentCountry: 'GB',
  orientationModes: [Ti.UI.PORTRAIT,Ti.UI.UPSIDE_PORTRAIT], // when debugging tablet + landscape, limit to landscape to force the simulator layout
  idleTimeoutId: null,
  onIdleTimeout: undefined,
};
platform.checkVersion = function() {
  platform.version = 1.0;
  return LOGTAG + ' ' + (( platform.version === $.lib.platform.version) ? 'ok ' : 'ERROR: version mismatch ') + ' int: ' + platform.version + ' ext: ' + $.lib.platform.version;
};


platform.saveSessionStart = function() {
  if (Ti.App.sessionId != Ti.App.Properties.getString('sessionid', 'none')) {
    //Alloy.CFG.logging && $.lib.logInfo('New session started with id ' + Ti.App.sessionId, LOGTAG);
    Ti.App.Properties.setString('sessionid', Ti.App.sessionId);
    Ti.App.Properties.setString('sessionstart', (new Date()).toString());
  }
};

/**
 * How long have we been running for? Check session start
 * @return {Integer} - number of minutes since the app was first opened for this session (recorded in first config.load)
 */
platform.uptime = function() {
  var _uptime = 0;
  try {
    var starttime = Ti.App.Properties.getString('sessionstart', '');
    if (starttime !== '') {
       _uptime = platform.durationBetween('minutes', starttime);
    }
  } catch(E) {
  }
  return _uptime;
};

/**
 * Keeps a user idle timer running IFF there is a handler
 */
platform.resetIdleTimeout = function() {
  clearTimeout(platform.idleTimeoutId);
  return; // n/a Feet

  if (platform.onIdleTimeout) {
    Alloy.CFG.logging && $.lib.logInfo('resetIdleTimeout');
    platform.idleTimeoutId = setTimeout(function(e){

      if (_.isFunction(platform.onIdleTimeout)) {
        platform.onIdleTimeout();
      }
      // Set up the timer again, as the check will usually pass without any work needing to be done.
      platform.resetIdleTimeout();
    },
    900000); // Trigger after 15 minutes of inactivity
  }
};

platform.init = function(rootwindow, tabHeight) {
  // Pass the root window (eg. $.index) to hook postLayout and calculate the correct working area
  tabHeight = 0;// tabHeight || platform.tabHeight;
  platform.initialised = (true === platform.initialised) && (platform.orientation === Ti.Gesture.orientation);
  if (platform.initialised && (tabHeight === platform.tabHeight)) return;
  Ti.API.info('lib.platform.init tabHeight=' + tabHeight);

  // Refer also shared/versions.js if needed
  var IOS9 = OS_IOS && parseInt(Ti.Platform.version, 10) > 8 ? true : false;
  var IOS8 = (true === IOS9) || (OS_IOS && parseInt(Ti.Platform.version, 10) > 7) ? true : false;
  var IOS7 = (true === IOS8) || (OS_IOS && parseInt(Ti.Platform.version, 10) > 6) ? true : false;
  var workingTop = OS_ANDROID ? 0 : (IOS7 ? 20 : 0); // fixAndroidTitlebar
  var workingWidth = Ti.Platform.displayCaps.platformWidth;
  OS_ANDROID && (platform.fixAndroidTitlebar = true);
  OS_ANDROID && (workingWidth /= Ti.Platform.displayCaps.logicalDensityFactor);
  var workingHeight = Ti.Platform.displayCaps.platformHeight;
  OS_ANDROID && (workingHeight /= Ti.Platform.displayCaps.logicalDensityFactor);
  workingHeight -= workingTop;
  if (!platform.allowLandscape) {
    if (workingWidth > workingHeight) {
      Ti.API.info('lib.platform.forcing portrait dimensions because Width > Height');
      var newHeight = workingWidth;
      var newWidth = workingHeight;
      workingWidth = newWidth;
      workingHeight = newHeight;
    }
  }

  platform.IOS7 = IOS7;
  platform.IOS8 = IOS8;
  platform.IOS9 = IOS9;
  platform.LOLLIPOP = OS_ANDROID && parseInt(Ti.Platform.version, 10) >= 5 ? true : false;
  platform.KITKAT = OS_ANDROID && parseFloat(Ti.Platform.version) >= 4.4 ? true : false;
  platform.osversion = Ti.Platform.version;
  platform.osversionname = platform.LOLLIPOP ? 'Lollipop' : (platform.KITKAT ? 'KitKat' : (platform.IOS8 ? 'iOS 8' : 'other'));

  platform.workingTop = workingTop;
  platform.workingHeight = workingHeight;
  platform.workingWidth = workingWidth;
  platform.tabHeight = tabHeight ? +tabHeight : 0;

  var platformModel = Ti.Platform.model;
  platform.isSimulator = (platformModel === 'Simulator') || (platformModel === 'simulator') || (platformModel.indexOf('sdk') !== -1 ) || (platformModel.indexOf('Genymotion') !== -1 )  ? true : false;
  platform.currentCountry = platform.isSimulator ? 'GB' : Ti.Locale.currentCountry;  // Simulator is US, we want GB, whereas Ti.Platform.locale is en-GB

  platform.isTablet = (Ti.Platform.osname === 'ipad') || Alloy.isTablet ? true : false;
  // DEBUG assist
  if (platform.isTablet && platform.allowLandscape) {
    platform.orientations = [Ti.UI.LANDSCAPE_LEFT];
    platform.orientation = Ti.UI.LANDSCAPE_LEFT;
  } else {
    platform.orientations = [Ti.UI.PORTRAIT];
    platform.orientation = Ti.UI.PORTRAIT; // Ti.Gesture.orientation;
  }
  platform.initialised = true;
  platform.saveSessionStart();

};
platform.init(undefined, 0);

platform.isLandscape = function() {
  // Helper to return true for landscape if we forced it in debug mode
  var _islandscape = (Ti.Gesture.isLandscape() || (platform.orientation == Ti.UI.LANDSCAPE_LEFT) || (platform.orientation == Ti.UI.LANDSCAPE_RIGHT)) ? true : false;
  Alloy.CFG.logging && logInfo('platform.isLandScape=' + _islandscape
    + ' Ti.Gesture.isLandScape=' + Ti.Gesture.isLandscape()
    + ' Ti.Gesture.orientation=' + Ti.Gesture.orientation
    + ' platform.orientation=' + platform.orientation, ['platform']);

  return _islandscape;
};

platform.iteratorlevel = 0;
platform.iteratorcount = 0;
/**
 * Return true from the iterator function to quit.
 * The iterator callback function takes a view/control as a parameter
 */
platform.iterateChildren = function(view, iteratorFn) {
  platform.icolor = 0;
  platform.iteratorlevel = 0;
  platform.iteratorcount = 0;
  platform.iteratorFn = iteratorFn;

  view = view || Alloy.Globals.activeview;
  if (view) {
    platform.iterate(view, undefined);
  }
};
platform.iterate = function(item, iteratorFn) {
  // Loop all children on the view calling blur until the keyboard disappears
  //_.each(item.children, function(child) {
  //  doSomething
  //}

  if ((platform.iteratorcount++ > 999) || _.isUndefined(item) || _.isUndefined(item.apiName)) {
    return true;
  }

  try {
    var name = item.id || item.bindId || 'no id';
    Alloy.CFG.logging && $.lib.logInfo(platform.iteratorcount + ' lv:' + platform.iteratorlevel + ' ' + item.apiName + ': ' + name);
    if (true === platform.iteratorFn(item)) {
      return true;
    }
  } catch(E) {
    $.lib.logError('Exception in iterateChildren.callbackFn ' + E.message);
  }

  try {
    if (item.views !== undefined) { // scrollable & scrollview
      platform.iteratorlevel++;
      for (var itemview in item.views) {
        platform.iterate(item.views[itemview]);
      }
      platform.iteratorlevel--;
    }

    if (item.sections !== undefined) {   // table & listview
      platform.iteratorlevel++;
      for (var section in item.sections) {
        platform.iterate(item.sections[section]);
      }
      platform.iteratorlevel--;
    }

    if (item.items !== undefined) {   // listsection
      platform.iteratorlevel++;
      for (var listitem in item.items) {
        platform.iterate(item.items[listitem]);
      }
      platform.iteratorlevel--;
    }

    if (item.rows !== undefined) {   // tablesection
      platform.iteratorlevel++;
      for (var row in item.rows) {
        platform.iterate(item.rows[row]);
      }
      platform.iteratorlevel--;
    }

    if (item.children !== undefined) { // view
      platform.iteratorlevel++;
      for (var child in item.children) {
        platform.iterate(item.children[child]);
      }
      platform.iteratorlevel--;
    }
  } catch(E) {
    $.lib.logError('Exception in iterateChildren ' + E.message);
  }
};

platform.logChildren = function(view) {
  platform.iterateChildren(view, function(item){
    if (_.isUndefined(item)) {
      return false;
    }

    if (item.apiName === 'Ti.UI.View') {
      Alloy.CFG.logging && $.lib.logInfo('View: ' + item.id);
    }
    if (_.has(item, 'title')) {
      Alloy.CFG.logging && $.lib.logInfo(item.apiName + ': ' + item.id + ' title=' + item.title);
    }
    if (_.has(item, 'text')) {
      Alloy.CFG.logging && $.lib.logInfo(item.apiName + ': ' + item.id + ' text=' + item.text);
    }

    return false;
  });
};

platform.icolor = 0;
platform.backcolors = ['red', 'green', 'blue', 'orange', 'gray'];

platform.debugLayout = function(view) {
  platform.iterateChildren(view, function(item){
    if (item && item.apiName) {
      if (_.has(item, 'borderColor') && _.has(item, 'borderWidth') && _.has(item, 'backgroundColor')) {
        if (item.visible && (item.rect.height > 2) && (item.rect.width > 2)) {
          if (++platform.icolor >= platform.backcolors.length) {
            platform.icolor = 0;
          }
          // nb. Setting borderWidth to zero, one, or anything crashes some labels!! Use backgroundColor instead...
          if (_.isUndefined(item.xbackgroundColor)) {
            if (_.isUndefined(item.backgroundColor)) {
              item.xbackgroundColor = 'transparent';
            } else {
              item.xbackgroundColor = _.clone(item.backgroundColor);
            }
          }
          item.backgroundColor = platform.backcolors[platform.icolor];
        }
      }
      if (item.apiName !== 'Ti.UI.TableViewRow') {
        platform.debugItemProperty(item, 'attributedString', 'id');
        platform.debugItemProperty(item, 'text', 'id');
        platform.debugItemProperty(item, 'title', 'id');
      }
    }
    return false;
  });
};

platform.debugItemProperty = function(item, toprop, fromprop) {
   if (_.has(item, fromprop) && _.has(item, toprop)) {
     var tssclass = '';
     if (_.isUndefined(item['x' + toprop])) {
       item['x' + toprop] = item[toprop];

       // To also show the classes used requires config.json autoStyle: true
       if (_.isArray(item.classes) && (item.classes.length > 0)) {
          tssclass = ' ' + item.classes.join(' ');
       }
     }
     item[toprop] = item[fromprop] + tssclass;
   }
};

platform.revertLayout = function(view) {
  platform.iterateChildren(view, function(item){
    if (item && item.apiName) {
      platform.debugItemProperty(item, 'backgroundColor', 'xbackgroundColor');
      platform.debugItemProperty(item, 'text', 'xtext');
      platform.debugItemProperty(item, 'attributedString', 'xattributedString');
      platform.debugItemProperty(item, 'title', 'xtitle');
    }
  });
};

platform.blurChildren = function(view) {
  // Loop all children on the view calling blur until the keyboard disappears
  function iterate(item) {
    if ((item.apiName === 'Ti.UI.TextField') || (typeof(item.blur) == 'function')) {
      item.blur();

      // Break out of loop once the keyboard is gone
      if (OS_IOS && ! Ti.App.keyboardVisible) {
        return;
      }
    }

    if (item.views !== undefined) { // scrollable view
      for (var i in item.views) {
        iterate(item.views[i]);
      }
    }

    if (item.sections !== undefined) {   // table view
      for (var i in item.sections) {
        iterate(item.sections[i]);
      }
    }

    if (item.rows !== undefined) {   // table rows
        for (var i in item.rows) {
          iterate(item.rows[i]);
        }
      }

    if (item.children !== undefined) { // view
      for (var i in item.children) {
        iterate(item.children[i]);
      }
    }
  };

  if (OS_IOS && Ti.App.keyboardVisible) {
    iterate(view);
  }
};

platform.focusFirst = function(view) {
  // Loop all children on the view calling blur until the keyboard disappears
  function iterate(item) {
    if (typeof(item.focus) == 'function') {
      item.focus();
      //return;
    }

    // Break out of loop once the keyboard is gone
    if (Ti.App.keyboardVisible) {
      return;
    }

    if (item.views !== undefined) { // scrollable view
      for (var i in item.views) {
        iterate(item.views[i]);
      }
    }

    if (item.sections !== undefined) {   // table view
      for (var i in item.sections) {
        iterate(item.sections[i]);
      }
    }

    if (item.rows !== undefined) {   // table rows
        for (var i in item.rows) {
          iterate(item.rows[i]);
        }
      }

    if (item.children !== undefined) { // view
      for (var i in item.children) {
        iterate(item.children[i]);
      }
    }
  };

  iterate(view);
};

platform.hideKeyboard = function(viewOrTextField) {
  viewOrTextField = viewOrTextField || $.mainview;
  (OS_IOS && viewOrTextField) && platform.blurChildren(viewOrTextField);
  OS_ANDROID && Ti.UI.Android.hideSoftKeyboard();
};

platform.showKeyboard = function(viewOrTextField) {
  viewOrTextField = viewOrTextField || $.mainview;
  Alloy.CFG.logging && logInfo('platform.showkeyboard: Ti.App.keyboardVisible=' + Ti.App.keyboardVisible);
  (viewOrTextField) && platform.focusFirst(viewOrTextField);
  OS_ANDROID && Ti.UI.Android.hideSoftKeyboard();
};

platform.applyLocaleSettings = function(countrycode) {
  // Force settings for moment.js - for instance when simulator is en-US but we want GB pass "gb" into the country code
  var moment = require('alloy/moment');
  self = self || {};
  self.User = {};
  self.User.language = Ti.Locale.getCurrentLanguage();                    // e.g. 'en' or 'en-GB'
  self.User.country = countrycode || Ti.Locale.getCurrentCountry().toLowerCase();     // e.g. 'gb'
  self.User.locale = Ti.Locale.getCurrentLocale();//.toLowerCase();       // e.g  'en-GB'

  // SETUP locale; note that alloy.moment uses Ti.Locale.getCurrentLanguage() which is why we match it
  //if ((self.User.language === 'en-GB') || (self.User.locale === 'en-US')) {
  if (self.User.language.substr(0,2).toLowerCase() === 'en') {
    Alloy.CFG.logging && logInfo('Setting locale to ' + self.User.locale, ['config']);
    moment.longDateFormat = {
      LT : "h:mm A",
      L : "DD/MM/YYYY",
      LL : "D MMMM YYYY",
      LLL : "D MMMM YYYY LT",
      LLLL : "dddd, D MMMM YYYY LT"
    };
    moment.week = {
      dow : 1, // Monday is the first day of the week.
      doy : 4  // The week that contains Jan 4th is the first week of the year.
    };
    moment.calendar = {
      sameDay : '[Today] LT',
      nextDay : '[Tomorrow at] LT',
      nextWeek : '[Next] dddd [at] LT',
      lastDay : '[Yesterday] LT',
      lastWeek : 'dddd [at] LT',
      sameElse : 'L'
    };
    //moment.lang(self.User.locale/*, require('/alloy/en-gb')*/);  // How it should work.
    moment.lang(self.User.locale);
  } else {
    moment.calendar.sameDay = '[Today] LT';
    moment.calendar.lastDay = '[Yesterday] LT';
    moment.calendar.lastWeek = 'dddd [at] LT';
  }
  $.moment = moment;
};

platform.initialiseMap = function() {
  if (OS_ANDROID) {
    if (Alloy.Globals.Map) {
    try {
      var MapModule = Alloy.Globals.Map;
      var rc = MapModule.isGooglePlayServicesAvailable();
      switch (rc) {
          case MapModule.SUCCESS:
              Ti.API.info('Google Play services is installed.');
              break;
          case MapModule.SERVICE_MISSING:
              alert('Google Play services is missing. Please install Google Play services from the Google Play store.');
              break;
          case MapModule.SERVICE_VERSION_UPDATE_REQUIRED:
              alert('Google Play services is out of date. Please update Google Play services.');
              break;
          case MapModule.SERVICE_DISABLED:
              alert('Google Play services is disabled. Please enable Google Play services.');
              break;
          case MapModule.SERVICE_INVALID:
              alert('Google Play services cannot be authenticated. Reinstall Google Play services.');
              break;
          default:
              alert('Unknown error.');
              break;
      }
    } catch(E) {
      logError(E);
    }
  }}
};

/**
 * Return a timezone independent duration, now is optional
 */
platform.durationBetween = function(interval, then, now) {
  if ($.lib.isNull(then)) {
    return 0;
  }
  now = (undefined === now) ? new Date() : now;
  try {
    var dtThen = moment(then).toDate();
    if (dtThen.getTimezoneOffset() !== now.getTimezoneOffset()) {
      $.lib.logError('platform.durationBetween - mismatching timezones not handled in code', LOGTAG);
    }
    var diff = moment.duration(moment(now).diff(then));
    switch(interval) {
      case 'months':
        return diff.asMonths();
        break;
      case 'days':
        return diff.asDays();
        break;
      case 'hours':
        return diff.asHours();
        break;
      case 'minutes':
        return diff.asMinutes();
        break;
      default:
        return diff.asSeconds();
    }
  } catch (E) {
    $.lib.logError('Exception in platform.durationBetween ' + E.message);
    return 0;
  }
};

/**
 * Consistently handle starting an activity. In ZoopaChat I am often missing a currentActivity
 */
platform.startAndroidActivity = function(intent) {
  if (! OS_ANDROID) return false;
  try {
    var activity = Ti.Android.currentActivity || Alloy.Globals.launchActivity;
    activity.startActivity(intent);
    return true;
  } catch(E) {
    $.lib.logError('Could not startAndroidActivity');
    return false;
  }
};

_.extend(exports, platform);