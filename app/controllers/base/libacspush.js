/*jslint maxerr:1000
*
* Subscribes each device to 2x acs channels, one matching this device id, the other "device" for everyone
* */
'use strict';
/*
* Appcelerator cloud push notifications
*
* @class libacspush
*/

/**
 *
 * e.sourcetype = local is from a local/test notification on ios, remote is from push, remoteaction when a user selected an action
 *

{
  "title": "Call from anonymous”,                  // Displayed on Android
  "alert": "Dialled number 443308000100”,          // Displayed on Android as subtitle, on iOS as main text
  "vibrate": true,                                 // Android
  "sound": "default”,                              // Can be “notification.caf” or any custom sound we create
  “category”: “CALLBACK_IGNORE”                    // iOS buttons for a call, or TEXTREPLY_CALLBACK_IGNORE for a text / email notification
  “badge": “2”,                                    // iOS “unread message count” app badge. Could display on history tab in Android
  “feet”: {
    “guid": "e2883c39-2266-4de0-9cdc-7ac1a61273eb”,  // Prevent storing the same notification (multi-channel/install or cache)
    “date_sent”: ""2016-04-04T21:52:05.223Z”,           // UTC - ignore out of date notifications
    "dnis": "443308000100",
    "clid": "anonymous",
    "account_id": "10000",
    "user_id": "75002",
    "team_id": "5000",
    "team_name": "Leo and Justin”,
  }
}

{
  "title":"Call from anonymous",
  "alert":"Dialled number 443308000100",
  "vibrate":true,
  "sound":"default",
  "category":"CALLBACK_IGNORE",
  "badge":"0",
  "feet":{
    "guid":"e2883c39-2266-4de0-9cdc-7ac1a61273eb",
    "date_sent":"2016-04-04T21:52:05.223Z",
    "dnis":"443308000100",
    "clid":"anonymous",
    "account_id":"10000",
    "user_id":"75002",
    "team_id":"5000",
    "team_name":"Leo and Justin"
  }
}

 {
   "title":"Happy Birthday LDog",
   "alert":"Happy Birthday!",
   "vibrate":true,
   "sound":"default",
   "category":"TEXTREPLY_CALLBACK_IGNORE",
   "badge":"0",
   "feet":{
     "guid":"e2883c39-2266-4de0-9cdc-7ac1a61273aa",
     "date_sent":"2016-04-04T21:52:05.223Z",
     "dnis":"443308000100",
     "clid":"anonymous",
     "account_id":"10000",
     "user_id":"75002",
     "team_id":"5000",
     "team_name":"Leo and Justin"
   }
 }


 //
on iOS I see:
e.type = remote
e.data.title = title
e.data.alert = alert              // also dupl. in e.data.aps.alert
e.data.category = category        // also dupl. in e.data.aps.alert
e.data.feet = {}


on Android I see:
e.type = callback
e.payload.category
e.payload.android.title
e.payload.android.alert
e.payload.android.badge
e.payload.feet.guid etc

*/

$.lib = Alloy.Globals.libdata;
$.deviceToken = '';

var GOOGLE_PROJECT_ID = '200106242054';
var LOGTAG = 'libacspush';
var Cloud = require('ti.cloud');

function isNull(obj) {
  return (undefined === obj) || (obj === null) ? true : false;
};

_.extend(exports, {
  userlogin: Ti.App.Properties.getString('signin-email', ''),
  enabled: true,
  enableUserSubscription: false, // ACS user / login accounts, if false ONLY a devicetoken (but with a unique channel) is set
  registered: false, // Set to true when we are ready to start processing pushes, or if we are already registered
  onReceive: undefined
});

// Turns the string 8.4.1 into 8 to use in the code
var OS_VERSION = parseInt(Ti.Platform.version.split('.')[0], 10);

// Only enable code if the acs-api-key is set in tiapp.xml
var PUSH_ENABLED = (!!Ti.App.Properties.getString('acs-api-key')) && Alloy.Globals.lib.appsettings.enablePush;

/**
 * Self-executing function containing all code that is executed when this module
 * is first required, apart from dependencies and variables declared above. Just
 * for readability, much like a class constructor.
 */
(function constructor() {
  init();
})();

