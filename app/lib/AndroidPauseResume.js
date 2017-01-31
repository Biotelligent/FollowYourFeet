/*jslint maxerr:1000 */
'use strict';

/*
* Hook to Android activities so they trigger Titanium.App onpause/resume events
*
* <Alloy>
      <Window onOpen="onOpen" onClose="onClose" />
  </Alloy>
  
  var Context = require('AndroidPauseResume');
  
  function onOpen(evt) {
      Context.on('activityName1', this.activity);
  }
  
  function onClose(evt) {
      Context.off('activityName1');
  }
*/
exports.lib = Alloy.Globals.libdata;

module.exports = {
  on: function(name, activity) {
    activity.onStart = function() {
      if (activeActivity == name) {
        Ti.App.fireEvent('resumed');
      }

      activeActivity = name;
    };

    activity.onStop = function() {
      if (activeActivity == name) {
        Ti.App.fireEvent('paused');
      }
    };
  },

  off: function(activity) {
    activity.onStart = null;
    activity.onStop = null;
  }
};

/**
 * @property {String} Current active Activity's name
 * @private
 */
var activeActivity;