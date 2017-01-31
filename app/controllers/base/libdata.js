/*jslint maxerr:1000 */
'use strict';

/**
 * Session information and general namespacing
 *
 * @class lib
 */

// En/disable test and logging overrides
// As defined by commandline build type - dist-adhoc && dist-appstore use config.json env:production settings
var isweeklyrelease = false;
var isProduction = isweeklyrelease || Alloy.CFG.isProduction;
var isAdhocMode = isweeklyrelease || Alloy.CFG.isAdhocMode;
var isdebugmode;
var isDebugMode = isdebugmode = (Alloy.CFG.isDebugMode && !isProduction);
var isbeta = isdebugmode;
exports.isbeta = isbeta;
exports.isweeklyrelease = isweeklyrelease;
exports.isdebugmode = isdebugmode;
exports.allowdebugmode = !isweeklyrelease; // Overridden in releases for @netfuse.org for on device debugging
exports.noimage = OS_ANDROID ? undefined : null; // null image when it is required to clear or replace a previous image. image=null on android causes a warning.

var moment = require('/alloy/moment');
exports.moment = moment;
// Add deepClone & deepExtend functions to underscore ... use as _.deepClone(stacked.object);
require('deepExtend');

var ignorefilters = ['cache', 'download'];
var MAXLOGLEN = 4000; //max chars to log, in particular prevents JSON.stringify overflowing on recursive output
var LOGTAG = 'lib';
var onLogInfo = null;

var self = {};

function isNull(obj) {
  return (undefined === obj) || (obj === null) ? true : false;
};

function isNullOrBlank(obj) {
  return (undefined === obj) || (obj === null) || ((_.isString(obj) && (obj.trim() === ''))) ? true : false;
};

function isNullOrZero(obj) {
  return (undefined === obj) || (obj === null) || ((_.isNumber(obj) && (Math.abs(obj) < 0.00001))) ? true : false;
};

function safeParse(stringOrObj) {
  try {
    return !_.isObject(stringOrObj) ? JSON.parse(stringOrObj) : stringOrObj || {};
  } catch(E) {
    $.lib.logError(E, LOGTAG + '.safeParse');
    return {};
  }
};
exports.safeParse = safeParse;

/*
 * LOGGING
 */
function stringify(obj, maxlen, pretty) {
  // Return an object for logging at a sensible length
  var result = obj || 'undefined';
  try {
    if (! _.isString(result)) {
      result = JSON.stringify(obj);
    }
    if (maxlen) {
      result = ('' + result).substr(0, maxlen).trim();
    }
    // Split JSON into lines
    if (true === pretty) {
      result = result.replace(/\s*,\s*/g, '\n');
    }
  } catch(E) {
    result = 'log.stringify exception ' + E.message;
  }
  return result;
};
exports.stringify = stringify;

/**
 * Quick way to do a full clone - use as _.cloneObject(obj)
 */
function cloneObject(obj) {
  try {
    return _.isObject(obj) ? JSON.parse(JSON.stringify(obj)) : obj;
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.deepclone');
    return _.clone(obj);
  }
};
exports.cloneObject = cloneObject;
_.mixin({cloneObject: cloneObject});

