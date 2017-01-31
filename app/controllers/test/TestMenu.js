/**
 * "Flipbook" for reviewing screens and running tests to aid android/ios/tablet debugging
 * with next() function for automated driving from Ti.Shadow or TiJasmine unit tests
 *
 * (Some UI is usually accessible only under data or step-sequence preconditions)
 * @class TestMenu
 */
exports.baseController = 'base/baseviewcontroller';
exports.isfetching = false;
var view = $.mainview;
var args = arguments[0] || {};
var badgesSet = false;
var isDeveloper = true;
var nextBtn, logBtn;
var currentItem = 0;
var LOGTAG = 'TestMenu';
var apiserver = apiServer();

exports.doLoadView = function(e) {
  /*
  $.navbar.doLoadView({
    onIconButtonClick: doNext,
    onLeftButtonClick: closeTestMenu
  });*/
  $.navbar.doLoadView({title: 'Test menu', detail: true});
  try {
    addMenuItems();
    return true;
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.doLoadView');
    return false;
  }
};

exports.doCloseView = function(e) {
  $.listTable.removeEventListener('click', doRowSelect);
  //nextBtn.removeEventListener('click', doNext);
  return true;
};

function closeTestMenu() {
  _.defer(function(e) { $.closeWindow(); });
};
exports.closeTestMenu = closeTestMenu;

function deferredShowMainMenu() {
  // $.closeWindow();
  _.defer(function() { $.closeWindow(); $.showMainMenu(); });
};

function apiServer() {
  return (true === $.lib.debug.testendpoint) ? 'api-url: LOOPBACK' : 'api-url: api.zoopachat.com';
};

function toggleEndpoint(e) {
  $.lib.debug.testendpoint = !$.lib.debug.testendpoint;
  menuRows[1].title = apiServer();
  $.listTable.setData(menuRows);
};

function showSessionInfo() {
  $.lib.nav.showAlert(Alloy.Globals.sip.logSessionInfo('test'));
};

function clearSession() {
  Alloy.Globals.sip.clearSession();
};

var calling = {force: true, State: 1, RemoteInfo: "442072221234", isData: true, uri: "02072221234", zcallstate: Alloy.Globals.sip.zcallstate.TEL_OUTBOUND_CALLING};
var incoming = {force: true, State: 2, RemoteInfo: "447430784000", zcallstate: Alloy.Globals.sip.zcallstate.PJSIP_INV_STATE_INCOMING};
var connected = {force: true, State:5, RemoteInfo: "447430784000", zcallstate: Alloy.Globals.sip.zcallstate.PJSIP_INV_STATE_CONFIRMED};
var disconnected = {force: true, State:6, RemoteInfo: "447430784000", zcallstate: Alloy.Globals.sip.zcallstate.PJSIP_INV_STATE_DISCONNECTED};
function showCallConnect(e) {
  //Alloy.Globals.sip.sessioninfo.zcallstate = e.zcallstate;
  if (e.State && (e.State === 1)) {
    Alloy.Globals.sip.dialFromCallbar(e.uri, e);
  }
  Alloy.Globals.sip.applyCallState(e);
};

function showProxy(e) {
  if (OS_IOS) {
    Alloy.Globals.sip.siplib.openProxyWindow(e);
  } else {
    // TODO: write your module tests here
    if (Ti.Platform.name == "android") {
      var proxy = Alloy.Globals.sip.siplib.createExample({
        message: "Creating an example Proxy",
        backgroundColor: "red",
        width: 100,
        height: 100,
        top: 100,
        left: 150
      });

      proxy.printMessage("Hello world!");
      proxy.message = "Hi world!.  It's me again.";
      proxy.printMessage("Hello world!");
      alert('proxy created');

      var win = Ti.UI.createWindow({
        backgroundColor:'white'
      });
      var label = Ti.UI.createLabel();
      win.open();
      win.add(proxy);

      setTimeout(function(e){
        win.close();
      },
      8000);
    }
  }
};

function restartSIP() {
  Alloy.Globals.sip.restartSIP(
    function(e){
      alert('success');
    },
    function(e){
      alert('failed ' + e);
    }
  );
};

function reregisterSIP() {
  Alloy.Globals.sip.reregisterSIP(
    function(e){
      alert('success');
    },
    function(e){
      alert('failed ' + e);
    }
  );
};

