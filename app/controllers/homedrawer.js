/**
 * The container window for the sidedrawer menu
 *
 * MainMenu.xml is in the leftWindow, and the activecontroller is swapped in and out of the (right) centerWindow
 */
exports.baseController = 'base/baseviewcontroller';
var LOGTAG = 'homedrawer';
$.lib.config.load();

Alloy.Globals.drawer = $.drawer;
Alloy.Globals.centerWindow = $.centerWindow;
Alloy.Globals.mainmenu = $.mainmenu;

if (OS_IOS) {
  $.drawer.leftWindow = $.leftWindow;
  $.drawer.centerWindow = $.centerWindow;
}
$.drawer.leftDrawerWidth =  (OS_IOS && $.lib.platform.isTablet) ? 320 : Alloy.CFG.leftDrawerWidth;

// Left drawer width for "tablets" was causing a border on xxhdpi android phones
if (OS_IOS) {
  try {
    $.drawer.setStatusBarStyle(Alloy.Globals.drawer.module.STATUSBAR_WHITE);

    // Animations per meeting request 20150324
    // TODO: if android version < 4.4.2, disable animations as the phone is likely too slow if it hasn't been upgraded.
    if (OS_ANDROID && nappdrawer) {
      Alloy.Globals.drawer.animationMode = Alloy.Globals.drawer.module.ANIMATION_NONE;
      Alloy.Globals.drawer.shadowWidth = "40dp";
      Alloy.Globals.drawer.showShadow = true;
      Alloy.Globals.drawer.animationVelocity = 750;
      Alloy.Globals.drawer.instance.setParallaxAmount = 0.5;
      Alloy.Globals.drawer.instance.setFading(0.5);
      Alloy.Globals.drawer.width = $.lib.platform.workingWidth;
    }
  } catch(E) {
    Alloy.CFG.logging && $.lib.logError('Drawer is not ready to applySettings yet');
  }
}

// onPostLayout doesn't trigger with Android tripvi.drawerLayout
if (OS_ANDROID) {
  $.drawer.window.addEventListener('postlayout', _.once(doAndroidPostLayout));
}

function doAndroidPostLayout(e) {
  if (OS_ANDROID) {
    Alloy.CFG.logging && $.lib.logInfo('doAndroidPostLayout', LOGTAG);
    try {
      $.drawer.window.removeEventListener('postlayout', doPostLayout);
      $.drawer.instance.addEventListener('androidback', doAndroidBack); // Disable default back button action
      //$.drawer.instance.setRightDrawerVisible(false);

      // Prevent white screen on back button if nothing else is loaded
      Alloy.Globals.activeview = null;
      _.defer(function () {
        $.lib.startup.doAfterMenuLoaded();
      });
    } catch
        (E) {
      $.lib.logError(E, LOGTAG+'.doAndroidPostLayout');
    }
    finally {
      $.lib.startup.ismenuloaded = true;
    }
  }
}

var isDrawerOpen = false;
function openDrawerFull() {
  if (!isDrawerOpen) {
    isDrawerOpen = true;
    try {
      $.drawer.removeEventListener('postlayout', doPostLayout);

      // No controller is created yet - we show the mainmenu
      if (_.isUndefined(Alloy.Globals.activecontroller)) {
        if (!$.drawer.isLeftWindowOpen()) {
           $.drawer.openLeftWindow();
        }
      } else {
        $.drawer.closeLeftWindow();
      }


      if (OS_ANDROID) {
        $.drawer.instance.addEventListener('androidback', doAndroidBack); // Disable default back button action
        //$.drawer.instance.setRightDrawerVisible(false);

        // Prevent white screen on back button if nothing else is loaded
        Alloy.Globals.activeview = null;
      }
      _.defer(function(){ $.lib.startup.doAfterMenuLoaded(); });
    } catch(E) {
      $.lib.logError(E, 'homedrawer.openDrawerFull');
    } finally {
      $.lib.startup.ismenuloaded = true;
    }
  }
};

/**
 * WindowDidOpen is called whenever the menu is finger-pull shown from the left margin or hamburger button of the centerWindow
 * @param {Object} e
 */
function doWindowDidOpen(e) {
  Alloy.CFG.logging && $.lib.logInfo('doWindowDidOpen', LOGTAG);
  if (Alloy.Globals.centerWindow && Alloy.Globals.activeview) {
    $.lib.platform.hideKeyboard(Alloy.Globals.activeview);
    // On android doesn't show as a menu, shows completely closed, because of "interaction mode none"? Works but shows blank window. Will cause issues with window eventing
    //if (OS_ANDROID && isDrawerOpen) {
    //  $.mainview.width = $.lib.platform.workingWidth - 40; // Alloy.Globals.drawer.shadowWidth
    //    Alloy.Globals.drawer.leftDrawerWidth = $.lib.platform.workingWidth - Alloy.CFG.Skin.drawerShadowWidth;
    //}
  }
};

function doWindowDidClose(e) {
  Alloy.CFG.logging && $.lib.logInfo('IOS doWindowDidClose', LOGTAG);
  if (Alloy.Globals.centerWindow && Alloy.Globals.activeview) {
    $.lib.platform.hideKeyboard(Alloy.Globals.activeview);
  }
};

function showAndroidHomeScreen() {
  if (OS_ANDROID) {
    var intent = Ti.Android.createIntent({action: Ti.Android.ACTION_MAIN});
    intent.addCategory(Ti.Android.CATEGORY_HOME);
    intent.addFlags(Ti.Android.FLAG_ACTIVITY_NEW_TASK);
    if (! $.lib.platform.startAndroidActivity(intent)) {
      $.lib.nav.showErrorNotification(L('error-cannotexit', 'Use the home button to return to the main android window.'));
    }
  }
};

function doAndroidBack(e) {
  if (Alloy.Globals.drawer.isLeftWindowOpen()) {
      $.lib.nav.showMainWindow();
//    }
    return;
  }
  if (Alloy.Globals.centerWindow && !$.lib.isNull(Alloy.Globals.activeview)) {
    $.showMainMenu();
  }
  Alloy.Globals.logLifecycleEvent('Back button exitOnClose from menu is disallowed');
};

function doPostLayout(e) {
  openDrawerFull();
};

function doOpenDrawer(evt){
  openDrawerFull();
};

function doCloseDrawer(evt){
  $.handleWindowClose(evt);
};

function openToWindow(controllername, args) {
  if (! isDrawerOpen) {
    $.drawer.open();
  }
  $.lib.startup.ismenuloaded = true;
  $.openDrawerWindow(controllername, args);
  //$.drawer.closeLeftWindow();
};
exports.openToWindow = openToWindow;

function openToMainMenu() {
  if (! isDrawerOpen) {
    $.drawer.open();
  }
  $.lib.startup.ismenuloaded = true;
  setTimeout(function(){
    Alloy.Globals.drawer.openLeftWindow();
  },
  1000);
};
exports.openToMainMenu = openToMainMenu;

if (Ti.Shadow) { addSpy('index', $); addSpy('home', $); }