/**
 * Navigation bar controlled via an array stack of windows
 * Require this in your views with
 *  <Require src="NavBar" type="view" id="navbar">
 *    <Button title="left button">
 *  </Require>
 *
 * @class NavBar
 */
$.lib = Alloy.Globals.lib;
$.args = arguments[0] || {};
var LOGTAG = 'navbar';
var debugVisible = $.lib.debug.testcontextmenu; // $.lib.beta || true;
var layoutToggle = 1;

// Add any child controls that were in the require tag
//_.each($.args.children || [], function(child) {
//  $.navbar.add(child);
//});

$.navbarloaded = false; // Tag marked when the instance viewWillLoad is called. Allows custom call from owner.baseStartLoading

$.setBarType = function(bartype) {
  // This is set so that modal:true overrides args, and so we can access on click-to-close
  $.args.bartype = bartype;
  Alloy.CFG.logging && $.lib.logInfo('Setting bartype='+bartype);
  if (bartype !== "contact") {
    $.rightButton.btn.visible = false;
    $.rightButton.hide();
  }
  switch (bartype) {
    case 'embedded':
    case 'hidden':
      $.navbar.applyProperties({visible: false, height: 0});
      break;
    case 'modal':
      $.leftClickView.visible = false;
      $.leftButton.btn.visible = false;
      $.rightButton.btn.visible = false;
      //$.titleLabel.left = 10; - (feet) option removed: now want to keep it centred
      break;
    case 'detail':
      // Show selection check mark or back arrow
      if (true === $.args.isSelect) {
        applyNavigationIcon('select');
      } else {
        applyNavigationIcon('detail');
      }
      $.rightButton.btn.visible = false;
      $.rightButton.hide();
      break;
    case 'contact':
      // Title and team dropdown
      $.args.bartype = 'drawer';
      OS_IOS && $.leftButton.btn.applyProperties({left: 6});
      $.titleLabel.right = 100;
      $.rightButton.btn.visible = true;
      $.rightButton.applyIcon('fa-caret-down', 24);
      $.rightButton.show();
      break;
    default:
      OS_IOS && $.leftButton.btn.applyProperties({left: 6});
      //$.args.bartype = 'drawer';
      break;
  }
};

function applyNavigationIcon(bartype) {
  switch (bartype) {
    case 'select':
      var backicon = OS_ANDROID ? '/images/checkbox_selected.png' : 'fa-check';
      var iconsize = OS_ANDROID ? 48 : 18;
      var backiconsize = 48;
      $.leftButton.applyIcon(backicon, iconsize);
      $.leftButton.btn.applyProperties({top: 5, left: (OS_ANDROID ? 5 : 0), width: backiconsize, height: backiconsize, visible: true});
      break;
    case 'detail':
      var backicon = OS_ANDROID ? '/images/back-arrow.png' : '/images/button_navback.png';
      var backiconsize = OS_ANDROID ? 30 : 28;
      $.leftButton.applyIcon(backicon, backiconsize);
      if (OS_ANDROID) {
        $.leftButton.btn.applyProperties({top: 15, left: 10, width: backiconsize, height: backiconsize, visible: true});
      } else {
        $.leftButton.btn.applyProperties({top: 16, left: 4, visible: true});
      }
      break;
  }
};
exports.applyNavigationIcon = applyNavigationIcon;

function applyTitle(title) {
  if (title) {
    $.titleLabel.text = title;
  }
};
exports.applyTitle = applyTitle;


function onInboundRecordingNotification(e) {
  Alloy.CFG.logging && $.lib.logInfo('app:inboundrecordingnotification state changed, updating buttons', LOGTAG);
  updateButtonDisplay();
};

/**
 * doLoadView is called as the owner view loads, and navbar specific arguments (detail, drawer etc) are passed in here
 *
 * @method doLoadView
 * @param {Object} widgetargs - settings dictionary for the widget
 */
exports.doLoadView = function(widgetargs) {
   Alloy.CFG.logging && $.lib.logInfo('navbar.doLoadView.navbarloaded=' + $.navbarloaded + ' $.args.bartype='+$.args.bartype + ' widgetargs.bartype=' + (widgetargs && widgetargs.bartype || 'undefined'));
  if (false === $.navbarloaded) {
    try {
      $.navbarloaded = true;
      if ($.lib.debug.isunittest) {
        $.iconButton.backgroundImage = '/images/bug.png'; // "/images/nav_zbadge.png"
      } else if ($.lib.isbeta || $.lib.isdebugmode) {
        $.betaImage.applyProperties({image: '/images/beta.png', visible: true});
      }
      $.iconButton.backgroundImage = "/images/nav_zbadge.png";

      // Placement is fine on iOS, vertically centred, on android its a little off
      if (OS_ANDROID) {
        //$.leftButton.btn.top = 8;
        //$.rightButton.btn.top = 6;
      }

      _.extend($.args, widgetargs);
      if ($.args.title) {
        $.titleLabel.text = $.args.title;
      }
      if ($.args.backgroundColor) {
        $.navbar.backgroundColor = $.args.backgroundColor;
      }
      if (($.args.isModal) || ($.args.modal)) {
        $.isModal = true;
        $.setBarType('modal');
      } else if ($.args.isDetail) {
        $.isDetail = true;
        $.setBarType('detail');
      } else if ($.args.bartype) {
        $.setBarType($.args.bartype);
      } else {
        $.setBarType();
      }

      updateButtonDisplay();
      if (true === debugVisible) {
        $.iconButton.applyProperties({
          font: Alloy.CFG.iconButtonFont,
          color: 'white',
          title: '\uf188', // fa-bug
          visible: true,
        });
      }
      $.iconButton.visible = $.lib.debug.textcontextmenu;

      $.leftButton.btn.addEventListener('touchstart', onLeftButtonClick);
      $.rightButton.btn.addEventListener('click', onRightButtonClick);
      Ti.App.addEventListener('app:inboundrecordingnotification', _.bind(onInboundRecordingNotification, this));
    } catch(E) {
      $.lib.logError(E, 'navbar.doLoadView');
      return false;
    }
  } else {
  }
  return true;
};

