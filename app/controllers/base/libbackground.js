/*jslint maxerr:1000 */
'use strict';

/**
 * Background service for iOS
 *
 * @class libbackground
 */
var LOGTAG = 'libbackground';
var args = arguments[0] || {};
$.args = args;
$.lib = $.args.lib || Alloy.Globals.lib;
Ti.API.info('Initialising '+LOGTAG);


_.extend(exports, {
  version: 0.1,
  backgroundGeo: null,
});
//_.extend(exports, debug);
exports.checkVersion = function() {
  $.version = 1.0;
  return LOGTAG + ' ' + (( $.version === $.lib.Geo.version) ? 'ok ' : 'ERROR: version mismatch ') + ' int: ' + $.version + ' ext: ' + $.lib.Geo.version;
};


exports.config = {
  listenerEnabled : false, // === isListening
  purpose : L('geosearch', 'Search nearby providers'),
  distanceFilter : 5, // 5 metres
  callBack : null,
  callBack2 : null,
  lastUpdated : new Date(),
  lastHeading : -1,
};

exports.coords = {
  isValid : false,
  longitude : 0,
  latitude : 0,
  altitude : 0,
  heading : 0,
  accuracy : 0,
  speed : 0, // minus 1 when invalid or unavailable
  timestamp : new Date(),
  altitudeAccuracy : 0,
  lastHeading: -1,
  previousHeading: -3,

  // trackpt calculated additions for activity - these are not returned by coords
  manualTriggered : false,
  calcdistance_m : 0,
  calcduration_ms : 0,
  calcspeed_ms : 0,
  calcheartrate : 0,
};

function callBackOnChange() {
  //$.lib.logInfo('callBackOnChange' + $.lib.stringify(exports.coords));
  if (_.isFunction(exports.config.callBack)) {
    exports.config.callBack(exports.coords);
  }
  if (_.isFunction(exports.config.callBack2)) {
    exports.config.callBack2(exports.coords);
  }
};

exports.handleLocationUpdate = function(e, isManual) {
  var manualTriggered = isManual || false;
  if (e.error) {
    Alloy.CFG.logging && $.lib.logInfo('handleLocationUpdate (manual=' + manualTriggered + '): ' + JSON.stringify(e), LOGTAG);
  } else {
    Alloy.CFG.logging && $.lib.logInfo('handleLocationUpdate (manual=' + manualTriggered + '): ' + JSON.stringify(e), LOGTAG);
  }
  if (e.error) {
    exports.coords.isValid = false;
  } else {
    exports.coords.longitude = e.coords.longitude;
    exports.coords.latitude = e.coords.latitude;
    exports.coords.altitude = e.coords.altitude;

    if (e.coords.accuracy) {
      exports.coords.heading = e.coords.heading;
      exports.coords.lastHeading = e.coords.heading.magneticHeading;
      exports.coords.accuracy = e.coords.accuracy;
      exports.coords.speed = e.coords.speed;
      exports.coords.altitudeAccuracy = e.coords.altitudeAccuracy;
    } else {
      Alloy.CFG.logging && $.lib.logInfo('Background record has no heading data', LOGTAG);
    }
    exports.coords.timestamp = new Date();
    // Timestamp is some epoch or other format
    exports.coords.isValid = true;

    exports.coords.manualTriggered = manualTriggered;
    exports.coords.calcdistance_m = 0;
    exports.coords.calcduration_ms = 0;
    exports.coords.calcspeed_ms = 0;
    exports.coords.calcheartrate = 0;
    //$.lib.Geo.config.lastUpdate = new Date();
    callBackOnChange();
  };
};

exports.handleLocationError = function(e) {
  Alloy.CFG.logging && $.lib.logInfo('BackgroundGeo location error ' + e.message, ['geo', 'debugview']);
};

exports.handleHeadingUpdate = function(e) {
  if (e.success === undefined || e.success) {
    //Alloy.CFG.logging && $.lib.logInfo('handleHeadingUpdate: ' + e.heading.magneticHeading, ['geo']);
    if (e.heading.magneticHeading > 0) {
      $.lib.Geo.config.lastHeading = e.heading.magneticHeading;
      exports.coords.heading = e.heading;
      exports.coords.lastHeading = e.heading.magneticHeading;

      if ((Math.abs(exports.coords.lastHeading - exports.coords.previousHeading)) > 3.99) {
        callBackOnChange();
      }
      //Alloy.Globals.activity.livestatistics.heading = e.heading.magneticHeading;
    }
  }
};

