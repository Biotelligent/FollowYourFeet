/*jshint maxerr:1000 */
'use strict';
/*
* Permissions for iOS and Android
*
* @class libpermission
*/
var LOGTAG = 'libpermission';
$.lib = $.args.lib || Alloy.Globals.lib;
Ti.API.info('Initialising '+LOGTAG);

_.extend(exports, {
  version: 0.1,
  authorised: false,
});
exports.checkVersion = function(externalref) {
  $.version = 1.0;
  return LOGTAG + ' ' + (( $.version === externalref.version) ? 'ok ' : 'ERROR: version mismatch ') + ' int: ' + $.version + ' ext: ' + externalref.version;
};

/*
function addressBookDisallowed(){
  $.authorised = false;
  $.lib.nav.showError(L('dialog-nocontacts', 'You have not authorized access to the address book - no contacts will be shown.'));
};

/**
 * The user must allow address book access on iOS and Android 6.
 * They can disallow it through the settings panel, so always needs recheck.
function authorizeContacts(onSuccess) {
  checkContactPermissions(onSuccess, addressBookDisallowed);
};
*/

/**
 * Fired when user taps on edit-button to open the app settings because on iOS the settings will not be re-shown within the app
 */
function openPermissionSettings(e) {
  if (OS_IOS) {
    Ti.Platform.openURL('app-settings:');
  }

  if (OS_ANDROID) {
    var intent = Ti.Android.createIntent({
      action: 'android.settings.APPLICATION_SETTINGS',
    });
    intent.addFlags(Ti.Android.FLAG_ACTIVITY_NEW_TASK);
    Ti.Android.currentActivity.startActivity(intent);
  }
};
exports.openPermissionSettings = openPermissionSettings;

/**
 * Verify that we are authorized for contacts.
 */
function checkContactPermissions(onSuccess, onFailure) {
  var hasContactsPermissions = Ti.Contacts.hasContactsPermissions();
  if (hasContactsPermissions) {
    // We have to actually use a Ti.Contacts method for the permissions to be generated
    // FIXME: https://jira.appcelerator.org/browse/TIMOB-19933
    if (OS_IOS) {
      Ti.Contacts.getAllGroups();
    }
    $.authorized = true;
    if (_.isFunction(onSuccess)) {
      onSuccess();
    }
    return true;
  }

  // On iOS we can get information on the reason why we might not have permission
  if (OS_IOS) {
    // Map constants to names
    var map = {};
    map[Ti.Contacts.AUTHORIZATION_AUTHORIZED] = 'AUTHORIZATION_AUTHORIZED';
    map[Ti.Contacts.AUTHORIZATION_DENIED] = 'AUTHORIZATION_DENIED';
    map[Ti.Contacts.AUTHORIZATION_RESTRICTED] = 'AUTHORIZATION_RESTRICTED';
    map[Ti.Contacts.AUTHORIZATION_UNKNOWN] = 'AUTHORIZATION_UNKNOWN';

    // Available since Ti 2.1.3 and always returns AUTHORIZATION_AUTHORIZED on iOS<6 and Android
    var contactsAuthorization = Ti.Contacts.contactsAuthorization;
    $.lib.logInfo('Ti.Contacts.contactsAuthorization', 'Ti.Contacts.' + map[contactsAuthorization], LOGTAG);

    if (contactsAuthorization === Ti.Contacts.AUTHORIZATION_RESTRICTED) {
      //return alert('Because permission are restricted by some policy which you as user cannot change, we don\'t request as that might also cause issues.');
      if (_.isFunction(onFailure)) {
        onFailure();
      }
      return false;

    } else if (contactsAuthorization === Ti.Contacts.AUTHORIZATION_DENIED) {
      if (_.isFunction(onFailure)) {
        onFailure();
      }
      $.lib.nav.showConfirm({
        title: L('contactauth-denied', 'Permission required'),
        message:  L('contactauth-required', Ti.App.name + ' requires access to your contacts. Choose OK to open the Settings App to grant the contacts permission.'),
        onConfirm: openPermissionSettings,
      });
      return false;
    }
  }

  // The new cross-platform way to request permissions
  Ti.Contacts.requestContactsPermissions(function(e) {
    $.lib.logInfo('Ti.Contacts.requestContactsPermissions ' + JSON.stringify(e), LOGTAG);
    if (e.success) {
      $.authorized = true;
      if (_.isFunction(onSuccess)) {
        onSuccess();
      }
      return true;
    } else if (OS_ANDROID) {
      $.lib.logInfo('You don\'t have the required uses-permissions in tiapp.xml or you denied permission for now, forever or the dialog did not show at all because you denied forever before.', LOGTAG);
      if (_.isFunction(onFailure)) {
        onFailure();
      }
      return false;
    } else {
      if (_.isFunction(onFailure)) {
        onFailure();
      }
      return false;
    }
  });
};
exports.checkContactPermissions = checkContactPermissions;

if (Ti.Shadow) { addSpy(LOGTAG, $); }
