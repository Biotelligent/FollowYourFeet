/*jslint maxerr:1000 */
'use strict';
/*
* Debug helper unit to assist running live REPL and jasmine tests
*
* @class libdebug
*/
var LOGTAG = 'libdebug';
var LOGTEST = 'test';
var args = arguments[0] || {};
$.args = args;
$.lib = $.args.lib || Alloy.Globals.lib;
Ti.API.info('Initialising '+LOGTAG);

_.extend(exports, {
  version: 0.1,
  isdeveloper: $.args.allowdebugmode, // && combined with email@netfuse.org in config.load()
  isunittest: false,
  currentspec: undefined,
  currentspecname: undefined,
  currentspectimeoutid: undefined,
  android: OS_ANDROID ? true : false,
  ios: OS_IOS ? true : false,

  testnodownload: true,
  testoffline: $.args.isweeklyrelease ? false : false,
  testhaltonerror: false,
  testdata: undefined,
  testsignup: !$.args.isweeklyrelease ? false : false,
  testcontextmenu: false,
  testendpoint: false,
  testallcontacts: false,
  testskipstartup: Ti.Shadow ? false : false, // bypass loading contacts and cache when true
  test401: false,     // Test an authentication (platform) http error
  test404: false,     // Test a genuine server http error
  testnodial: false,  // Disable outbound dialler, for testing call connect UI
  testnewinstall: false,
  testhistory: true,

  testlastscreen: Ti.Shadow ? {controllername: 'test/DebugView', tabindex: 5} : undefined,
});
//_.extend(exports, debug);
exports.checkVersion = function() {
  $.version = 1.0;
  return LOGTAG + ' ' + (( $.version === $.lib.debug.version) ? 'ok ' : 'ERROR: version mismatch ') + ' int: ' + $.version + ' ext: ' + $.lib.debug.version;
};


// Prevent the un/reinstall process btw android builds losing the token and requiring re-registratad bion
// [REPL] var lib=getSpy('lib'); console.log(lib.config.useraccount); // 16788eb0cea6bba6c027217620d801c9
var testaccounts = [
    // { device_guid: 'b2a0c62a5913f4a4',
      // platform: 'Google Nexus 6 - 5.0.0 - API 21 - 1440x2560',
      // token: '6d6220b34a14f0866a1793cf7560092b',
    // },

    { device_guid: 'all',
      platform: '',
      //token: '6d6220b34a14f0866a1793cf7560092b',
      token: '466db7b2ca264bf3e621f990096d70f1',
    },

    { platform: 'SM-G930F',
      msisdn:"447553026318",
      token:"a6c2066dee8e405aa46441a75fdaff2d",
      name: 's7',
    },

    { platform: 'SM-N910F',
      msisdn:"447430616994",
      token:"a6c2066dee8e405aa46441a75fdaff2d",
      name: 'note4',
    },

    {platform: "iPhone6,2",
      msisdn:"447553026318",
      token:"d24a8abe857a75f40f211bc3c4d21c8f", //"a4c1764e1da37f69b45659236a92efcf",
      name: '5s',
    },

    {platform: "iPhone5,1",
      msisdn:"447463035996",
      token:"d24a8abe857a75f40f211bc3c4d21c8f", //"a4c1764e1da37f69b45659236a92efcf",
      name: '5',
    },

    {platform: 'Google Nexus 6 - 5.0.0 - API 21 - 1440x2560',
      msisdn: '447000000001',
      token:"1ec9393cc485ce45498bb1533c13ac84",
    },

    {platform: 'SM-N9005xDean',
      msisdn: '447789220007',
      token:"6b15e68ec3a65e006c4c5295d7f03b81",
    },

   {platform: 'Samsung Galaxy S5 - 4.4.4 - API 19 - 1080x1920',
      msisdn: '447000000002',
      token:" 64c7d45f82631272fb13ac5fcf9f90e4",
    },

   // HTC on 3 SIM
   { platform: 'One X',
     token: 'd990599995e5d63045f1d198ba3e22e4',
     msisdn: '447480987879',
    },

   // HTC on Chameleon Vodafone SIM
   { platform: 'One X Justin',
     token: '131582cc333044069c11fc06f29bd4f2',
     msisdn: '447430616994',
    },

   { platform: 'Simulator',
      msisdn: '447553026318', //'447000000001',
      token:"d24a8abe857a75f40f211bc3c4d21c8f",
    },

    {platform: "iPhone5,2",
      msisdn:"447463035996",
      token:"884cf2edad37edf3ac12467b364d18e8",
      name: '5',
    },

    // Pete Moto G2
    { platform: "XT1068",
      msisdn:"447922092583",
      token:"124dd72c01e768717e2f67e908320ac4",
    },
];

