/**
 * Container for the UX/Debug menu
 *
 * @class DebugMenu
 */
exports.baseController = 'base/baseviewcontroller';
var LOGTAG = 'DebugMenu';

exports.doLoadView = function(e) {
  $.notificationRow.onSubmenuClick = doTestNotificationClick;
  $.cleardataRow.onSubmenuClick = doClearDataClick;
  return true;
};

exports.doCloseView = function(e) {
  return true;
};


function testPush(_delay) {
  var fakeCallers = [
    "Paris Hilton",
    "Jane Doe",
    "Peter",
    "Leo",
    "Chilli Corner",
    "Jam and Spoon",
    "Anonymous",
    "Marketing"
  ];
  var guid = Ti.Platform.createUUID();
  var title = "Call from " + fakeCallers[Math.floor(Math.random() * (fakeCallers.length-1))];
  //var alert = OS_IOS
  var dt = new Date(Date.now());

  var payload = {
    "android": {
      "title": title,
      "alert": "Dialled number 443308000100",
    },
    "title": title,
    "alert": "Dialled number 443308000100",
    "feet": {
      "guid": guid,
      "date": dt.toISOString(),
      "datestring": "4/14/2016 16:49",
      "date_sent": "2016-04-04T21:52:05.223Z",
      "dnis": "443308000100",
      "clid": "anonymous",
      "account_id": "10000",
      "user_id": "75002",
      "team_id": "5000",
      "team_name": "Leo and Justin",
      "active": true
    }
  };
  Alloy.Globals.acspush.scheduleTestNotification({delay: _delay, payload: payload});
};


function doTestNotificationClick(e) {
  Alloy.CFG.logging && $.lib.logInfo('doTestNotificationClick', LOGTAG);
  var opts = {
    cancel: 4,
    options: [
      'Test Notification in 4s',
      'Test Notification in 1s',
      'Token Detail',
      'Resubscribe',
      'Cancel']
    ,
    selectedIndex: 2,
    destructive: 4,
    title: 'Push Notifications',
    persistent: true,
  };

  var dialog = Ti.UI.createOptionDialog(opts);
  dialog.addEventListener('click', function(e){
    switch(e.index) {
      case 0 :
            testPush(4000);
            break;

      case 1 :
        testPush(1000);
        break;

      case 2 :
        $.lib.nav.openDetailWindow('LogOutput');
        Alloy.CFG.logging && $.lib.logInfo('clearlog', LOGTAG);
        Alloy.CFG.logging && $.lib.logInfo('push_token = ' + Ti.App.Properties.getString('acspushtoken', ''), LOGTAG);
        Alloy.CFG.logging && $.lib.logInfo('tokensubscribed = ' + Ti.App.Properties.getBool('tokensubscribed', false), LOGTAG);
        Alloy.CFG.logging && $.lib.logInfo('device_guid = ' + Ti.Platform.id, LOGTAG);
        break;

      case 3 :
        if (Alloy.Globals.acspush) {
          $.lib.nav.openDetailWindow('LogOutput');
          Alloy.CFG.logging && $.lib.logInfo('clearlog', LOGTAG);
          Alloy.Globals.acspush.clearPush();
          setTimeout(function() {
            Alloy.Globals.acspush.init();
          },
          1250
          );
        }
        break;
      
      default:
        break;
    }
  });
  dialog.show();
};

function doClearDataClick(e) {
  Alloy.CFG.logging && $.lib.logInfo('doClearDataClick', LOGTAG);
  var opts = {
    cancel: 2,
    options: [
      'Empty Cache',
      'Wipe All and Sign In Again',
      'Cancel']
    ,
    selectedIndex: 2,
    destructive: 1,
    title: 'Clear Data',
    persistent: true,
  };

  var dialog = Ti.UI.createOptionDialog(opts);
  dialog.addEventListener('click', function(e){
    switch(e.index) {
      case 0 :
        $.lib.config.clearConfiguration(false);
        $.close(); 
        break;

      case 1 :
        $.lib.config.clearConfiguration(true);
        $.lib.nav.openModalWindow('SignIn');  
        $.closeWindowByName('DebugMenu');
        Alloy.Globals.drawer.close();
        Alloy.Globals.drawer = null;
        break;

      default:
        break;
    }
  });
  dialog.show();
};