function init() {
  Alloy.CFG.profiling && $.lib.logInfo('Initialising Push', [LOGTAG, 'timestart']);

  if (! PUSH_ENABLED) {
    Alloy.CFG.logging && Alloy.Globals.lib.logError('Push is disabled in settings', LOGTAG);
    return;
  }
  Alloy.CFG.logging && Alloy.Globals.lib.logInfo('Initialising libacspush', LOGTAG);

  // Register for push notifications first because on iOS 8+ it will wait for
  // the usernotificationsettings-event to actual do the registration.
  $.deviceToken = Ti.App.Properties.getString('acspushtoken', '');

  if (OS_ANDROID) {
    registerForAndroidPushNotifications();
  }

  if (OS_IOS) {
    registerForIOSPushNotifications();
  }
};
exports.init = init;

function clearPush() {
  try {
    logoutUser(); // Logout while we still have a $.deviceToken
  } finally {
    Ti.App.Properties.removeProperty('tokensubscribed');
    Ti.App.Properties.removeProperty('acspushtoken');
    Ti.App.Properties.removeProperty('acsusername');
    $.registered = false;
    $.deviceToken = '';
  }
};
exports.clearPush = clearPush;

/**
 * Push is enabled and good to go
 */
function doAfterSubscribed() {
  Alloy.CFG.profiling && $.lib.logInfo('Initialising Push', [LOGTAG, 'timeend']);
  $.registered = true;

  // Fired when a notifications is received or responded to for iOS
  Alloy.Events.on('action', onAction);
};

/**
 * Event listener set in constructor to be called when a notification is received
 * or responsed to so it can be handled.
 *
 * @param      {Object}  e       Event
 */
function onAction(e) {
  Alloy.CFG.logging && $.lib.logInfo("Push notify action event received for iOS");
  return;
  // Get the related message model
  // var model = Alloy.Collections.message.get(e.id);

  // Delete action was selected
  if (e.action === 'DELETE') {
    // model.destroy();
    // log('Chat: Deleted message ' + e.id + '.');
  } else {
    // Mark the message as read
    // model.save({
      // read: Date.now()
    // });
//
    // // Update badges
    // updateBadges();
//
    // log('Chat: Marked message ' + e.id + ' as read.');

    switch (e.action) {
      // Not OK (thumbs down) action
      case 'NOK':
        // Create Not OK message
        // Alloy.Collections.message.create({
          // id: Ti.Platform.createUUID(),
          // message: '👎',
          // mine: 1,
          // sent: Date.now()
        // });
        // log('Chat: Replied 👎 to message ' + e.id + '.');       break;

        // REPLY action
      case 'REPLY':
        // Only in Titanium 5.1 or later and when the user typed something do we have input
        if (Ti.App.iOS.USER_NOTIFICATION_BEHAVIOR_TEXTINPUT && e.typedText) {
          // Alloy.Collections.message.create({
            // id: Ti.Platform.createUUID(),
            // message: e.typedText,
            // mine: 1,
            // sent: Date.now()
          // });
          // log('Chat: Replied \'' + e.typedText + '\' to message ' + e.id + '.');
          break;
        }

        // No action was selected or REPLY was empty
      default:
//        log('Chat: Opened chat with message ' + e.id + ' to reply.');
        break;
    }
  }
};

/**
 * USER sessions are required to send push to individuals
 * https://docs.appcelerator.com/platform/latest/#!/guide/Subscribing_to_push_notifications-section-37551717_Subscribingtopushnotifications-SubscribingtoPushNotificationswithUserSessions
 * https://docs.appcelerator.com/platform/latest/#!/api/Modules.Cloud.Users
 */
function createUser() {
  Cloud.Users.create({
    username: Ti.App.Properties.getString('acsusername', Ti.Platform.id),
    first_name:  Ti.App.Properties.getString('signin-email', ''),
    last_name: '',
    password: 'test_cheesedogs',
    password_confirmation: 'test_cheesedogs'
  }, function (e) {
      if (e.success) {
        Ti.App.Properties.setString('acsusername', Ti.Platform.id);
          var user = e.users[0];
          $.lib.logInfo('Cloud User Create Success:\n' +
              'id: ' + user.id + '\n' +
              'sessionId: ' + Cloud.sessionId + '\n' +
              'first name: ' + user.first_name + '\n' +
              'last name: ' + user.last_name);
          $.subscribeUser();
      } else {
          alert('Cloud user create Error:\n' +
              ((e.error && e.message) || JSON.stringify(e)));
      }
  });
};
exports.createUser = createUser;

/**
 * @brief Unsubscribe both the user/session and devicetokens and logout
 */