function whoami() {
  Alloy.CFG.logging && $.lib.logInfo(model() + ' ' + $.lib.config.useraccount.token + ' ' + $.lib.config.useraccount.msisdn + ' ' + $.lib.config.useraccount.sip_user, LOGTAG);
};
exports.whoami = whoami;

/**
 * List all the views in the controller
 */
function logControllerViews(controller, toponly) {
  controller = controller || Alloy.Globals.controller;
  if (controller) {
    var views = (!!toponly) ? controller.getTopLevelViews() : controller.getViews();
    for (each in views) {
        var view = views[each];
        Alloy.CFG.logging && $.lib.logInfo(view.id);
    }
  } else {
    $.lib.logError('No activecontroller', LOGTAG);
  }
};
exports.logControllerViews = logControllerViews;

/**
 * List all the exported functions in the controller
 */
function logControllerFunctions(controller) {
  controller = controller || Alloy.Globals.controller;
  if (controller) {
    Alloy.CFG.logging && $.lib.logInfo(_.functions(controller));
  } else {
    $.lib.logError('No activecontroller', LOGTAG);
  }
};
exports.logControllerFunctions = logControllerFunctions;

/*
 * Colourise the border of all the view + child elements and show the names plus classes (requires autoStyle=true)
 */
exports.debugLayout = function(view) {
  $.lib.platform.debugLayout(view);
};

/*
 * De-colourise the border of all the view + child elements
 */
exports.revertLayout = function(view) {
  $.lib.platform.revertLayout(view);
};


/**
 * Predefined account-details allow the simulators to reuse existing platform accounts (because appify uninstalls and removes their local configs)
 *
 * @return {Boolean} true if the account is valid either normally or through injection of testaccount data
 */
function loadTestAccount() {
  var platformModel = Ti.Platform.model;
  var deviceGUID = Ti.Platform.id;
  Ti.API.warn('[TEST] Checking for TestAccount enabled=' + $.lib.appsettings.enableTestAccount + ' model='+ platformModel + ' device_guid='+ deviceGUID);
  if (!$.lib.config.isloaded) {
    $.lib.config.load();
  }

  // Release build
  if ($.lib.debug.testnewinstall || ! $.lib.appsettings.enableTestAccount) {
    return false;
  }
  if (false && $.lib.config.isverifieduser()) { // unused
    return true;
  }

  // Skip any iPhone 5S that isn't mine
  //if ((platformModel === "iPhone6,2") && !Ti.Shadow) {
  //  return $.lib.config.isverifieduser();
  //}
  for (var i in testaccounts) {
    var item = testaccounts[i];
    if (item.device_guid && ((item.device_guid === deviceGUID) || (item.device_guid === 'all'))) {
      $.lib.logError('NEW ACCOUNT reloading TESTACCOUNT from ' + JSON.stringify(item), LOGTAG);
      $.lib.config.useraccount.verified = true;
      $.lib.config.useraccount.token = exports.test401 ? 'invalidtoken' : item.token;
      //$.lib.config.useraccount.msisdn = item.msisdn;
      $.lib.config.useraccount.firstname = platformModel;
      $.lib.config.save();
      $.lib.config.load();
      return true;
    }
    // The rest of the account data will be loaded at the next PostUIStartupChecks.queryAccountDetails
  }
  return false;
};
exports.loadTestAccount = loadTestAccount;


