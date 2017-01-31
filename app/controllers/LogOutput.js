exports.baseController = 'base/baseviewcontroller';
var LOGTAG = 'logoutput';

exports.doLoadView = function(args) {
  $.lib.logInfo(LOGTAG + ' constructor');

	// Show logs from before this controller was created
	showLogs();

	// Fired in alloy.js when new logs are added
	Alloy.Events.on('log', showLogs);
};

exports.doCloseView = function() {
  $.lib.logInfo(LOGTAG + ' destroy');
  Alloy.Events.off('log', showLogs);
  $.destroy();
};

/**
 * Shows the logs collected in a global var by alloy.js
 */
function showLogs() {
	$.log.value = Alloy.Globals.log;
	// Scroll cursor to end
	if ($.log.hasText()) {
	  var len = $.log.value.length;
	  $.log.setSelection(len, len);
	}
}

/**
 * Event listener set in views/console.xml to schedule a local notification.
 *
 * @method     scheduleTest
 * @param      {Object}  e       Event
 */
function scheduleTest(e) {
  if (OS_ANDROID) return;
	Ti.App.iOS.scheduleLocalNotification({

		// Should be a verb plus optional subject since it will used instead
		// of the default *Open* for alert-style notifications and in *Slide
		// to [alertAction]* on the lock screen.
		alertAction: '<verb> <subject>',

		alertBody: '<message>',

		// Category to show interactive actions for (see lib/notifications.js)
		category: 'TEST_CATEGORY',

		// Add the delay (ms) set in config.json to the current date in ms since the Unix epoch
		date: new Date(Date.now() + Alloy.CFG.delay),

		// Sound to play (expected to be in app/assets)
		sound: 'notification.caf',

		// Custom payload
		userInfo: {
			'<key>': '<value>'
		}
	});

	log('Test: Scheduled local notification. You have ' + (Alloy.CFG.delay / 1000) + ' seconds to move the app to the background or lock your phone.');
}