function logoutUser() {
  try {
    if ($.deviceToken !== '') {
      Cloud.PushNotifications.unsubscribe({
        channel: userChannels(),
        device_token: $.deviceToken
      }, function (e) {
        if (e.success) {
          Alloy.CFG.logging && $.lib.logInfo('Cloud.PushNotifications.unsubscribe userchannels ok', LOGTAG);
        } else {
          Alloy.CFG.logging && $.lib.logError('Cloud.PushNotifications.unsubscribe userchannels error:' + $.lib.stringify(e), LOGTAG);
        }
      });

      Cloud.PushNotifications.unsubscribeToken({
        channel: deviceChannels(),
        device_token: $.deviceToken
      }, function (e) {
        if (e.success) {
          Alloy.CFG.logging && $.lib.logInfo('Cloud.PushNotifications.unsubscribe devicechannels ok', LOGTAG);
        } else {
          Alloy.CFG.logging && $.lib.logError('Cloud.PushNotifications.unsubscribe devicechannels error:'+ $.lib.stringify(e), LOGTAG);
        }
      });
    }

    Cloud.Users.logout(function (e) {
      if (e.success) {
        Alloy.CFG.logging && $.lib.logInfo('Cloud.Users.logout ok', LOGTAG);
      } else {
        Alloy.CFG.logging && $.lib.logError('Cloud.Users.logout Error:' + $.lib.stringify(e), LOGTAG);
      }
    });
  } catch(E) {
    $.lib.logError('Exception in logoutUser');
  }
};
exports.logoutUser = logoutUser;

function loginUser() {
  if (true === $.enableUserSubscription) {
    Alloy.CFG.logging && $.lib.logInfo("Push loginUser creating ACS user account");
    Cloud.Users.login({
      login: Ti.App.Properties.getString('acsusername', Ti.Platform.id),
      password: 'test_cheesedogs'
    }, function (e) {
      if (e.success) {
        var user = e.users[0];
        $.lib.logInfo('Cloud Login Success:\n' +
            'id: ' + user.id + '\n' +
            'sessionId: ' + Cloud.sessionId + '\n' +
            'first name: ' + user.first_name + '\n' +
            'last name: ' + user.last_name);
        $.subscribeUser();
      } else {
        $.lib.logError('Cloud login Error:\n' + ((e.error && e.message) || JSON.stringify(e)));
        createUser();
      }
    });
  } else {
    Alloy.CFG.logging && $.lib.logInfo("Push loginUser ***NOT*** creating ACS user account as the devicetoken is subscribed to a unique channel");
    doAfterSubscribed(true);
  }
};
exports.loginUser = loginUser;


function subscribeUser() {
  $.deviceToken = Ti.App.Properties.getString('acspushtoken', '');

  Alloy.CFG.logging && $.lib.logInfo('subscribeUser to channels=' + userChannels() + ' with token ' + $.deviceToken, LOGTAG);

  if ((channel !== '') && ($.deviceToken !== '')) {
    Cloud.PushNotifications.subscribe({
        channel: userChannels(),
        device_token: $.deviceToken,
        type: Ti.Platform.name == 'android' ? 'android' : 'ios'
    }, function (e) {
      Alloy.CFG.profiling && $.lib.logInfo('Initialising Push', [LOGTAG, 'timeend']);
      if (e.success) {
        Alloy.CFG.logging && $.lib.logInfo('Cloud.PushNotifications.subscribe ok', LOGTAG);
        doAfterSubscribed(true);
      } else {
        Alloy.CFG.logging && $.lib.logError('Cloud.PushNotifications.unsubscribe error:' + ((e.error && e.message) || JSON.stringify(e)), LOGTAG);
      }
    });
  }
};
exports.subscribeUser = subscribeUser;

/**
 * We can only do this once we have a devicetoken.
 * We just try to login... if we can't, create the account.
 */
function loginOrCreateUser() {
  if (false === Ti.App.Properties.getBool('tokensubscribed', false)) {
    subscribeToken();
  }

  loginUser();
};

/**
 * Refer to the push received in the header
 */