/**
 * Debug assist for REPL
 * if ($.lib.debug.model('note4')) { dosomething(); }
 */
function model(modelname) {
  var platformModel = Ti.Platform.model;
  var thismodel = platformModel;
  switch(platformModel) {
     case 'Google Nexus 6 - 5.0.0 - API 21 - 1440x2560':
       thismodel = 'nexus';
       break;

     case 'Samsung Galaxy S5 - 4.4.4 - API 19 - 1080x1920':
       thismodel = 's5';
       break;

     case 'Simulator':
       thismodel = 'sim';
       break;

     case 'SM-G930F':
       thismodel = 's7';
       break;

     case 'SM-N910F':
       thismodel = 'note4';
       break;

     case 'SM-N9005':
       thismodel = 'note3';
       break;

     case 'One X':
       thismodel = 'htc';
       break;

     case 'iPhone6,2':
       thismodel = '5s';
       break;

     case 'iPhone5,2':
     case 'iPhone5,1':
       thismodel = 'i5';
       break;

     case 'XT1068':
       thismodel = 'moto';
       break;
  }

  // Return true if matched or the model if not
  if (_.isString(modelname)) {
    return modelname.sameText('all') || modelname.sameText(thismodel);
  } else {
    return thismodel;
  }
};
exports.model = model;

/*
function queryAndroidIntentFilters() {
    var tools = require('bencoding.android.tools');
    var platformTools = tools.createPlatform();
    var intent = Ti.Android.createIntent({action: Ti.Android.ACTION_CALL, data: '01273123123'});

    if(platformTools.intentAvailable(intent)){
      Ti.Android.currentActivity.startActivity(intent);
    } else {
      $.lib.logError('no intent filter for ACTION_CALL');
    }
};
exports.queryAndroidIntentFilters = queryAndroidIntentFilters;
*/
/**
 * Calabash/REPL functions
 */
function loadSpec(specname) {
  if ($.currentspecname !== specname) {
    $.currentspec = null;
    try {
      $.currentspec = require('/specs/' + specname + '_spec');
      $.currentspecname = specname;
    } catch(E) {
      $.currentspec = null;
      $.lib.logError('Could not load spec ' + E.message);
    }
  }
};
exports.loadSpec = loadSpec;

function runSpec(device, opts) {
  // Run, optionally only on 1 device
  if (! _.isUndefined(device)) {
    if (! $.lib.debug.model(device)) return;
  }
  if (opts && ! _.isUndefined(opts.testhaltonerror)) {
    $.testhaltonerror = opts.testhaltonerror;
  }

  if (opts && ! _.isUndefined(opts.loglevel)) {
    $.lib.appsettings.debugLogLevel = opts.loglevel;
  }

  if (!$.testdata) {
    $.lib.logError("First run: loading test data, wait, then run again");
    loadData(device, true);
  } else {
    $.currentspec.run(device, opts);
  }
};
exports.runSpec = runSpec;

function loadData(device, isunittest) {
  if (! _.isUndefined(device)) {
    if (! $.lib.debug.model(device)) return;
  }

  if (true === isunittest) {
    testSetup();
    $.lib.appsettings.debugLogLevel = 3;
  } else {
    testTeardown();
    $.isunittest = false;
    $.lib.appsettings.enableUnitTest = false;
  }

  $.lib.config.clearConfiguration();
  Alloy.Globals.contact.loadFromFile({reload:true});

  // On complete, run checks, then open the window stack for ZCall
  $.lib.startup.startupTasks(true, function(){
    $.lib.debug.openWindowStack({ZCall:{drawer: true, tabindex: 0}}); //, onDataLoaded: callbackOnOpened}});
    if (Alloy.Globals.activecontroller && (Alloy.Globals.activecontroller.__controllerPath === 'ZCall')) {
      Alloy.Globals.activecontroller.contactsLoaded();
    }
  });
};
exports.loadData = loadData;

