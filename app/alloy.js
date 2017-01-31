/* jshint maxerr:1000 */
'use strict';

(function(global) {

  // Create a global JS-only event dispatcher by extending Backbone's Events
  // as a better alternative for Ti.App.fireEvent which crosses the bridge.
  Alloy.Events = _.extend({}, Backbone.Events);

  /**
   * Global function to format logs, emit an event that controllers/console.js
   * uses to display them in the app and log it to the console as well.
   *
   * Takes any number of and type of arguments.
   * Don't think this works in Ti.Shadow?
   */
  global.log = function log() {
    if (Alloy.Globals.lib) {
      Alloy.Globals.lib.log(arguments);
    };

  };

  /**
   * Global function to show an alert including an optional title other than the
   * default 'Alert' which is what you get via alert().
   *
   * @method     dialog
   * @param      {String}  message  Message to show
   * @param      {String}  title    Optional title to show (defaults to 'Alert')
   */
  global.dialog = function alert(message, title) {
  	Ti.UI.createAlertDialog({
  		title: title || 'Alert',
  		message: message
  	}).show();
  };

  createLibraries();

})(this);

// In ECMA 5.0, but not in Ti.String, yet.
if (!String.prototype.trim) {
  //code for trim
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };
}
if (!String.prototype.ltrim) {
  String.prototype.ltrim = function() {
    return this.replace(/^\s+/, '');
  };
  String.prototype.rtrim = function() {
    return this.replace(/\s+$/, '');
  };
}
if (!String.prototype.fulltrim) {
  String.prototype.fulltrim = function() {
    return this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g, '').replace(/\s+/g, '');
  };
}
if (!String.prototype.stripSpaces) {
  String.prototype.stripSpaces = function() {
    return new String(this).replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g, '').replace(/\s+/g, '');
  };
}
if (!String.prototype.stripNonNumeric) {
  String.prototype.stripNonNumeric = function() {
    return new String(this).replace(/\D/g, '');
  };
}
if ( typeof String.prototype.endsWith === 'undefined') {
  String.prototype.endsWith = function(suffix) {
    return this.toLowerCase().indexOf(suffix.toLowerCase(), this.length - suffix.length) !== -1;
  };
}
if ( typeof String.prototype.startsWith === 'undefined') {
  String.prototype.startsWith = function(prefix) {
    return (this.substr(0, prefix.length).toLowerCase() === prefix.toLowerCase());
  };
}
if ( typeof String.prototype.contains === 'undefined') {
  String.prototype.contains = function(sub) {
    return this.toLowerCase().indexOf(sub.toLowerCase()) !== -1;
  };
}
if ( typeof String.prototype.containsText === 'undefined') {
  String.prototype.containsText = function(sub) {
    return this.toLowerCase().indexOf(sub.toLowerCase()) !== -1;
  };
}
if ( typeof String.prototype.sameText === 'undefined') {
  String.prototype.sameText = function(sub) {
    return this.toLowerCase() === sub.toLowerCase();
  };
}
String.prototype.padLeft = function (paddingValue) {
  return String(paddingValue + this).slice(-paddingValue.length);
};
String.prototype.padRight = function (paddingValue) {
  return String(paddingValue + this).substring(paddingValue.length);
};

// Radians for coordinate based distance calculations
if ( typeof (Number.prototype.toRad) === 'undefined') {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  };
}

if ( typeof (Number.prototype.toDeg) === 'undefined') {
  Number.prototype.toDeg = function() {
    return this * 180 / Math.PI;
  };
}

// Day of year and week of year
if ( typeof (Date.prototype.dayOfYear) === 'undefined') {
  Date.prototype.dayOfYear = function() {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((this - onejan) / 86400000);
  };
}

if ( typeof (Date.prototype.weekOfYear) === 'undefined') {
  Date.prototype.weekOfYear = function() {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  };
}

if ( typeof (Date.prototype.julianDay) === 'undefined') {
  Date.prototype.julianDay = function() {
    return Math.ceil(this / 86400000);
  };
}

var fa = require('/shared/FontAwesome');
Alloy.Globals.FontAwesome = /*OS_ANDROID ? 'fontawesome-webfont' :*/ 'FontAwesome';
Alloy.Globals.exclamationIcon = "\uf06a";

var LOGTAG = 'LIFECYCLE';

function logLifecycleEvent(str) {
  if (Alloy.Globals.environment !== 'test') {
    Ti.API.error('[LIFECYCLE] ' + str);
  }
};

/**
 * Handle uncaught exceptions to prevent appcrash on the JS thread
 */
function initUncaughtExceptionHandler() {
    Alloy.Globals.logLifecycleEvent('Adding uncaughtException handler');

    // NEW (iOS, Android): Catch uncaught exceptions
    Ti.App.addEventListener('uncaughtException', function (e) {
        console.error('[uncaughtException ' + JSON.stringify(e, null, 2));

        // in development on iOS the red error screen will prevent our alert
        // from showing so we wait until the screen has been closed by the user.
        if (OS_IOS && !ENV_PROD && $ && $.otherWin) {
            $.otherWin.addEventListener('focus', function onFocus() {
              $.otherWin.removeEventListener('focus', onFocus);
              if (Alloy.Globals.lib) {
                Alloy.Globals.lib.showError(e, '[uncaughtException]');
              }
            });

        } else {
            try {
              Ti.API.error(e);
            } catch(E) {
            }
          //}
        }
    });
};

var fa = require('/shared/FontAwesome');
function createLibraries() {
  Ti.API.info('Alloy.js: creating controller libraries');
  Alloy.Globals.lastIndex = -1;
  Alloy.Globals.logLifecycleEvent = logLifecycleEvent;

  Alloy.Globals.FontAwesome = OS_ANDROID ? 'fontawesome-webfont' : 'FontAwesome';
  Alloy.Globals.Map = require('ti.map');


  /*
   * Navigation controllers
   */
  Alloy.Globals.Controllers = {};
  Alloy.Globals.Controllers.instance = function(name, opts) {
    return Alloy.Globals.Controllers[name] || (Alloy.Globals.Controllers[name] = Alloy.createController(name, opts));
  };
  Alloy.Globals.controllerstack = [];
  Alloy.Globals.activecontroller = null;
  Alloy.Globals.activeview = null;
  Alloy.Globals.tishadow = Ti.Shadow; // Used in conditional .tss classes as [if=Alloy.Globals.tishadow]

  /*
   * Libraries
   */
  Alloy.Globals.lib = Alloy.Globals.libdata = Alloy.createController('base/libdata');
  initUncaughtExceptionHandler();
  Alloy.Globals.lib.init();

  /*
   * Widgets
   */
  Alloy.Globals.loading = Alloy.createWidget("nl.fokkezb.loading");
  Alloy.Globals.alert = Alloy.createWidget("yy.alert");
}