// Profile times by logInfo('name', ['timestart']) ... logInfo('name', ['timeend']);
var backlog = [];
var MAXBACKLOG = OS_ANDROID ? 50 : 200;
exports.backlog = backlog;
var timeStart = {
  name: "",
  last: new moment(new Date()),
};
function logInfo(messageOrObj, filters, isError) {
  try {
    isError = isError || false;
    var isTest = ($.lib.debug.isunittest && (filters === 'test')) ? true : false;
    // JMH - enable for feet - if ((isProduction || ($.lib.appsettings.debugLogLevel <= 0)) && ! isTest && ! isbeta) return;

    // Allow filtering out noisy or tested log messages
    var filterarray = filters || [];
    if (_.isString(filters)) {
      filterarray = [];
      filterarray.push(filters);
    }
    filters = _.isArray(filterarray) ? filterarray : [];
    if (_.intersection(filters, ignorefilters).length > 0) {
      return;
    }

    switch(+$.lib.appsettings.debugLogLevel) {
      case 4:
        break;
      case 3:
        if (_.intersection(filters, ['zplatform']).length > 0) {
          return;
        }
        break;
      default:
        break;
    }

    var text = isError ? messageOrObj : $.stringify(messageOrObj, 1200);

    // Log to console, prefix filters, show time or profile duration
    var prefix = "";
    if (filters.length > 0) {
      prefix = "[" + filters.join(",") + "] ";
    }
    if (_.indexOf(filters, 'time') > -1) {
      var tm = moment(new Date()).format('HH:mm:ss:zzz');
      prefix = prefix + tm + ' ';
    }
    if (_.indexOf(filters, 'timestart') > -1) {
      $.timeStart['last'] = new moment();
      $.timeStart[text] = new moment();
      return;
    }
    if (_.indexOf(filters, 'timeend') > -1) {
      var started = $.timeStart[text] ? $.timeStart[text] : $.timeStart['last'];
      var msdiff = new moment().diff(started);
      var tm = moment(new Date()).format('HH:mm:ss') + ' elapsed ms=' + msdiff + ' ';
      prefix = prefix + tm + ' ';
    }

    if (text) {
      if (text === 'clearlog') {
        backlog = [];
      }
      // backlog.unshift(prefix + text + '\n');
      // if (backlog.length > MAXBACKLOG) {
      //   backlog.pop();
      // }
      backlog.push(prefix + text + '\n');
      if (backlog.length > MAXBACKLOG) {
        backlog.shift();
      }

      isError ? Ti.API.error(prefix + text) : ((Alloy.Globals.environment === 'test') && isTest ? Ti.API.warn(prefix + text) : Ti.API.info(prefix + text));
      Alloy.Globals.log = backlog.join('\n'); // (Alloy.Globals.log || '') + '[INFO] ' + prefix + text + '\n\n';
      Alloy.Events.trigger('log');
      if (_.isFunction(onLogInfo)) {
        onLogInfo(prefix + text);
      }
    }
  } catch(E) {
    Ti.API.error(E);
  }
  //log(prefix, text);
};
// Logged messages we want or need beta testers to see
function logBeta(messageOrObj, filters) {
  logInfo(messageOrObj, filters);
};
function betaInfo(infotype) {
  if (_.isArray($.lib.backlog) && ($.lib.backlog.length > 1)) {
    return $.lib.nav.isActive() + ' ' + $.lib.backlog[0] + '\n' + $.lib.backlog[1];
  } else {
    return Alloy.Globals.sip.statusText();
  }
};
function logJSON(messageOrObj, filters) {
  var text = $.lib.stringify(messageOrObj, 8000, true);
  Alloy.CFG.logging && $.lib.logInfo(text, filters);
  return text;
};
exports.logJSON = logJSON;
function errorMessage(e, prefix) {
  // Consistent handling of acs/xhr/object errors
  if (e) {
    try {
      var msg = _.isString(prefix) ? '[' + prefix + '] ' : '';
      if (e.message) {
        if (e.error) {
          msg += '(' + e.error + ') ' + e.message;
        } else {
          msg += e.message;
        }
      } else {
        msg += stringify(e, MAXLOGLEN);
      }
      if (e.code) {
        return 'code: ' + e.code + ' ' + msg;
      } else {
        return msg;
      }
    } catch(E) {
      return 'Error: (no message detail available)';
    }
  }
};
function logError(e, prefix) {
  var emsg = errorMessage(e, prefix);
  //Ti.API.error(emsg);
  logInfo(emsg, prefix, true);
};
function showError(e, prefix) {
  try {
    var msg = errorMessage(e, prefix);
    ($ && $.isforeground) ? Ti.API.error(msg) : Ti.API.error('Error whilst backgrounded: ' + msg);
    if ($ && $.isforeground) {
      if (_.isFunction($.lib.nav.showAlert)) {
        $.lib.nav.showAlert(msg, true);
      } else {
        alert(msg);
      }
    }
  } catch(E) {
    // Nothing doable
    Ti.API.error('*** error in showError!');
  }
};
function assert(condition, message) {
  if (false === condition) {
    logError('Assert Failure: ' + message);
    if (isDebugMode) {
      var assertmodule = require('Assert');
      //new assertmodule().assert(message);
    }
  }
};
exports.assert = assert;