/**
 * Calabash/REPL assist, open a dependent series of windows
 *
 * Ensure each in a series of windows is opened, skipping if already open
 * {ZRec:{drawer: true}, ZRecPlayback:{model: modelxf, modal: true}};
 *
 */
function openWindowStack(windowstack) {
  var starttimeout = 0;
  var controllernames = [];
  var calllist = [];

  Alloy.Globals.controllerstack.forEach(function(controller){
    controllernames.push(controller.__controllerPath);
  });
  var ws = _.omit(windowstack, controllernames);

  _.each(ws, function(win_obj, win_key) {
    Alloy.CFG.logging && $.lib.logInfo('forEach opening window ' + win_key + ' with opts ' + JSON.stringify(win_obj), LOGTEST);

    // Bind the delayed function call to the current params
    calllist.push(_.bind(openWindow, {name:win_key, opts:win_obj}));
    setTimeout(function(){
      var func = calllist.shift();
      func();
    }, starttimeout);
    starttimeout += 1000;
  });
};
exports.openWindowStack = openWindowStack;

function openWindow() {
  Alloy.CFG.logging && $.lib.logInfo('timeout opening window ' + this.name, 'test');// + ' with opts ' + JSON.stringify(this.opts), 'REPL');
  if (! Ti.Shadow) {
    Ti.API.error('openWindow requires Ti.Shadow support?');
  }
  active = $.lib.nav || Alloy.Globals.activecontroller;
  if (this.opts.drawer) {
    active.openDrawerWindow( this.name, this.opts);
  } else if (this.opts.modal) {
    active.openModalWindow( this.name, this.opts);
  } else {
    active.openDetailWindow( this.name, this.opts);
  }
};

function screenShot(scale) {
 if (Ti.Shadow) {
    var ts = require("/api/TiShadow");
    ts.screenshot({scale: 0.5});
  } else {
    Alloy.CFG.logging && $.lib.logInfo("Local media screenshot taken");
    Ti.Media.takeScreenshot(function(o) {
      var image = o.media;
      if (data.scale) {
        var height = Ti.Platform.displayCaps.platformHeight * data.scale;
        var width = Ti.Platform.displayCaps.platformWidth * data.scale;
        image = image.imageAsResized(width, height);
      }
      //var imgStr = Ti.Utils.base64encode(image).toString();
    });
  }
};
exports.screenShot = screenShot;

function check(istrue, description) {
  if (! istrue) {
    lib.logError('Fail: expected ' + description + ' :false', 'test');
    if ($.testhaltonerror) {
      var msg = 'Stopping tests: expected ' + description;
      throw new Error(msg);
    }
  } else {
    lib.logInfo('Pass: ' + description, 'test');
  }

  // Allow chaining.
  return istrue;
};
exports.check = check;

/**
 * Does obj contain all the matching key+values in attrs?
 */
function isMatch(object, attrs) {
  try {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return false;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  } catch(E) {
    return false;
  }
};
exports.isMatch = isMatch;

function logLastCall() {
  var userhistory = Alloy.Collections.instance('Usercallhistory');
  var lastcalls = _.first(userhistory.models, 1);
  if (lastcalls.length === 1) {
    var lastcall = lastcalls[0].transform();
    Alloy.CFG.logging && $.lib.logInfo(_.omit(lastcall,'sessioninfostring'), 'test');
  }
};
exports.logLastCall = logLastCall;
/**
 * Verify the last call log matches the expected dictionary
 */
function checkCallHistory(expected) {
  Alloy.CFG.logging && $.lib.logInfo('checkCallHistory: ' + JSON.stringify(expected), 'test');
  var userhistory = Alloy.Collections.instance('Usercallhistory');
  var lastcalls = _.first(userhistory.models, 1);
  if (lastcalls.length === 1) {
    var lastcall = lastcalls[0].transform();
    return check(isMatch(lastcall, expected), 'callhistory: ' + JSON.stringify(expected) + ' from: ' + _.omit(lastcall,'sessioninfostring'));
  } else {
    return check(false, 'Error reading call history');
  }
};
exports.checkCallHistory = checkCallHistory;