function doPushReceived(e) {
  // if (false === $.registered) {
  //   Alloy.CFG.logging && Alloy.Globals.lib.logError('doPushReceived while registered=false, skipping', LOGTAG);
  //   return;
  // }

  try {
    var msg = /*e && e.payload ? ('payload=' + $.lib.stringify(e.payload, 2000, true)) :*/ $.lib.stringify(e, 4000, false);
    Alloy.CFG.logging && Alloy.Globals.lib.logInfo('doPushReceived raw e = ' + msg, LOGTAG);

    var e = $.lib.safeParse(e);
    var payload = (OS_ANDROID && e.payload) ? $.lib.safeParse(e.payload) : ((OS_IOS && e.data) ? $.lib.safeParse(e.data) : e);
    var feet = payload.feet ? payload.feet : {};
    if (OS_ANDROID && ! _.isEmpty(feet)) { // e.type = 'callback'
      if (payload.android) {
        _.defaults(feet, _.pick(payload.android, ['title', 'alert', 'badge']));
      }
      if (payload.category) {
        feet.category = payload.category;
      }
    }

    if (OS_IOS && ! _.isEmpty(feet)) { // e.type = 'remote'
      _.defaults(feet, _.pick(payload, ['title', 'alert', 'category', 'badge']));
      if (_.isUndefined(feet.title) && ! _.isUndefined(feet.alert)) {
          feet.title = feet.alert;
      }

      //if (e['sourcetype'] === 'remoteaction')
      // TODO: something with the text, API endpoint or sms?
      if ((payload.category === 'TEXTREPLY_CALLBACK_IGNORE') && (e.data.identifier === 'TEXTREPLY')) {
        $.lib.logInfo('doPushReceived, user typed ' + e.data.typedText, LOGTAG);
        // Alloy.Events.trigger('action', {
          // id: e.userInfo.id,
          // action: e.identifier,
          // // New in Ti 5.1 when the action's behavior is Ti.App.iOS.USER_NOTIFICATION_BEHAVIOR_TEXTINPUT
          // typedText: e.typedText
        // });
      }
    }

    if (_.isEmpty(feet) || (feet.title === '')) {
      $.lib.logError('doPushReceived not saving - no feet ' + $.lib.stringify(feet, 2000, true), LOGTAG);
      return;
    }
    msg = $.lib.stringify(feet, 2000, true);
    Alloy.CFG.logging && Alloy.Globals.lib.logInfo('doPushReceived feet = '+ msg);
    alert(msg);

    var historymodel = Alloy.Collections.instance('Historymodel');
    historymodel.loadFromFile();
    historymodel.upsertFromNotification(feet);
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.doPushReceived');
  }
};
exports.doPushReceived = doPushReceived;

/**
 * Return the comma separated list of channels to subscribe a devicetoken
 */
function deviceChannels() {
  return 'feetusers,'+Ti.Platform.id+','+Ti.App.Properties.getString('signin-email', 'unknownuser');
};

/**
 * Return the comma separated list of channels to subscribe a user/session token
 * Refer: https://docs.appcelerator.com/platform/latest/#!/guide/Sending_and_Scheduling_Push_Notifications
 */
function userChannels() {
  return 'users,'+Ti.Platform.id+','+Ti.App.Properties.getString('signin-email', 'unknownuser');
};

/**
 * Subscribe a device token, which allows device notifications when the app is closed
 */
function subscribeToken() {
  Alloy.CFG.logging && $.lib.logInfo('Subscribing TOKEN for app-not-running notifications =' + $.deviceToken, LOGTAG);
  Cloud.PushNotifications.subscribeToken({
    device_token: $.deviceToken,
    channel: deviceChannels(),
    type: Ti.Platform.name == 'android' ? 'android' : 'ios'
  }, function(e) {
    if (e.success) {
      Ti.App.Properties.setBool('tokensubscribed', true);
      Alloy.CFG.logging && $.lib.logInfo('Cloud.PushNotifications.subscribeToken ok', LOGTAG);
    } else {
      Alloy.CFG.logging && $.lib.logError('Cloud.PushNotifications.subscribeToken error:' + $.lib.stringify(e), LOGTAG);
    }
  });
};

// Enable push notifications for this device
// Save the device token for subsequent API calls
function deviceTokenSuccess(e) {
  try {
    Alloy.CFG.logging && $.lib.logInfo('deviceTokenSuccess e='+JSON.stringify(e), LOGTAG);
    if (e && e.deviceToken) {
      $.deviceToken = e.deviceToken;
      Ti.App.Properties.setString('acspushtoken', e.deviceToken);

      loginOrCreateUser();
    }
  } catch(E) {
    $.lib.logError('ERROR in deviceTokenSuccess');
  }
};
exports.deviceTokenSuccess = deviceTokenSuccess;

