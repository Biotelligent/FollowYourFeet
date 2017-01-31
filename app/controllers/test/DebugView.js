/**
 * On device debug window for accessing config/logs/service functions
 *
 * Enabled in release where $.lib.config.debug.isdeveloper (email ends @netfuse.org)
 *
 * @class DebugView
 */
exports.baseController = 'base/baseviewcontroller';
var MAXLISTSIZE = OS_ANDROID ? 8000 : 8000;  // Android memory overloads
var lastTabIndex = -1;
var LOGTAG = 'debugview';
var testcontroller = undefined;
var embeddedtestview = undefined;
var sipcontroller = undefined;
var embeddedsipview = undefined;

exports.doLoadView = function(e){
  Alloy.CFG.logging && $.lib.logInfo('debugview.startLoading', LOGTAG);
  $.navbar.doLoadView(/*{onLeftButtonClick: doLeftButtonClick}*/);
  $.tabbar.doLoadView({onTabClick: onTabClick});
  $.tabbar.top = 60;

  $.logLabel.applyProperties({top: 0, left: 0, height: $.lib.platform.workingHeight - 90, wordWrap: true});
  $.backgroundLabel.applyProperties({top: 0, left: 0, height: $.lib.platform.workingHeight - 90, wordWrap: true});
  $.configLabel.applyProperties({top: 0, left: 0, height: $.lib.platform.workingHeight - 90});
  $.platformLabel.applyProperties({top: 0, left: 0, height: $.lib.platform.workingHeight - 90});


  doLoadTestMenu();
  doLoadConfig();
  doLoadSIPView();
  doLoadBackLog();
  doLoadBackgroundActivity();
  doLoadPlatform();

  // Assign log info means new log entries are added to the screen in realtime
  $.lib.assignLogInfo(doLogInfo);
  var tabindex = $.args.tabindex || 0;
  exports.gotoPage(tabindex);
  return true;
};

exports.doCloseView = function(e){
  try {
    $.lib.assignLogInfo(undefined);
    $.sipView.remove(embeddedsipview);
    sipcontroller.destroy();
  } catch(E) {
    $.lib.logError(E);
  }
  return true;
};

// function doLeftButtonClick() {
  // $.closeWindowByName('test/DebugView', true);
// };


/**
 * Tap / click handler to update log display
 */
function doRefresh(e) {
  doLoadConfig();
  doLoadBackLog();
  doLoadBackgroundActivity();
  doLoadPlatform();
};

/**
 * Adds an incoming log line to the debug window
 */
function doLogInfo(str) {
  $.logLabel.text = str + '\n' + $.logLabel.text;
};

function doLoadConfig() {
  $.lib.config.load();
  var uptime = '\nUptime: ' + $.lib.platform.uptime() + ' min';
  var osversion = '\nOS: ' + $.lib.platform.osversionname + ' v:' + Ti.Platform.version;
  var cfg = $.lib.stringify($.lib.config.useraccount, MAXLISTSIZE);
  //cfg += '\n' + $.lib.stringify($.lib.config.useroptions, MAXLISTSIZE); circular ref
  $.configLabel.applyProperties({top: 0, left: 0, height: $.lib.platform.workingHeight - 90});
  $.configLabel.text = $.lib.config.appversion + uptime + osversion + '\n' + cfg.replace(/\s*,\s*/g, '\n');
};

function doLoadSIPView() {
  if (_.isUndefined(sipcontroller)) {
    sipcontroller = Alloy.createController('test/DebugSIP');
    sipcontroller.doLoadView();
    embeddedsipview = sipcontroller.getView('thisview');
    if (embeddedsipview) {
      embeddedsipview.applyProperties({top:0});
      $.sipView.add(embeddedsipview);
    }
  }
};

function doLoadBackLog() {
  var log = $.lib.stringify($.lib.backlog.join('\n'), MAXLISTSIZE);
  $.logLabel.text = log;
};

function doLoadBackgroundActivity() {
  var backgroundlog = Ti.App.Properties.getList('backgroundlog', []);
  $.backgroundLabel.text = $.lib.stringify(backgroundlog.join('\n'), MAXLISTSIZE);  ;
};

function doLoadPlatform() {
  if (_.isUndefined(Alloy.Globals.network)) {
    Alloy.Globals.network = Alloy.createController('base/libnetwork');
    Alloy.Globals.network.init();
  }

  var networktext = Alloy.Globals.network.info();
  if (OS_ANDROID) {
    networktext += '\n\nSIM Info:\n' + JSON.stringify(Alloy.Globals.network.networkInfo());
  }
  $.platformLabel.applyProperties({top: 0, left: 0, height: $.lib.platform.workingHeight - 90, verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGNMENT_TOP});
  $.platformLabel.text = networktext.replace(/\s*,\s*/g, '\n');
};

/**
 * Embed the history controller into the history display tab
 */
function doLoadTestMenu() {
  if (_.isUndefined(testcontroller)) {
    testcontroller = Alloy.createController('test/TestMenu');
    testcontroller.addMenuItems();
    embeddedtestview = testcontroller.getView('testview');
    if (embeddedtestview) {
      embeddedtestview.applyProperties({top:0});
      $.testView.add(embeddedtestview);
    }
  }
};

function onTabClick(e) {
  // Tab change
  if (e && (e.index !== lastTabIndex)) {
    lastTabIndex = e.index;
    $.configView.visible = (e.index === 0);
    $.logView.visible = (e.index === 1);
    $.backgroundView.visible = (e.index === 2);
    $.platformView.visible = (e.index === 3);
    $.sipView.visible = (e.index === 4);
    $.testView.visible = (e.index === 5);
  }
};
exports.gotoPage = function(index) {
  onTabClick({index: index});
};