/**
 * Notification bar containing a timed or dismissable message - eg. Low Balance or Verification Code Sent
 */
$.lib = Alloy.Globals.lib;
$.args = arguments[0] || {};
var LOGTAG = 'notification';
var notificationparent = undefined;
$.ignoremessages = $.args.ignoremessages || false;
$.ignoreclose = $.args.ignoreclose || false;
$.buttonView.visible = false;

_.extend(exports, {
  onSecondRightButtonClick: undefined,
  onRightButtonClick: undefined,
});
exports.setNotificationParent = function(_notificationparent) {
  notificationparent = _notificationparent;
};
$.notificationview.visible = false;

$.notificationview.applyProperties($.args);
Ti.App.addEventListener('app:shownotification', _.bind(onShowNotification, this));

exports.destroy = function() {
  Ti.App.removeEventListener('app:shownotification', onShowNotification);
};

function onShowNotification(opts) {
  //Alloy.CFG.logging && $.lib.logInfo('onShowNotification ' + JSON.stringify(opts), LOGTAG);
  if (false === $.ignoremessages) {
    showNotification(opts);
  }
};

function showNotification(opts) {
  opts = opts || {};
  //Alloy.CFG.logging && $.lib.logInfo('showNotification opts='+JSON.stringify(opts));
  if ((false === opts.visible) || (opts.title === '')) {
    if (true !== $.ignoreclose) {
      hideNotification();
    }
    return;
  }

  if ('activity' !== opts.notificationtype) {
    $.activityIndicator.hide();
  }

  if ('icon' in opts) {
    $.icon.setIcon(opts.icon);
  } else if (_.isString(opts.notificationtype)) {
    // Restore default settings
    $.icon.setIconColor("gray");
    $.label.color = Alloy.CFG.Skin.defaultTextColor;
    switch(opts.notificationtype) {
      case 'activity':
        $.icon.setIconColor('transparent');
        if (_.isString(opts.title)) {
          $.activityIndicator.message = '  ' + opts.title;
        } else {
          $.activityIndicator.message = '';
        }
        $.activityIndicator.show();
        break;
      case 'mobile':
        $.icon.setIcon('fa-mobile');
        break;
      case 'notification':
        $.icon.setIcon('fa-bullhorn');
        break;
      case 'reminder':
      case 'bell':
        $.icon.setIcon('fa-bell-o');
        break;
      case 'tick':
      case 'check':
        $.icon.setIcon('fa-check');
        //$.icon.setIconColor('green');
        break;
      case 'network':
      case 'info':
        $.icon.setIcon('fa-info');
        //$.icon.setIconColor('blue');
        break;
      case 'error':
      case 'alert':
      case 'warn':
        $.icon.setIcon('fa-exclamation-triangle');
        $.icon.setIconColor('#900');
        break;
      case 'balance':
        $.icon.setIcon('fa-gbp');
        //$.icon.setIconColor(Alloy.CFG.Skin.zOrangeColor);
        break;
      case 'lowbalance':
        $.icon.setIcon('fa-gbp');
        $.icon.setIconColor(Alloy.CFG.Skin.zOrangeColor);
        //$.label.color = Alloy.CFG.Skin.zOrangeColor;
        break;
      case 'conference':
        $.icon.setIcon('fa-phone');
        //$.icon.setIconColor(Alloy.CFG.Skin.zGreenButtonColor);
        break;
      case 'sms':
        $.icon.setIcon('fa-edit');
        //$.icon.setIconColor(Alloy.CFG.Skin.zBlueColor);
        break;
      case 'add':
      case 'plus':
        $.icon.setIcon('fa-plus');
        //$.icon.setIconColor(Alloy.CFG.Skin.zBlueColor);
        break;
      case 'expand':
        $.icon.setIcon('fa-level-down');
        //$.icon.setIconColor(Alloy.CFG.Skin.zBlueColor);
        break;
      case 'collapse':
        $.icon.setIcon('fa-level-up');
        //$.icon.setIconColor(Alloy.CFG.Skin.zBlueColor);
        break;
      case 'none':
      default:
        $.icon.setIconColor('transparent');
        break;
    }
  }

  if (_.isString(opts.title)) {
    $.label.text = opts.title;
  }

  if (_.isFunction(opts.onClick)) {
    $.args.onNotificationClick = opts.onClick;
  }

  if ('filtericon' in opts) {
    $.filterSecondRightButton.setIcon(opts.filtericon);
    //$.filterSecondRightButton.setIconColor(Alloy.CFG.Skin.zBlueColor);
  }

  _.defaults(opts, {zIndex: 30, height: 40, visible:true});
  $.label.applyProperties({font: (opts.font || Alloy.CFG.notificationFont), color: opts.color || Alloy.CFG.titleColorDark});
  $.notificationview.applyProperties(opts); //{zIndex: 30, height: (opts.height || 40), visible: true});
  if (opts.vibrate) {
    Ti.Media.vibrate();
  }
};
exports.showNotification = showNotification;

function hideNotification() {
  $.notificationview.applyProperties({height: 0, visible: false});
  if (notificationparent) {
    try {
      notificationparent.remove($.notificationview);
    } catch(E) {
      $.lib.logError(E, LOGTAG+'.hideNotification');
    }
    notificationparent = undefined;
  }
};
exports.hideNotification = hideNotification;

exports.isShowing = function() {
  return $.notificationview.visible;
};

/**
 * onNotificationClick is a callback for a custom action
 *
 * @method onNotificationClick
 * @param {Object} e - caller button properties dictionary
 */
function onNotificationClick(e) {
  // No click (tap to hide) when
  if ($.buttonView.visible && (true === $.filterSecondRightButton.btn.visible)) {
    if (_.isFunction($.onSecondRightButtonClick)) {
      $.onSecondRightButtonClick({});
    } else {
      Alloy.CFG.logging && $.lib.logInfo('onNotificationClick: ignoring because filter is visible', 'notification');
    }
    return;
  }

  if (_.isFunction($.args.onNotificationClick)) {
    $.args.onNotificationClick(e);
  } else if (true !== $.ignoreclose) {
    Alloy.CFG.logging && $.lib.logInfo('onNotificationClick', 'notification');
    $.hideNotification();
  }
};
exports.onNotificationClick = onNotificationClick;

if (Ti.Shadow) { addSpy('notify', $); }