exports.doCloseView = function(widgetargs) {
  try {
    $.leftButton.btn.removeEventListener('touchstart', onLeftButtonClick);
    $.rightButton.btn.removeEventListener('click', onRightButtonClick);
    Ti.App.removeEventListener('app:inboundrecordingnotification', onInboundRecordingNotification);
  } catch(E) {
  } finally {
    return true;
  }
};

/**
 * onLeftButtonClick should navigate backward. Can be overridden by the owner view assigning a
 *
 * @method onLeftButtonClick
 * @param {Object} e - caller button properties dictionary
 */
function onLeftButtonClick(e) {
  e.cancelBubble = true;
  if (e.source) {
    e.source.cancelBubble = true;
  }

  if ($.searchText) {
    Alloy.CFG.logging && $.lib.logInfo('Left button click - blurring searchText field', LOGTAG);
    $.searchText.blur();
  } else {
    $.lib.platform.hideKeyboard(Alloy.Globals.activeview || undefined);
  }
  if (_.isFunction($.args.onLeftButtonClick)) {
    Alloy.CFG.logging && $.lib.logInfo('onLeftButtonClick...deferring to custom override', ['nav']);
    $.args.onLeftButtonClick(e);
  } else {
    doBackButton(e);
  }
};

function doBackButton(e) {
  Alloy.CFG.logging && $.lib.logInfo('onLeftButtonClick bartype=' + $.args.bartype, ['nav']);
  $.lib.platform.hideKeyboard(Alloy.Globals.activeview || undefined);
  if (($.args.bartype === 'modal') || ($.args.bartype === 'detail')) {
    Alloy.CFG.logging && $.lib.logInfo('onLeftButtonClick - close detail window', ['nav']);
    if ($.parentwindow) {
      var closeArgs = $.lib.nav.closeWindowArgs(($.args.bartype === 'detail'));
      $.parentwindow.close(closeArgs);
    } else {
      $.lib.logError('Navbar: no parentwindow');
      $.lib.nav.closeWindow();
    }
  } else if (true === $.args.isDrawer) {
    Alloy.CFG.logging && $.lib.logInfo('onLeftButtonClick - show drawer from menu', ['nav']);
    $.lib.nav.showMainMenu();
  } else {
    Alloy.CFG.logging && $.lib.logInfo('onLeftButtonClick - unknown window type, closing and returning to menu', ['nav']);
    $.lib.nav.showMainMenu();
  }
};
exports.doBackButton = doBackButton;

function updateButtonDisplay() {
  if (true === $.args.composeButton) {
    $.rightButton.btn.applyProperties({top:8, left:undefined, right:60, width:46, height:46});
    $.rightButton.applyIcon('fa-edit', 22);
    $.rightButton.setIconColor('white');
  }
};
exports.updateButtonDisplay = updateButtonDisplay;

/**
 * onTitleClick is a helper during debugging
 *
 * @method onTitleClick
 * @param {Object} e - caller button properties dictionary
 */
function onTitleClick(e) {
  Alloy.CFG.logging && $.lib.logInfo('Navbar title click');
  if (_.isFunction($.args.onTitleButtonClick)) {
    $.args.onTitleButtonClick(e);
  } else if (($.args.bartype === 'detail') || ($.args.bartype === 'drawer')) {
    onLeftButtonClick(e);
  } else if ($.lib.config.isdebugmode) {
    doBackButton(e);
  }
};

function rightButtonClick(e) {
  if (_.isFunction($.args.onRightButtonClick)) {
    $.args.onRightButtonClick(e);
  } else {
    Alloy.CFG.logging && $.lib.logInfo('onRightButtonClick', ['nav']);
    var newsetting = !$.lib.config.callRecordingInboundOn();
    $.lib.config.activateInboundCallRecording(newsetting, true);
    //updateButtonDisplay();
  }
};
var debouncedRightButtonClick = _.debounce(rightButtonClick, 500, true);
function onRightButtonClick(e) {
  debouncedRightButtonClick(e);
};

function onIconButtonClick(e) {
  if (debugVisible) {
    //Alloy.Collections.instance('Userrecordings').addDebugData();
    var windowname = $.lib.nav.isActive();
    if (_.isString(windowname) && windowname.startsWith('templates')) {
      if ((layoutToggle++ % 2) == 0) {
        $.lib.platform.revertLayout();
      } else {
        $.lib.platform.debugLayout();
      }
    } else {
      //$.lib.nav.showNotification({notificationtype: 'info', height: 60, title: $.lib.betaInfo(), timeout: 999999, onClick: function(e){
      if ($.lib.nav.isActive('LogOutput')) {
        $.lib.nav.closeWindowByName('LogOutput', true);
      } else {
        $.lib.nav.openDetailWindow('LogOutput');
      }
    }
  } else if (_.isFunction($.args.onIconButtonClick)) {
    $.args.onIconButtonClick(e);
  } else {
    Alloy.CFG.logging && $.lib.logInfo('onIconButtonClick', ['nav']);
  }
};


if (Ti.Shadow) { addSpy('navbar', $); }