exports.assignLogInfo = function(e) {
  // Assign to a handler to display
  onLogInfo = e;
};
exports.isNull = isNull;
exports.isNullOrBlank = isNullOrBlank;
exports.isNullOrZero = isNullOrZero;
exports.stringify = stringify;
exports.timeStart = timeStart;
exports.errorMessage = errorMessage;
exports.logInfo = logInfo;
exports.logError = logError;
exports.showError = showError;
exports.log = logInfo;
exports.logBeta = logBeta;
exports.betaInfo = betaInfo;

// Refer http://docs.appcelerator.com/titanium/latest/#!/api/Titanium.App
// Foreground is used for deciding what action to present when a push notification is received
exports.pausedTime = undefined;
exports.Geo = undefined;
exports.isforeground = true;
exports.resumedcount = 0;
exports.pausedcount = 0;
exports.ispstnsessionactive = false;
exports.onAppResume = function(e) {
  $.isforeground = (OS_IOS || ($.resumedcount >= $.pausedcount)) ? true : false;
  Alloy.Globals.logLifecycleEvent('ZoopaChat.lib.onAppResume handler FG=' + $.isforeground + ' lib FG=' + libforeground);
  $.pausedTime = new Date();
};
exports.onAppPause = function(e) {
  $.pausedcount++;
  if (OS_IOS) {
    $.isforeground = false;
  } else {
    $.isforeground = ($.resumedcount >= $.pausedcount) ? true : false;
  }
};
exports.onAppClose = function(e) {
  Alloy.Globals.logLifecycleEvent('ZoopaChat.lib.onAppClose handler');
  try {
    Alloy.CFG.logging && $.lib.logInfo('App Closing', LOGTAG);
    $.isforeground = false;
  } catch(E) {
  }
};
exports.isForeground = function() {
  return $.isforeground;
};

var appsettings = {
  enableUnitTest: isweeklyrelease ? false : false,

  // Server settings
  enableHTTP: false,
  enableDebug: isdebugmode ? true : false,
  enableBackground: true,

  enableTestAccount: isdebugmode ? true : false,   // Must be false in a release otherwise device models get matched to a test account
  enableBetaTester: isdebugmode ? true : false,
  enablePush: Ti.Shadow ? true : true, // f* slow on android
  enableNetworkDetection: true,
  enableBackgroundService: false,   // when false, shutdown the SIP stack when app.paused/exit
  enableContactImageLoad: OS_ANDROID ? true : true,
  enableAnimation: OS_ANDROID ? true : false,
  enableOfflineLoad: true,
  enableDebugVisibility: isweeklyrelease ? false : false,
  moduleLogLevel: isweeklyrelease ? 0 : 3,
  debugLogLevel: isweeklyrelease ? 0 : 3,
};
exports.appsettings = appsettings;

exports.init = function() {
  Alloy.createController('base/libplatform', {lib: Alloy.Globals.lib});
  Alloy.createController('app/appconfig', {lib: Alloy.Globals.lib});
  Alloy.createController('app/appstartup', {lib: Alloy.Globals.lib});

  Alloy.Globals.lib.debug = Alloy.createController('base/libdebug', {isweeklyrelease: $.isweeklyrelease, allowdebugmode: $.allowdebugmode, lib: Alloy.Globals.lib});
  Alloy.Globals.lib.Geo = Alloy.createController('base/libbackground', {lib: Alloy.Globals.lib});

  Alloy.Globals.lib.net = Alloy.Globals.network = Alloy.createController('base/libnetwork');
  Alloy.Globals.imagecache =  Alloy.createController('base/libimagecache');
};