function deviceTokenError(e) {
  try {
    Alloy.CFG.logging && $.lib.logInfo('deviceTokenError e='+JSON.stringify(e), LOGTAG);
    $.lib.logError(e.error);
    alert('Failed to register for push notifications! ' + e.error);
  } catch(E) {
    $.lib.logError('ERROR in deviceTokenError');
  }
};
exports.deviceTokenError = deviceTokenError;

function registerForAndroidPushNotifications() {
  // Require the module
  var CloudPush = require('ti.cloudpush');

  // Initialize the module
  if ($.deviceToken === '') {
    CloudPush.retrieveDeviceToken({
        success: deviceTokenSuccess,
        error: deviceTokenError
    });
  } else {
    loginOrCreateUser();
  }

  // Process incoming push notifications
  CloudPush.addEventListener('callback', function (e) {
    doPushReceived(e);
  });
};

/**
 * Register both local and push notification settings
 */
function registerUserNotificationSettings() {

  // Only for iOS 8 and up
  if (OS_VERSION < 8) {
    return Alloy.Globals.lib.logInfo('Skipped: registerUserNotificationSettings (requires iOS8 or later).');
  }

  // // Launches the app in the foreground
  // // Will not be used for Apple Watch notifications
  // var fore = Ti.App.iOS.createUserNotificationAction({
    // identifier: 'FORE',
    // title: 'FORE',
    // activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_FOREGROUND,
    // destructive: false,
    // // Authentication will still be required when used for lock screen notifications
    // authenticationRequired: false
  // });
  // // Launches the app in the background
  // var back = Ti.App.iOS.createUserNotificationAction({
    // identifier: 'BACK',
    // title: 'BACK',
    // activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
    // destructive: false,
    // authenticationRequired: false
  // });

  // Launches the app in the background and is styled as destructive
  var ignoreCall = Ti.App.iOS.createUserNotificationAction({
    identifier: 'IGNORE',
    title: 'IGNORE',
    activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
    // Will display in red on lock screen and Apple Watch notifications
    destructive: true,
    authenticationRequired: false
  });

  // Callback: launches the app in the foreground and requires the device to be unlocked
  var callBack = Ti.App.iOS.createUserNotificationAction({
    identifier: 'CALLBACK',
    title: 'CALL BACK',
    activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
    destructive: false,
    // Authentication will not be required when used for Apple Watch notifications
    authenticationRequired: true
  });

  var replyOK = Ti.App.iOS.createUserNotificationAction({
    identifier: 'OK',
    // Yes, you can use emojies (CTRL+CMD+SPACE on Mac OS X)
    title: '👍',
    activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,
    destructive: false,
    authenticationRequired: false
  });

  var replyText;
  if (Ti.App.iOS.USER_NOTIFICATION_BEHAVIOR_TEXTINPUT) {
    replyText = Ti.App.iOS.createUserNotificationAction({
      identifier: 'REPLY',
      title: 'REPLY',
      activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_BACKGROUND,

      // New in Titanium 5.1 is the option to ask the user for input
      behavior: Ti.App.iOS.USER_NOTIFICATION_BEHAVIOR_TEXTINPUT,

      destructive: false,
      authenticationRequired: false
    });

  } else {
    replyText = Ti.App.iOS.createUserNotificationAction({
      identifier: 'REPLY',
      title: 'REPLY',
      activationMode: Ti.App.iOS.USER_NOTIFICATION_ACTIVATION_MODE_FOREGROUND,
      destructive: false,
      authenticationRequired: false
    });
  }

  var callCategory = Ti.App.iOS.createUserNotificationCategory({
    identifier: 'CALLBACK_IGNORE',
    actionsForDefaultContext: [callBack, ignoreCall], // replyText
    actionsForMinimalContext: [ignoreCall, callBack]
  });

  var textCategory = Ti.App.iOS.createUserNotificationCategory({
    identifier: 'TEXTREPLY_CALLBACK_IGNORE',
    // The first four of these actions will be used for alert and Apple Watch notifications.
    // Apple Watch will only use actions with background activationMode.
    // Actions are displayed top down and destructive actions should come last (displayed last).
    actionsForDefaultContext: [replyText, replyOK, callBack, ignoreCall],

    // The first two of these actions will be used for banner and lock screen notifications.
    // Actions are displayed RTL and destructive actions should come first (displayed last).
    actionsForMinimalContext: [ignoreCall, replyText]
  });

  /// Register the notification types and categories
  Ti.App.iOS.registerUserNotificationSettings({
    types: [Ti.App.iOS.USER_NOTIFICATION_TYPE_ALERT, Ti.App.iOS.USER_NOTIFICATION_TYPE_BADGE, Ti.App.iOS.USER_NOTIFICATION_TYPE_BANNER, Ti.App.iOS.USER_NOTIFICATION_TYPE_SOUND],
    categories: [callCategory, textCategory]
  });

  Alloy.Globals.lib.logInfo('Setup: registerUserNotificationSettings: Ti.App.iOS.registerUserNotificationSettings');
}

