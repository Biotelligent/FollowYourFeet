/*jslint maxerr:1000 */
'use strict';

/**
 * Network state handling / inspection
 *
 *
 * @class libnetwork
 */

exports.lib = Alloy.Globals.libdata;
var LOGTAG = 'libnetwork';

_.extend(exports, {
  previoustypename: 'UNKNOWN',  // using this as uninitialized
});

function startNetworkWatcher() {
  if (_.isUndefined($.lib)) {
    $.lib = Alloy.Globals.lib;
  }
  $.lib.logError('startNetworkWatcher');
  Ti.Network.removeEventListener('change', handleNetworkChange);

  if ($.lib.appsettings.enableNetworkDetection) {
    Ti.Network.addEventListener('change', handleNetworkChange);
  }
};
exports.startNetworkWatcher = startNetworkWatcher;

/**
 * Elevated event for tracking network and SIP changes
 */
function logNetworkEvent(messageOrObj, filters) {
  if (_.isString(filters)) {
    filters = 'ZNET.' + filters;
  } else {
    filters = filters;
  }
  $.lib.logError(messageOrObj, filters);
};
exports.logNetworkEvent = logNetworkEvent;


/**
 * A description of the user state that is displayed to the user for SIP/internet/data(/zplatform?) failure or connection
 */
function networkStatusText() {
  var msg = $.lib.net.online() ? Ti.Network.networkTypeName + L('notification-connectedtype', ' CONNECTED') : L('notification-offline', 'OFFLINE');
  return msg;
};
exports.networkStatusText = networkStatusText;

/**
 * Notify the user in the app when the network connection has dropped.
 * This occurs in the foreground so doesn't conflict with the statusbar ticker which only runs the notification when the app is backgrounded.
 *
 */
function showUserNotification() {
  if ($.lib.isdebugmode && $.lib.isforeground) {
    if (Alloy.Globals.activecontroller) {
      Alloy.CFG.logging && $.lib.logInfo('showUserNotification for network on ' + Alloy.Globals.activecontroller.__controllerPath, LOGTAG);
      Alloy.Globals.activecontroller.showNotification({notificationtype: 'network', title: $.networkStatusText(), vibrate: false, timeout: 15000});
    }
  }
};
// Prevent the notification constantly toggling if the network state changes
var debouncedUserNotification = _.debounce(showUserNotification, 1500, true);

// Also note the network can be online but unavailable - wifi connected but no route to host.
function handleNetworkChange(e) {
  try {
    // a network state change might be missed when the app is backgrounded, so always prefer live checks for the current state
    var type = e.networkType;
    var online = e.online && ! (false === $.lib.debug.testoffline);
    var networkTypeName = e.networkTypeName;
    $.logNetworkEvent('Network Change fired net type:' + type + ' online:' + online + ' name:'+networkTypeName + ' uptime=' + $.lib.platform.uptime());

    if (e.online) {
      $.logNetworkEvent('Network has come online, previoustypename=' + $.previoustypename + ' newtype=' + Ti.Network.networkTypeName);
      Alloy.Globals.sip.updateStatusBarIcon();

      // SANITY CHECKS SINCE THE WIFI TOGGLES WHEN WE ARE BOOTING
      if ((true === $.lib.startup.startupcompleted) && ($.lib.platform.uptime() > 1)) {
        debouncedUserNotification();
        if (($.previoustypename === 'NONE') || ($.previoustypename === 'UNKNOWN')) {
          if (true === $.lib.startup.needServerRefresh()) {
            $.logNetworkEvent('Network has come online, startup has been completed. needServerRefresh=true, performing startup tasks.');
            $.lib.startup.doPostUIStartupTasks();
          }
        }

        // We need to restart the SIP stack when going from WIFI to MOBILE because the primary IP address changes
        //if (OS_ANDROID) {
          $.logNetworkEvent('Network has come online, startup has been completed. RESTARTING SIP: Sipstack=' + Alloy.Globals.sip.statusText());
          Alloy.Globals.sip.restartSIP();
        //}
        Alloy.Collections.instance('Userrecordings').autostartDownloading(120);
      } else {
        $.logNetworkEvent('Network has come online, startup is not complete. Ignoring.');
      }

    } else {
      $.logNetworkEvent('Network has gone offline - updating status and callbar');
      Alloy.Globals.sip.updateStatusBarIcon();
      debouncedUserNotification();
    }
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.handleNetworkChange');
  } finally {
    $.previoustypename = Ti.Network.networkTypeName;
  }
};

function stopNetworkWatcher() {
  Ti.Network.removeEventListener('change', handleNetworkChange);
};
exports.stopNetworkWatcher = stopNetworkWatcher;

function info() {
  var _info = 'Connected: ' + $.online()
    + '\nType: ' + Ti.Network.networkTypeName;

  return _info;
};
exports.info = info;

/**
 * Fetch the server recordings
 * @param {Function} doSuccess
 */