exports.checkVersion = function() {
  Alloy.CFG.logging && $.lib.logInfo('platform: ' + $.lib.platform.checkVersion());
  Alloy.CFG.logging && $.lib.logInfo('config: ' + $.lib.config.checkVersion());
  Alloy.CFG.logging && $.lib.logInfo('startup: ' + $.lib.startup.checkVersion());
  Alloy.CFG.logging && $.lib.logInfo('debug: ' + $.lib.debug.checkVersion());
  Alloy.CFG.logging && $.lib.logInfo('debug: ' + $.lib.geo.checkVersion());

};


/////////// CONFIG

exports.degreesToHeading = function(degrees) {
  var degree = parseInt(degrees, 10);
  // -1 indicates no heading data
  if (degree == -1) return '';

  // e.g N is between 337.5 & 22.5 degrees, each possibility is 1/8th of 360
  degree -= 22.5;
  switch (true) {
    case (degree < 0) :
      return 'N';
    case (degree < 45) :
      return 'NE';
    case (degree < 90) :
      return 'E';
    case (degree < 135) :
      return 'SE';
    case (degree < 180) :
      return 'S';
    case (degree < 225) :
      return 'SW';
    case (degree < 270) :
      return 'W';
    case (degree < 315) :
      return 'NW';
    default :
      return 'N';
  }
};


/////////// API CALL

function handleAPISuccess(e) {
  $.lib.nav.hideActivityIndicator();
  //$.responseArea.value = 'SUCCESS\n' + JSON.stringify(e);
};

function handleAPIError(e) {
  $.lib.nav.hideActivityIndicator();
  $.lib.nav.showError('ERROR\n' + JSON.stringify(e));
};

/**
 * Primary call for all non backbone http POSTed endpoint requests
 *
 * @method apiCall
 * @params {Object} options can contain
 *   data - info dictionary required by the endpoint
 *   params - xhr header and option settings
 */