// Geo can be a significant drain on the battery. Only run the listener up when cardio is in progress.
exports.startListening = function(/*distanceFilter, callBackOnChange*/) {
  Alloy.CFG.logging && $.lib.logInfo('$.lib.Geo.startListening.current=' + $.lib.Geo.config.listenerEnabled, LOGTAG);
  var distanceFilter = 5;

  if (!$.lib.Geo.config.listenerEnabled) {
    if (!Ti.Geolocation.locationServicesEnabled) {
      //$.lib.UI.showFadingNotification(L('gpsdisabled', 'GPS is disabled'));
      $.lib.logError(L('gpsdisabled', 'GPS is disabled'));
      return;
    }

    $.lib.Geo.config.lastUpdate = new Date();
    $.lib.Geo.config.lastHeading = -1;
    $.lib.Geo.config.distanceFilter = distanceFilter;
    //$.lib.Geo.config.callBack = null;
    //callBackOnChange;
    if (OS_IOS) {
      Ti.Geolocation.setPurpose($.lib.Geo.config.purpose);

      // On SDK 6.0+, set the new fitness property
      if ((parseFloat(Ti.Platform.version) >= 6.0) && (parseFloat(Ti.version) >= '3.1')) {
        Alloy.CFG.logging && $.lib.logInfo('Applying iOS 6.0 activitytype_fitness', LOGTAG);
        Ti.Geolocation.activityType = Ti.Geolocation.ACTIVITYTYPE_FITNESS;
        Ti.Geolocation.pauseLocationUpdateAutomatically = false;
      }
    }
    Ti.Geolocation.showCalibration = false;
    // Calibration when you are out for a run is a PITA. ($.lib.Config.isDebugMode) ? false : true;
    Ti.Geolocation.distanceFilter = distanceFilter;
    Ti.Geolocation.headingFilter = 22.5;
    Ti.Geolocation.preferredProvider = Ti.Geolocation.PROVIDER_GPS;
    if (OS_IOS) {
      Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_NEAREST_TEN_METERS;
      //ACCURACY_HIGH or ACCURACY_BEST does not work!
    } else {
      Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_HIGH;
    }
    //if (Ti.Geolocation.hasCompass) {
    // Enable the heading listener even if the device *doesn't have a compass*. Improves accuracy...
    Ti.Geolocation.addEventListener('heading', $.lib.Geo.handleHeadingUpdate);
    //Ti.Geolocation.addEventListener('location', $.lib.Geo.handleLocationUpdate);
    $.lib.Geo.config.listenerEnabled = true;

    // Manually trigger 1

    $.getCurrentPosition({});
    if ($.initlib()) {
      $.lib.Geo.config.listenerEnabled = true;
      $.backgroundGeo.clearCache();
      $.backgroundGeo.addEventListener('change', $.lib.Geo.handleLocationUpdate);
      $.backgroundGeo.addEventListener('error', $.lib.Geo.handleLocationError);
      $.backgroundGeo.startLocationManager();
    }
  }
};

exports.stopListening = function() {
  Alloy.CFG.logging && $.lib.logInfo('$.lib.Geo.STOPListening.current=' + $.lib.Geo.config.listenerEnabled, LOGTAG);
  if ($.hasGeo() && $.lib.Geo.config.listenerEnabled) {
    $.lib.Geo.config.listenerEnabled = false;
    try {
      //20140806 using backgroundgeo Ti.Geolocation.removeEventListener('location', $.lib.Geo.handleLocationUpdate);
      $.backgroundGeo.stopLocationManager();
      $.backgroundGeo.addEventListener('change', $.lib.Geo.handleLocationUpdate);
      $.backgroundGeo.addEventListener('error', $.lib.Geo.handleLocationError);
      Ti.Geolocation.removeEventListener('heading', $.lib.Geo.handleHeadingUpdate);
    } catch(E) {
      $.lib.logError('Failed to remove geolistener');
    }
  }
};

/*
 * Called on iOS when the app goes into background mode
 * @method startBackgroundGeoOnPause
 */
exports.startBackgroundGeoOnPause = function() {
  if ($.hasGeo() && $.lib.Geo.config.listenerEnabled) {
    $.backgroundGeo.start();
  }
};

/*
 * Called on iOS when the app is resumed from background mode
 * @method stopBackgroundGeoOnResume
 */
exports.pauseBackgroundGeoOnResume = function() {
  if ($.hasGeo() && $.listenerEnabled) {
    Alloy.CFG.logging && $.lib.logInfo('Background service has been running, pausing and copying trackpts to map, not clear whether readCache() must be called', LOGTAG);
    if ($.backgroundGeo.active()) {
      $.backgroundGeo.pause();
    }
  }
};

/*
 * Called on iOS when the app is closed; remove and stop the background service if it is running
 * @method stopBackgroundGeoOnClose
 */
exports.stopBackgroundGeoOnClose = function() {
  if ($.hasGeo()) {
    if ($.backgroundGeo.active()) {
      $.backgroundGeo.stop();
    }
  }
};

exports.currentLocation = function() {
  var result = null;

  // Debugging in sim? Return T-systems location...
  if ($.lib.platform.isSimulator) {
    result = {
      latitude : 52.0123,
      longitude : -0.6898
    };
  } else if ($.lib.config.geoEnabled && $.lib.Geo.coords.isValid) {
    result = {latitude: $.lib.Geo.coords.latitude, longitude: $.lib.Geo.coords.longitude};
  } 

  return result;
};

exports.getCurrentPosition = function(o_extend) {
  if (!$.lib.appsettings.enableBackground)
    return;
  var _this = this;
  Ti.Geolocation.getCurrentPosition(function(e) {
    Alloy.CFG.logging && $.lib.logInfo('getCurrentPosition at ' + new Date(), LOGTAG);
    $.lib.Geo.handleLocationUpdate.call(_this, e, true);
  });
};

exports.hasGeo = function() {
  return !$.lib.isNull($.backgroundGeo) ? true : false;
};
/**
 * Initialise the library
 * @param {Function} doSuccess
 */
function initlib() {
  Alloy.CFG.logging && $.lib.logInfo('Initlib', LOGTAG);
  if ($.lib.isNull(exports.backgroundGeo)) {
    Alloy.CFG.logging && $.lib.logInfo('initBackgroundGeo', LOGTAG);
    exports.backgroundGeo = require('backgroundGeo/Ti.Geo.Background');
  }
  return $.hasGeo();
};
exports.initlib = initlib;

if (Ti.Shadow) {
  addSpy('libbackground', $);
}