/**
 * Each menu item can have
 *  an action (function)
 *  or name (viewcontroller)
 *
 *  and opts (args to pass)
 *  and next (function WITHIN the controller to call - which would perform a test inside the controller, and close it when done)
 */
var menuRows = [
  //{title: 'Run unit tests', action: $.lib.Debug.runTest },
  //{title: 'Run standalone view memory test', action: $.lib.Debug.runMemTest, opts: 1 },
  //{title: 'Run dual view memory test', action: $.lib.Debug.runMemTest, opts: 2 },
  //{title: 'Run picker dialog memory test', action: $.lib.Debug.runMemTest, opts: 3 },
  // {title: 'Provider search', name:  'alloy/controllers/ProviderSearch', next: 'debugProviderSearch' },
  { title: 'MainMenu',
    action: deferredShowMainMenu,
   },
  { title: 'Restart SIP',
    action: restartSIP,
   },
  { title: 'Reregister SIP',
    action: reregisterSIP,
   },
  { title: 'Show Call Session Info',
    action: showSessionInfo,
   },
  { title: 'Clear Call Session Info',
    action: clearSession,
   },
  { title: 'Open Call Connect Incoming',
    action: showCallConnect,
    opts: incoming,
   },
  { title: 'Open Call Connect Outgoing',
    action: showCallConnect,
    opts: calling,
   },
  { title: 'Open Call Connect Connected',
    action: showCallConnect,
    opts: connected,
   },
  { title: 'Open Call Connect Disconnected',
    action: showCallConnect,
    opts: disconnected,
   },
  { title: 'Open Proxy Window',
    action: showProxy,
    opts: 1,
   },
  // Show signup page
  { title: 'Signup walkthrough',
    name: 'Signup' },
  { title: 'ZoopaChat Original Contact Load',
    name: 'ZCall' },
  { title: apiserver,
    action: toggleEndpoint,
   },
  { title: 'Reset account, restart sign-up',
    action: $.resetAccount,
    opts: {endpoint: 'accounts', test: 1},
   },
  { title: 'SIP/GSM Test UI',
    name: 'test/DebugSIP2',
   },
  { title: 'Call Connect UI',
    name: 'CallConnect' },
  { title: 'apiTest accounts',
    action: apiTest,
    opts: {endpoint: 'accounts', test: 1},
   },
  { title: 'balance - Change',
    action: changeBalance,
  },

  { title: 'balance - Low',
    action: lowBalance,
  },

  { title: 'balance - Reset',
    action: resetBalance,
  },

  { title: 'apiTest registeraccount',
    action: apiTest,
    opts: 'register'
   },
  { title: 'apiTest trunks',
    action: apiTest,
    opts: 'trunks',
   },
  { title: 'apiTest rates',
    action: apiTest,
    opts: 'rates',
   },
  { title: 'apiTest msisdns/search',
    action: apiTest,
    opts: 'search',
   },
  { title: 'apiTest failure',
    action: apiTest,
    opts: {endpoint: 'failure', test: 1},
   },
  { title: 'apiTest validatecode',
    action: apiTest,
    opts: {
      endpoint: 'validatecode',
      data:{code: 1234}},
      expect: {status:{code:200,text:"Verification succeeded"}, response:{token:"adifferentnewtoken"}}
   },
  { title: 'apiTest validatecode - fail',
    action: apiTest,
    opts: {
      endpoint: 'validatecode',
      data:{code: 5555}},
      expect: {status:{code:401,text:"Verification failed"}}
   },
  { title: 'UI Templates',
    name: 'UX',
   },
];

function changeBalance() {
  $.lib.config.accountbalance.lastbalance = 0.95;
  $.lib.config.useraccount.balance = .91;
  $.lib.config.accountbalance.updateBalance();
  $.closeWindow();
};

function lowBalance() {
  $.lib.config.accountbalance.lastbalance = 0.95;
  $.lib.config.useraccount.balance = .50;
  $.lib.config.accountbalance.updateBalance();
  $.closeWindow();
};

function resetBalance() {
  $.lib.config.accountbalance.lastbalance = 0.95;
  $.lib.config.useraccount.balance = 1.00;
  $.lib.config.accountbalance.updateBalance();
};
/**
 * Clear all cookies and restart the signin process
 */