/**
 * Register for local notifications
 *
 * See http://docs.appcelerator.com/platform/latest/#!/guide/iOS_Local_Notifications-section-40929226_iOSLocalNotifications-RegisterforLocalNotifications
 */
function registerForLocalNotifications() {

  /**
   * Fired when the app is opened via a local notification and the user did not
   * select an action. Also fired when the app was in the foreground when the
   * local notification was received. There's no flag to tell the difference.
   * @param  {Object} e See http://docs.appcelerator.com/platform/latest/#!/api/Titanium.App.iOS-event-notification
   */
  Ti.App.iOS.addEventListener('notification', function onNotification(e) {
    Alloy.Globals.lib.logInfo('Ti.App.iOS:notification', e);
    _.defaults(e, {sourcetype: 'local'});
    if (e.userInfo) {
      doPushReceived(e.userInfo);
    } else {
      doPushReceived(e);
    }
  });

  Alloy.Globals.lib.logInfo('Setup: registerForLocalNotifications: Ti.App.iOS:localnotificationaction');

  // Local notification actions are for iOS 8 and later only
  if (OS_VERSION < 8) {
    return Alloy.Globals.lib.logInfo('Skipped: Ti.App.iOS:localnotificationaction (requires iOS8 or later).');
  }

  /**
   * Fired when a user selects an action for an interactive local notification.
   * @param  {Object} e See http://docs.appcelerator.com/platform/latest/#!/api/Titanium.App.iOS-event-localnotificationaction
   */
  Ti.App.iOS.addEventListener('localnotificationaction', function onLocalnotificationaction(e) {
    Alloy.Globals.lib.logInfo('Received: Ti.App.iOS:localnotificationaction', e);
    _.defaults(e, {sourcetype: 'local'});
    if (e.userInfo) {
      doPushReceived(e.userInfo);
    } else {
      doPushReceived(e);
    }
  });
}

function registerIOSHandlerForRemoteNotificationInteraction() {
  /**
     * Fired when a user selects an action for an interactive remote notification.
     * @param  {Object} e See http://docs.appcelerator.com/platform/latest/#!/api/Titanium.App.iOS-event-remotenotificationaction
     */
  Alloy.Globals.lib.logInfo('Setup: registerForPushNotifications: setting up Ti.App.iOS:remotenotificationaction handler');
  Ti.App.iOS.addEventListener('remotenotificationaction', function onRemotenotificationaction(e) {
      Alloy.Globals.lib.logInfo('Ti.App.iOS:remotenotificationaction', e);
      _.defaults(e, {sourcetype: "remoteaction"});
      doPushReceived(e);
      });
}

/**
 * Register for push notifications
 *
 * See http://docs.appcelerator.com/platform/latest/#!/guide/Subscribing_to_push_notifications
 */