/**
 * Initiate an inbound call
 * @param {Object} - opts msisdn: number to call - normally own msisdn  from: phonenumber to display
 */
function testInboundCall(params){
  // var lib=getSpy('lib'); var sip=Alloy.Globals.sip; if (lib.debug.model('note4')) { lib.debug.testInboundCall({pstn:false} );
  var defaults = {
    msisdn: $.lib.config.useraccount.msisdn,
    from:  $.lib.config.useraccount.msisdn,
    pstn: false,
    delay: 0
  };

  try {
    _.defaults(params, defaults);
    var opts = (true === params.pstn) ? Alloy.Globals.zplatform.endpointDict('unittest/inbound_pstn') : Alloy.Globals.zplatform.endpointDict('unittest/inbound_device');
    opts.data.msisdn = params.msisdn;
    opts.data.from = params.from;
    setTimeout(function(){
      Alloy.Globals.zplatform.apiCall(opts.endpoint, testInboundCallSuccess, testInboundCallFailure, opts);
    }, params.delay);
  } catch(E) {
    testInboundCallFailure(E.message);
  }
};
exports.testInboundCall = testInboundCall;

function testInboundCallSuccess(message) {
  Alloy.CFG.logging && $.lib.logInfo('Inbound call api triggered', 'test');
};

function testInboundCallFailure(message) {
  // Whitelist or an offline/no data test
  $.lib.logError(message, LOGTAG + '.testInboundCallFailure');
};

/**
 * Carry out the hangup type.
 * endCall: aborted by the caller clicking the endCall button
 * noAnswer: hung up (disconnected by the callee) without a connected state (nb. will go to redial if a znumber)
 * answered: fake a connected state which lasts 5 seconds
 */
function performHangupType(hangup) {
  Alloy.CFG.logging && $.lib.logInfo('performHangupType on timeout: ' + hangup.type, LOGTEST);

  var sip = Alloy.Globals.sip;
  if (sip.isConnected()) {
    switch (hangup.type) {
      case 'endCall':
        sip.endCall();
        break;

      case 'noAnswer':
        sip.siplib.endCall();
        break;

      case 'answered':
        var zcallstate = (sip.sessioninfo.zcalltype = sip.zcalltype.OUTBOUND_SIP) ? sip.zcallstate.PJSIP_INV_STATE_CONFIRMED : sip.zcallstate.TEL_CONNECTED;
        sip.handleSIPCallState({State: zcallstate});
        break;
    }
  }

  if (hangup.type !== 'answered') {
    if (hangup.callhistory) {
    //  checkCallHistory(hangup.callhistory); *** needs delay
    }
    if (_.isFunction(hangup.callbackHangup)) {
      hangup.callbackHangup();
    }
  }
};

function hangupCall(hangup) {
  var sip = Alloy.Globals.sip;
  var delay = +hangup.timeout || 0;
  if (delay == 0) {
    performHangupType(hangup);
    return;
  }

  // Answer, wait 5 seconds, hangup
  if (hangup.type === 'answered') {
    setTimeout(function(){ performHangupType(hangup); }, delay);

    var hangupAfterAnswer = _.clone(hangup);
    hangupAfterAnswer.type = 'endCall';
    delay += 5000;
    $.currentspectimeoutid = setTimeout(function(){ performHangupType(hangupAfterAnswer); }, delay);
  } else {
    $.currentspectimeoutid = setTimeout(function(){ performHangupType(hangup); }, delay);
  }

  if (hangup.callhistory) {
    delay += 2500;
    setTimeout(function(){ checkCallHistory(hangup.callhistory); }, delay);
  }
};
exports.hangupCall = hangupCall;

/**
 *
 */