exports.resetAccount = function() {
  $.lib.config.useraccount = {};
  $.lib.config.save();
  $.lib.config.load();
  $.lib.config.isnewsetup = true;
  $.openModalWindow('Signup');
};

/**
 * Clear all cookies and restart the signin process
 */
function apiTest(opts) {
  // TODO: Z setserver etc
  if (_.isString(opts)) {
    opts = Alloy.Globals.zplatform.endpointDict(opts);
    opts.data = _.clone(opts.testdata);
  }

  Alloy.CFG.logging && $.lib.logInfo('[TEST] Run api test with ' + JSON.stringify(opts));
  Alloy.Globals.zplatform.apiCall(opts.endpoint, doAPISuccess, doAPIFailure, opts);
};
exports.apiTest = apiTest;

function showalert(res, ok) {
  $.showAlert(JSON.stringify(res));
 return;
};

function doAPISuccess(res) {
  var str = '[success]\n';
  str += JSON.stringify(res);
  Alloy.CFG.logging && $.lib.logInfo(str, 'APITEST');
  alert(res, 'success');
};

function doAPIFailure(res) {
  var str = '[failed]\n';
  str += JSON.stringify(res);
  Alloy.CFG.logging && $.lib.logInfo(str, 'APITEST');
  alert(res, 'failed');
};


function testEndpoint() {
  $.openDetailWindow(menuitem.name, {title: menuitem.title}, menuitem.opts);
};

function addMenuItems() {
  for (var i = 0; i < menuRows.length; i++) {
    // Assigning rowData is necessary for Android, as e.row is not assigned in setData('arrayofdataNOTtablerows')
    menuRows[i].rowData = _.clone(menuRows[i]); // {};
    menuRows[i].rowData.index = i;

    menuRows[i].hasChild = true;
    menuRows[i].height = 40;
    menuRows[i].font = Alloy.CFG.Skin.fontNormal;
    menuRows[i].color = menuRows[i].title.startsWith('balance') ? 'green' : (menuRows[i].title.startsWith('apiTest') ? 'navy' : Alloy.CFG.Skin.defaultTextColor);
    menuRows[i].indentationLevel = 2;
    menuRows[i].backgroundColor = "white";
  }
  currentItem = 0;

  $.listTable.separatorColor = 'transparent';
  $.listTable.setData(menuRows);
  $.listTable.addEventListener('click', _.bind(doRowSelect, this));
};
exports.addMenuItems = addMenuItems;

function doControllerNext(controller, fn) {
  try {
    if (_.isFunction(controller[fn])) {
      controller[fn]();
    } else {
      $.lib.logError('doControllerNext ' + fn + ' is not a function of ' + controller.__controllerPath);
    }
  } catch(E) {
    $.lib.showError(E, 'TestMenu.doControllerNext');
  }
};

function doNext() {
  // Flip to the next item - used for "driving" the changes from Ti.Shadow REPL so side-by-side comparisons are easy
  var currentitem = menuRows[currentItem];
  Alloy.CFG.logging && $.lib.logInfo('TestMenu.doNext=' + currentItem + ' ' + currentitem.rowData.name, ['test']);

  // An item can have a "subaction" like opening a picker which is assigned to menu.next
  if (currentitem.next) {
    var controller = $.activecontroller;
    if (controller) {
      doControllerNext(controller, currentitem.rowData.next);
    } else {
      $.lib.logError('No controller for ' + currentitem.rowData.name);
    }
    currentItem++;
  } else {
    if (currentItem++ >= menuRows.length) {
      currentItem = 0;
    }
    openItem(menuRows[currentItem].rowData);
  }
};
exports.next = doNext;

function openItem(menurow) {
  var menuitem = (menurow.rowData) ? menurow.rowData : menurow;
  currentItem = menuitem.index;
  if (menuitem.action) {
    //closeQuickMenu();  JMH re-enable if want to close the menu - otherwise closes the app
    menuitem.action(menuitem.opts);
  } else {
    //closeQuickMenu();
    $.openDetailWindow(menuitem.name, _.extend({title: menuitem.title}, menuitem.opts));
  }
};

function doRowSelect(e) {
  openItem(e.rowData);
};

function closeQuickMenu() {
  // Move this to exit check
  if (_.isFunction(args.onclose)) {
    args.onclose();
  }
};

if (Ti.Shadow) { addSpy('TestMenu',$); }