function init() {
  Alloy.CFG.logging && $.lib.logInfo('Querying network state', LOGTAG);

  //Ti.App.Properties.setObject('savedrecordinglist', $.savedlist);
  if (OS_IOS) {
    /* Not available for arm64
    var network = require('bencoding.network');
    var carrier = network.createCarrier();
    $.carrierInfo = carrier.findInfo();
    Alloy.CFG.logging && $.lib.logInfo('Network carrier info : ' + JSON.stringify($.carrierInfo), LOGTAG);
    //Ti.API.info("Are we on the simulator? => " + carrierInfo.isSimulator);
    //carrierInfo.carrierName - Provides access to the carrier name associated with the device's SIM.
    //carrierInfo.mobileCountryCode - Provides access to the carrier Mobile Country Codes (MCCs). This is the country code associated with the carrier on the SIM. Here is a listing of all the Mobile Country Codes wikipedia
    //carrierInfo.mobileNetworkCode - Provides access to the carrier's Mobile Network Code. This is the network code associated with the carrier on the SIM. Here is a listing of all the Mobile Network Codes for the US wikipedia
    //carrierInfo.isoCountryCode); - CountryCode of the SIM
    //carrierInfo.allowsVOIP - Indicates if the carrier allows VoIP calls to be made on its network.

    var captiveNetwork = network.createCaptiveNetwork();
    var currentNetwork = captiveNetwork.findInfo();
    $.SSID = currentNetwork.SSID;
    */
  }

  if (OS_ANDROID) {
    // TODO: when the user opts to turn the service off, we should exit/restart the app with platformTools.exitApp();

    var tools = require('bencoding.android.tools');
    var platformTools = tools.createPlatform();
    // crashes. $.airplanemode = platformTools.isAirplaneModeOn();
    /** TODO: check other programs which handle sip/sips/csip/tel and display
        var intent = Ti.Android.createIntent({
        action: Ti.Android.ACTION_VIEW,
        type: "application/pdf",
        data: session.tempFile.nativePath
        });
        if(platformTools.intentAvailable(intent)){
        try {
        Ti.Android.currentActivity.startActivity(intent);
     */
  }
};
exports.init = init;

function networkInfo() {
  if (OS_IOS) {
    /* Not available for arm64*/
    var network = require('bencoding.network');
    var carrier = network.createCarrier();
    $.carrierInfo = carrier.findInfo();
    Alloy.CFG.logging && $.lib.logInfo('Network carrier info : ' + JSON.stringify($.carrierInfo), LOGTAG);
    //Ti.API.info("Are we on the simulator? => " + carrierInfo.isSimulator);
    //carrierInfo.carrierName - Provides access to the carrier name associated with the device's SIM.
    //carrierInfo.mobileCountryCode - Provides access to the carrier Mobile Country Codes (MCCs). This is the country code associated with the carrier on the SIM. Here is a listing of all the Mobile Country Codes wikipedia
    //carrierInfo.mobileNetworkCode - Provides access to the carrier's Mobile Network Code. This is the network code associated with the carrier on the SIM. Here is a listing of all the Mobile Network Codes for the US wikipedia
    //carrierInfo.isoCountryCode); - CountryCode of the SIM
    //carrierInfo.allowsVOIP - Indicates if the carrier allows VoIP calls to be made on its network.

    var captiveNetwork = network.createCaptiveNetwork();
    var currentNetwork = captiveNetwork.findInfo();
    $.SSID = currentNetwork.SSID;
    Alloy.CFG.logging && $.lib.logInfo('Returning $');
    Alloy.CFG.logging && $.lib.logInfo(JSON.stringify($));
    return $;
  }

  if (OS_ANDROID) {
    if (Alloy.Globals.sip && (Alloy.Globals.sip.siplib != null)) {
      var networkinfo = Alloy.Globals.sip.siplib.networkInfo();
      Alloy.CFG.logging && $.lib.logInfo('Returning $');
      Alloy.CFG.logging && $.lib.logInfo(JSON.stringify(networkinfo));
      return networkinfo;
    }


    // TODO: when the user opts to turn the service off, we should exit/restart the app with platformTools.exitApp();
    var tools = require('bencoding.android.tools');
    var platformTools = tools.createPlatform();
    // crashes. $.airplanemode = platformTools.isAirplaneModeOn();
    /** TODO: check other programs which handle sip/sips/csip/tel and display
        var intent = Ti.Android.createIntent({
        action: Ti.Android.ACTION_VIEW,
        type: "application/pdf",
        data: session.tempFile.nativePath
        });
        if(platformTools.intentAvailable(intent)){
        try {
        Ti.Android.currentActivity.startActivity(intent);
     */
  }
};
exports.networkInfo = networkInfo;

function isWifi() {
  return (Ti.Network.networkType === Titanium.Network.NETWORK_LAN) || (Ti.Network.networkType === Titanium.Network.NETWORK_WIFI) ? true : false;
};
exports.isWifi = isWifi;

function isMobile() {
  return (Ti.Network.networkType === Titanium.Network.MOBILE) ? true : false;
};
exports.isMobile = isMobile;

function online() {
  if (true === Alloy.Globals.lib.debug.testoffline) {
    $.lib.logError('testoffline is true, returning offline', LOGTAG);
    return false;
  } else {
    return Ti.Network.online;
  }
};
exports.online = online;

if (Ti.Shadow) { addSpy('libnetwork', $); }