function testOutboundDial(opts) {
  // First check if we are dialling out from the numpad
  if (! (opts && opts.phonenumber)) {
    $.lib.logError('Specify a phonenumber to dial');
  }
  var defaults = {data: true, contact: undefined, recordoutbound: false, chargeable: false, hangup:{type: 'endCall', timeout: 30000}};
  _.defaults(opts, defaults);
  Alloy.CFG.logging && $.lib.logInfo('testOutboundDial: ' + JSON.stringify(opts), LOGTEST);

  if (opts.hangup) {
    opts.hangup.callhistory = opts.callhistory;
    hangupCall(opts.hangup);
  }

  opts.isData = opts.data;
  opts.zcontact = opts.contact;
  Alloy.Globals.sip.dialFromCallbar(opts.phonenumber, opts);
};
exports.testOutboundDial = testOutboundDial;

/*
 *
 */
function testOutboundDialFromKeypad(opts) {
  // First check if we are dialling out from the numpad
  if (! (opts && opts.phonenumber)) {
    $.lib.logError('Specify a phonenumber to dial');
  }
  var defaults = {data: true, phonenumber: '07452457244', contact: undefined, recordoutbound: false, hangup:{type: 'endCall', timeout: 30000, callbackHangup: undefined}};
  _.defaults(opts, defaults);

  if (! check(lib.nav.activecontrollerName() === 'ZCall', 'Active controller is ZCall')) return;

  if (opts.hangup) {
    opts.hangup.callhistory = opts.callhistory;
    hangupCall(opts.hangup);
  }

  if ($.lib.nav.activecontrollerName() !== 'ZCall') {
    $.lib.logError('Active controller is ' + $.lib.nav.activecontrollerName());
    openWindowStack({ZCall:{drawer: true, tabindex: 4, xonDataLoaded: callbackOnOpened}});
    return;
  }

  var active = Alloy.Globals.activecontroller;
  $.lib.logError('Active controller is ' + $.lib.nav.activecontrollerName() + ' showKeypadWithNumber '+opts.phonenumber);
  active.showKeypadWithNumber(opts.phonenumber);
  setTimeout(function(){
    check(active.numpadCallbar.isData, "Call type is data");
    check(active.phonenumberText.text == opts.phonenumber, "Numpad field has the correct number");
    active.numpadCallbar.callButtonView.fireEvent('click');
  }, 500);
  return true;
};
exports.testOutboundDialFromKeypad = testOutboundDialFromKeypad;


function testSetup(logging) {
  Alloy.Globals.environment = 'test';
  if (!Alloy.Globals.testdata) {
    Alloy.Globals.testdata = Alloy.createController('base/libtestdata', {lib: $.lib});
    $.testdata = Alloy.Globals.testdata;
  }
  $.lib.appsettings.enableUnitTest = true;
  $.isunittest = true;
  $.lib.appsettings.debugLogLevel = (logging === true) ? 3 : 0;
};
exports.testSetup = testSetup;

function testTeardown() {
  Alloy.Globals.environment = '';
  $.lib.appsettings.debugLogLevel = 3;
};
exports.testTeardown = testTeardown;

function closeApp() {
  if (Ti.Shadow) {
    var ts = require("/api/TiShadow");
    ts.closeApp();
  }
};
exports.closeApp = closeApp;

/**
 * Force app to the background
 */
function backgroundApp() {
  if (OS_ANDROID) {
    var intent = Ti.Android.createIntent({action: Ti.Android.ACTION_MAIN});
    intent.addCategory(Ti.Android.CATEGORY_HOME);
    intent.addFlags(Ti.Android.FLAG_ACTIVITY_NEW_TASK);
    if (! $.lib.platform.startAndroidActivity(intent)) {
      $.lib.nav.showErrorNotification(L('error-cannotexit', 'Use the home button to return to the main android window.'));
    }
  }
};
exports.backgroundApp = backgroundApp;

if (Ti.Shadow) { addSpy('libdebug', $); }