function registerForIOSPushNotifications() {

  // Only if push is enabled (see top of file)
  if (!PUSH_ENABLED) {
    return Alloy.Globals.lib.logInfo('Skipped: Ti.Network.registerForIOSPushNotifications (no ACS key was found).');
  }

  if (OS_VERSION < 8) {
    return Alloy.Globals.lib.logInfo('Skipped: Ti.Network.registerForIOSPushNotifications iOS version not supported.');
  }

  if (OS_VERSION >= 8) {

    // Set a handler which will execute after user settings are registered
    // --> This do the actual registration with APN for push notifications
    Ti.App.iOS.addEventListener('usernotificationsettings', function registerForPush(e) {

      // Remove event listener once registered for push notifications
      Ti.App.iOS.removeEventListener('usernotificationsettings', registerForPush);

      Alloy.Globals.lib.logInfo('Ti.App.iOS:usernotificationsettings success for iOS8 '+ JSON.stringify(e));

      Alloy.CFG.logging && Alloy.Globals.lib.logInfo('Setup: registerForIOSPushNotifications - calling Ti.Network.registerForPushNotifications and waiting for token');
      Ti.Network.registerForPushNotifications({
        success: function(e) {
          Alloy.Globals.lib.logInfo('Received: Ti.Network.registerForPushNotifications:success');
          Alloy.Globals.lib.logInfo('Received: Ti.Network.registerForPushNotifications:success'+ JSON.stringify(e));
          Alloy.Globals.lib.logInfo('Now registering to Ti.Cloud...');
          deviceTokenSuccess(e);
        },
        error: function(e) {
          Alloy.Globals.lib.logInfo('Received: Ti.Network.registerForPushNotifications:error');
          Alloy.Globals.lib.logInfo('Received: Ti.Network.registerForPushNotifications:error', e);
          deviceTokenError(e);
        },
        callback: function(e) {
          Alloy.Globals.lib.logInfo('Received: Ti.Network.registerForPushNotifications:callback iOS 8');
          _.defaults(e, {sourcetype: 'push'});
          doPushReceived(e);
        }
      });
    });

    // Call usernotificationsettings; once these are registered, it will trigger the usernotificationsettings handler and call Ti.Network.registerForPushNotifications
    registerUserNotificationSettings();

    // TODO: reimplement once notifications always come through
    try {
      registerForLocalNotifications();
      registerIOSHandlerForRemoteNotificationInteraction();
    } catch(E) {
      $.lib.logError('ERROR registering local notifications handler');
    }


  } else {
    Alloy.Globals.lib.logInfo('Skipped: Ti.App.iOS:remotenotificationaction (requires iOS8 or later).');
    // Before iOS8 the types we needed to be set here
    // Ti.Network.registerForPushNotifications({
      // types: [
        // Ti.Network.NOTIFICATION_TYPE_BADGE,
        // Ti.Network.NOTIFICATION_TYPE_ALERT,
        // Ti.Network.NOTIFICATION_TYPE_SOUND
      // ],
      // success: deviceTokenSuccess,
      // error: deviceTokenError,
      // callback: doPushReceived,
    // });
  }
}

/**
 * Event listener set in views/console.xml to schedule a local notification.
 *
 * @method     scheduleTest
 * @param      {Object}  e       Event
 */
function scheduleTestNotification(e) {
  var delay = e.delay || 4000;
  var testmsg = 'Notification scheduled. You have ' + (delay / 1000) + ' seconds \n to background the app or lock your phone.';
  $.lib.logInfo(testmsg, LOGTAG);
  $.lib.nav.showNotification({
    notificationtype: 'activity',
    title: testmsg,
    timeout: delay,
    font: {"fontFamily": "Roboto-Regular", "fontSize": "11"}
  });

  if (OS_ANDROID) {
    setTimeout(function(){
      doPushReceived(e);
      return;
    },
    delay
    );
    return;
  }

  // alertAction Should be a verb plus optional subject since it will used instead
  // of the default *Open* for alert-style notifications and in *Slide
  // to [alertAction]* on the lock screen alertAction: '<verb> <subject>';
  _.defaults(e, {
      alertAction: 'REPLY',
      alertBody: e.payload.alert,
      category: 'CALLBACK_IGNORE',
      sound: 'notification.caf',
      userInfo: {
        id: Ti.Platform.createUUID(),
        data: e.payload,
      }
    });

  _.extend(e, e.payload);
  _.omit(e, ['payload']);

  // Add the delay (ms) to the current date in ms since the Unix epoch
  e.date = new Date(Date.now() + delay);
  e.sound = 'notification.caf';
  e.category = 'TEXTREPLY_CALLBACK_IGNORE';

  Ti.App.iOS.scheduleLocalNotification(e);
};
exports.scheduleTestNotification = scheduleTestNotification;

/**
 * Function called in different places in this controller to update the app
 * and tab badge with the number of badges we haven't read.
 */
function updateBadges() {

  // Get the number of unread messages
  // var unreads = getUnread(false).length;
//
  // // Set the tab and app badge
  // $.tab.badge = unreads || null;
  // Ti.UI.iPhone.appBadge = unreads;
}

_.extend($, exports);

if (Ti.Shadow) { addSpy('libacspush', $); }