function apiCall(endpoint, onSuccess, onError, options) {
  //$.server = (Alloy.Globals.libdata.appsettings.enableHTTP ? 'http://' : 'https://') + Alloy.Globals.libdata.config.serverconfig.api + '/';
  try {
    options = options || {};
    $.server = "http://" + $.lib.api.server + "/"; // 192.168.0.124/"; //"http://follow-your-feet.local/";
    var url = $.server + endpoint;
    var method = options.method || 'GET';
    var isHTTPGet = (method === 'GET') ? true : false;
    options.data = options.data || {};

    // Convert data to GET request format
    if (isHTTPGet && !_.isEmpty(options.data)) {
      var suffix = '', count = 0;
      _.each(options.data, function(value, key){
        suffix += (count++ < 1) ? '?' : '&';
        suffix += key + '=' + encodeURIComponent(value);
      });
      url += suffix;
    }

    // TESTING:
    if (true === options.testendpoint) {
      Alloy.CFG.logging && $.lib.logInfo('ENDPOINT TEST: ' + endpoint);
      if (options.expect) {
        var delay = options.expect.delay || 1000;
        setTimeout(function() {
              callback(true, JSON.stringify(options.expect), null);
            },
            delay
        );
      }
    } else {
      http_request(method, url, options.data, options.headers, callback);
    }
    return;
  } catch(E) {
    $.lib.logError(E);
    httpError('Non HTTP error', E, undefined);
  }
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Parse the response into a standard format, whether it was an actual HTTP server error, or a feetapi error, or both.
   */
  function processHTTPResponse(success, response, e, xhr){
    var result = {
      success: success,
      url: url,
      endpoint: endpoint,
      httpcode: success ? 200 : -2,
      statuscode: -1,
      text: 'No status code',
      data: undefined,
      sent: options.data // debugging - what was sent
    };

    try {
      // If it was an http server error, we may still have a feetapi response in response.data,
      // otherwise response.data is an xhr error object.
      //HTTP_NOT_MODIFIED = 304;
      //HTTP_NOT_FOUND    = 404;
      result.httpcode = (xhr && xhr.status) || -3;
      result.statuscode = success ? 200 : result.httpcode;
      $.lib.logError('processHTTPResponse httpcode=' + result.httpcode + ' success='+success);
      result.text = success ? 'ok' : 'error';
      result.data = success ? {} /*$.lib.safeParse(response)*/ : undefined;
      if (e && e.error) {
        result.text = _.isString(e.error) ? e.error : JSON.stringify(e.error);
      }
      Alloy.CFG.logging && $.lib.logInfo('processHTTPResponse ' + JSON.stringify(result), LOGTAG);
    } catch(E) {
      result.success = false;
      result.text = E.message + ' ' + result.text;
      $.lib.logError(E, LOGTAG + '.processHTTPResponse');
    }
    return result;
  };

  /**
   * Connection was successful.
   * The actual endpoint call is now parsed to see if it was successful
   *
   *  result.status = xhr.status == 200 ? "ok" : xhr.status;
   *  result.data = xhr.responseText;
   *  response will be {status="ok", data=json}
   */
  function httpSuccess(response, xhr) {
    //Alloy.CFG.logging && $.lib.logInfo(this.status + ' Last-Modified=' + lastModified + ' zoopa-headers=' + zoopaHeader + ' result=' + JSON.stringify(response), LOGTAG);
    Alloy.CFG.logging && $.lib.logInfo('['+endpoint+'] httpSuccess raw response=' + JSON.stringify(response), LOGTAG);
    var processedresponse = processHTTPResponse(true, response, xhr);
    _.defer(function(){
      if (_.isFunction(onSuccess) && processedresponse.success) {
        onSuccess(processedresponse);
      } else if (_.isFunction(onError) && !processedresponse.success) {
        onError(processedresponse);
      }
    });
  };

  /**
   * Connection had a failure header
   *
   *  result.status = "error";
   *  result.data = e;
   *  result.code = xhr.status;
   */
  function httpError(response, error, xhr) {
    try {
      $.lib.logError('['+endpoint+'] httpError.response=' + JSON.stringify(response), LOGTAG+'.httpError');
      var processedresponse = processHTTPResponse(false, response, error, xhr);
      if (_.isFunction(onError)) {
        _.defer(function(){ onError(processedresponse); });
      }
    } catch(E) {
      $.lib.logError(E, 'feetapi.httpError');
    }
  };

  // Simple default callback function for HTTP request operations.
  function callback(success, response, error, xhr) {
    if (success) {
      httpSuccess(response, xhr);
    } else {
      httpError(response, error, xhr);
    }
    return;
  };

  // Helper function for creating an HTTP request
  function http_request(method, url, payload, headers, callback) {
    var client = Ti.Network.createHTTPClient({
      onload: function(e) {
        // if its a binary download... save to file from responseData not responseText
        if (callback) {
          callback(true, this.responseText, null, this);
        }
      },
      onerror: function(e) {
        //if (callback) callback(false, {code: this.status, data: {error: _.isString(e.error) ? e.error + ' ' + this.responseText : this.responseText}}, e);
        if (callback) callback(false, this.responseText, e, this);
      },
      timeout : options.timeout || ($.lib.platform.isSimulator ? 30000 : 15000)
    });

    if (client && client.connected) {
      $.lib.logError('*** xhr client exists and is connected! Change APIcall to required lib/instance.');
    }

    Alloy.CFG.logging && $.lib.logInfo('[apicall] open url=' + method + ':' + url + ' payload=' + $.lib.stringify(payload, 2000));
    client.validatesSecureCertificate = false;
    client.open(method, url);
    client.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
    //client.setRequestHeader('Accept', 'application/json');
    isHTTPGet ? client.send() : client.send(JSON.stringify(payload));
  };
};
exports.apiCall = apiCall;


exports.buttonAction = function(e) {
  //Alloy.CFG.logging && $.lib.logInfo('buttonAction: ' + e.source.id + ' ' + $.lib.stringify(e, 2000, true));
  var id = e.source.id;
  if (id.startsWith("button")) {
    id = e.source.id.substr(6);
  }
  
  if (_.isString(id)) {
    var _apikey = id.toLowerCase();
    var _apival = $.lib.api[_apikey];
    var opts = {data: $.lib.safeParse(_apival)};
    $.lib.logInfo("buttonsend " + _apikey + " = " + _apival + " opts="+JSON.stringify(opts));
    $.lib.apiCall('pulse', undefined, undefined, opts);
  }
};

exports.api = {
  server: "192.168.43.149",
  forward: '{"t":20,"s":20,"a":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000023456789abcdefffffffffffffffffffffffecba8643100","b":"0000000000000000000000000000000000000123456789abcdffffffffffffffffffffffffffffffffffedcba9876543210000000000000000000000000000000000","c":"00ffffffffffffffffffffffffffffffffedcba987654321000000000000000000000000000000000000000000000000000000000000000000000000000000000000","d":"00fffffffffffffffffffffffffffffffffffedcba987654321000000000000000000000000000000000000000000000000000000000000000000000000000000000","e":"00000000000000000000000000000000000000123456789abcdeffffffffffffffffffffffffffffffffedcba9876543210000000000000000000000000000000000","f":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000123456789abcdeffffffffffffffffffffffffdcb98764200"}',
  left:    '{"t":20,"s":20,"a":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000","b":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000","c":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","d":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","e":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","f":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}',
  right:    '{"t":20,"s":20,"a":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","b":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","c":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","d":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","e":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000","f":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000"}',
  stop:    '{"t":20,"s":200,"a":"defedcba9876543210","b":"defedcba9876543210","c":"ffffffffff","d":"ffffffffffffffc840","e":"defedcba9876543210","f":"defedcba9876543210"}',
  "01l":    '{"t":20,"s":20,"a":"00000000000000000000000000000000000000000000000000000000000000000000242567788899aacdefffffffffffffffffffffffffffffffffffffffffffffff","b":"0000000000000000000000000000223355678899aabbccddeeffffffffffffffffffffffffffffffffffffecca864322211000000000000000000000000000000000","c":"ffffffffffffffffffffffffffffffffedcba98765420000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","d":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","e":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","f":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}',
  "01r":    '{"t":20,"s":20,"a":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","b":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","c":"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","d":"ffffffffffffffffffffffffffffffffedcba98754310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","e":"0000000000000000000000000000012224455667899abcdddefffffffffffffffffffffffffffffffffffffedcb97764321000000000000000000000000000000000","f":"0000000000000000000000000000000000000000000000000000000000000000000122445566677889abcdefffffffffffffffffffffffffffffffffffffffffffff"}',
  "02": '{"t":20,"s":10000,"a":"02"}',
  "03": '{"t":20,"s":10000,"a":"03"}',
  "04": '{"t":20,"s":10000,"a":"04"}',
  "05": '{"t":20,"s":10000,"a":"05"}',
  "06": '{"t":20,"s":10000,"a":"06"}',
};

exports.loadapi = function() {
  // _.each($.lib.api, function(value, key){
  //   $.lib.api[key] = Ti.App.Properties.getString("api."+key, value);
  //
  //   $.lib.logInfo("loaded " + key + "=" +  $.lib.api[key]);
  // });
};

exports.saveapi = function() {
  //$.lib.logInfo('todo save '+$.lib.stringify(exports.api));
  _.each($.lib.api, function(value, key){
     Ti.App.Properties.setString("api."+key, value);
    //$.lib.logInfo("key="+key);
  });
};



exports.lib = $; // Allows us to use $.lib references inside this controller also :-)

if (Ti.Shadow) {
  addSpy('lib',$);
}