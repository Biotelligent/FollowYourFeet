/*jslint maxerr:1000 */
'use strict';

/** Inheritable controller for UI views
 *
 * Allows consistent navigation, initialisation and cleanup whether the view is embedded or modal on either platform

 * "Convention over configuration":
 *   all mainviews should be called $.mainview
 *   all navbar are called $.navbar
 *   all tabbar are called $.tabbar
 *   all views (or windows) implement doLoadView && doCloseView for initialisation, cleanup, and validation or exception handling
 *
 * @class baseviewcontroller
 */
var lib = Alloy.Globals.lib;
//noinspection JSReferencingArgumentsOutsideOfFunction
var args = arguments[0] || {};
var win;
var LOGTAG = 'baseviewcontroller';
var AndroidPauseResume = require('AndroidPauseResume');
exports.args = args;
exports.lib = lib;
exports.platform = lib.platform;
exports.drawermenu = (Alloy.CFG.drawermenu) ? true : false;

exports.handleWindowOpen = function(e) {
  if (OS_ANDROID) {
    var activity = (e.source._internalActivity) ? e.source._internalActivity : e.source.activity;
    if (activity) {
      AndroidPauseResume.on(e.source.title || 'main', activity);
    }
  }
};

exports.handleWindowClose = function(e) {
  if (OS_ANDROID) {
    var activity = (e.source._internalActivity) ? e.source._internalActivity : e.source.activity;
    if (activity) {
      AndroidPauseResume.off(e.source.title || 'main', activity);
    }
  }
};

exports.showMainWindow = function() {
  // Open or close back to the feet controller. SideMenu is closed.
  if (_.isUndefined(Alloy.Globals.drawer)) {
    Alloy.createController('homedrawer').openToWindow('Puppet');
  } else {
    $.showController('Puppet');
  }
  $.lib.platform.hideKeyboard(Alloy.Globals.activeview || undefined);
};

exports.showMainMenu = function() {
  // If signup has occurred, there is no menu yet, so open it now.
  if (_.isUndefined(Alloy.Globals.drawer)) {
    Alloy.createController('homedrawer').openToMainMenu();
  } else {
    $.showController('MainMenu');
  }
  $.lib.platform.hideKeyboard(Alloy.Globals.activeview || undefined);
};

exports.controllerName = function() {
  return $.__controllerPath;
};

exports.activecontrollerName = function() {
  if (Alloy.Globals.activecontroller) {
    return Alloy.Globals.activecontroller.__controllerPath;
  } else {
    return 'undefined';
  }
};

/**
 * Return the name of the active controller (via isActive()) or true/false whether the activecontroller matches the name passed
 * @method isActive
 * @param {String} name - the name of the controller to check
 */
exports.isActive = function(name) {
  if ($.lib.isNullOrBlank(name) && Alloy.Globals.activecontroller) {
    return Alloy.Globals.activecontroller.__controllerPath;
  } else if (Alloy.Globals.activecontroller) {
    return ('' + Alloy.Globals.activecontroller.__controllerPath).sameText(name);
  } else {
    return false;
  }
};

exports.showControllerNewTransition = function(controllername, cargs) {
  //$.lib.nav.counter++;
  //$.lib.logError('nav.counter='+$.lib.nav.counter);
  Alloy.CFG.profiling && $.lib.logInfo(controllername+'.showControllerNewTransition', [LOGTAG, 'timestart']);

  cargs = cargs || {};
  var hasDrawer = ((true === $.drawermenu) && Alloy.Globals.drawer) ? true : false;
  var inDrawer = (cargs.isDetail || cargs.isModal || cargs.modal) ? false : hasDrawer;

  // Open a controller
  if (! _.isString(controllername)) {
    $.lib.logError('baseviewcontroller.showController(), controllername not specified');
    return Alloy.Globals.activecontroller;
  }
  if (controllername.sameText('blank')) {
    $.lib.logError('baseviewcontroller.showController(), controllername = "blank"');
    return Alloy.Globals.activecontroller;
  }

  // Show mainmenu drawer
  if (controllername.sameText('MainMenu')) {
    if (hasDrawer) {
      Alloy.Globals.drawer.leftDrawerWidth = Alloy.CFG.leftDrawerWidth; //$.lib.platform.workingWidth;
      Alloy.Globals.drawer.openLeftWindow();
      return Alloy.Globals.activecontroller; // MainMenu never becomes the activecontroller
    }
  }

  if (Alloy.Globals.activecontroller) {
    // Same? - Reshow it.
    if ((Alloy.Globals.activecontroller.__controllerPath === controllername)) {
       $.lib.logInfo('baseviewcontroller.showController(), reshowing ' + controllername);
      if ((false === $.lib.platform.isTablet) && inDrawer) {
         Alloy.Globals.drawer.toggleLeftWindow();
      }
      return Alloy.Globals.activecontroller;
    }
  }

  // New selection?
  // A new detail window opens over the existing one in the stack, a new drawer window replaces the existing one in the stack
  var oldcontrollername = (! $.lib.isNull(Alloy.Globals.activecontroller) && ! _.isUndefined(Alloy.Globals.activecontroller.__controllerPath)) ? Alloy.Globals.activecontroller.__controllerPath : '';
  var oldcontroller = Alloy.Globals.activecontroller && (oldcontrollername !== '') ? Alloy.Globals.activecontroller : undefined;
  if (inDrawer && Alloy.Globals.activecontroller && Alloy.Globals.centerWindow) {

    // XXY all detail windows are pushed, but only drawer windows are being popped?
    $.popController('CenterWindow.pop');
  }

  // if (inDrawer && (true === $.drawermenu) && (oldcontrollername !== '')) {
    // var newwidth = $.lib.platform.workingWidth - Alloy.CFG.drawerShadowWidth;
    // if (Alloy.Globals.drawer.leftDrawerWidth !== newwidth) {
      // Alloy.Globals.drawer.leftDrawerWidth = $.lib.platform.workingWidth - Alloy.CFG.drawerShadowWidth;
    // }
  // }

  Alloy.Globals.activecontroller = Alloy.createController(controllername, cargs);
  //XXY Alloy.Globals.activecontroller = Alloy.Globals.Controllers.instance(controllername, cargs);
  Alloy.Globals.activeview = Alloy.Globals.activecontroller.getView();
  Alloy.Globals.controllerstack.push(Alloy.Globals.activecontroller);
  $.logControllerStack('CenterWindow.push');


  // XXY try android gmail style; show previous window faded then restore
  if (inDrawer && (true === $.lib.startup.ismenuloaded) && Alloy.Globals.centerWindow && (oldcontrollername !== '')) {
    Alloy.Globals.centerWindow.setOpacity(0.6);
    Alloy.Globals.centerWindow.touchEnabled = false;
    Alloy.Globals.drawer.closeLeftWindow();
    //Alloy.Globals.centerWindow.opacity = 0.5;
  }


  // Tell the child to start loading
  try {
    $.baseStartLoading(Alloy.Globals.activecontroller, {isDrawer: inDrawer, isDetail: cargs.isDetail, isModal: cargs.isModal});
    //$.baseStartLoading(incomingcontroller, {isDrawer: inDrawer, isDetail: cargs.isDetail, isModal: cargs.isModal});

    // Swap the drawer view to the new one
  } finally {
    //XXY Alloy.Globals.centerWindow.removeAllChildren();
    if (inDrawer && Alloy.Globals.centerWindow) {
      Alloy.Globals.centerWindow.add(Alloy.Globals.activeview);
      Alloy.Globals.centerWindow.setOpacity(1.0);
      Alloy.Globals.centerWindow.touchEnabled = true;

      // var newwidth = $.lib.platform.workingWidth - Alloy.CFG.drawerShadowWidth;
      // if (Alloy.Globals.drawer.leftDrawerWidth !== newwidth) {
        // Alloy.Globals.drawer.leftDrawerWidth = $.lib.platform.workingWidth - Alloy.CFG.drawerShadowWidth;
      // }
    }

    // XXY
    if (oldcontroller) {
      oldcontroller.destroy();
      oldcontroller.getView().removeAllChildren();
    }
    //if (false === $.lib.platform.isTablet) {
    //  Alloy.Globals.drawer.closeLeftWindow(); // Still required in case the old controller was mainmenu / first laod
    //}
  }

  // Now remove the old view/controller
  $.cleanupOldController(oldcontrollername, oldcontroller);

  // Swap to the controller
  // if (inDrawer && (controllername === 'ZCalls')) {
    // if (_.isUndefined(Alloy.Globals.zcalls)) { // Currently calling from the ZMsgThread breaks icons and doesn't pass the smsdialog args since the controller exists
      // _.extend(cargs, {sticky: true});
      // Alloy.Globals.zcalls = Alloy.createController('ZCalls', cargs);
    // }
    // Alloy.Globals.oldcontroller = Alloy.Globals.zcalls;
  // } else {
    // Alloy.Globals.activecontroller = Alloy.createController(controllername, cargs);
  // }
  // Alloy.Globals.activeview = Alloy.Globals.activecontroller.getView();
  // Alloy.Globals.controllerstack.push(Alloy.Globals.activecontroller);
  // $.logControllerStack('CenterWindow.push');
//
  // if (inDrawer && (true === $.drawermenu)) {
    // Alloy.Globals.drawer.leftDrawerWidth = $.lib.platform.workingWidth - Alloy.CFG.Skin.drawerShadowWidth;
  // }
//
  // // Tell the child to start loading
  // $.baseStartLoading(Alloy.Globals.activecontroller, {isDrawer: inDrawer, isDetail: cargs.isDetail, isModal: cargs.isModal});
//
  // if (inDrawer) {
    // Alloy.Globals.centerWindow.add(Alloy.Globals.activeview);
    // if (false === $.lib.platform.isTablet) {
      // Alloy.Globals.drawer.closeLeftWindow();
    // }
  // }

  //Alloy.Globals.activecontroller = incomingcontroller;
  Alloy.CFG.profiling && $.lib.logInfo(controllername+'.showControllerNewTransition', [LOGTAG, 'timeend']);
  return Alloy.Globals.activecontroller;
};

exports.cleanupOldController = function(oldcontrollername, oldcontroller) {
  // JMH is this causing an empty window for detail windows? Currently 20160402 causes explosion
  return;

  if (/*(oldcontrollername !== 'ZCalls') &&*/ (oldcontrollername !== '') && oldcontroller) {
    try {
      Alloy.CFG.logging && $.lib.logInfo('Destroying old controller ' + oldcontrollername);
      if (_.isFunction(oldcontroller.doCloseView)) {
        Alloy.CFG.logging && $.lib.logInfo('Calling baseAfterClose for old controller ' + oldcontrollername);
        oldcontroller.doCloseView();
      }
      if ((oldcontroller.navbar && _.isFunction(oldcontroller.navbar.doCloseView))) {
        oldcontroller.navbar.doCloseView();
      }
      if ((oldcontroller.tabbar && _.isFunction(oldcontroller.tabbar.doCloseView))) {
        oldcontroller.tabbar.tabbarloaded = false;
        oldcontroller.tabbar.doCloseView();
      }

      // if (_.isFunction(oldcontroller.baseAfterClose)) { *** calling this causes subsequent failures/missing tabbar and navbar functions are disconnected
        // Alloy.CFG.logging && $.lib.logInfo('Calling baseAfterClose for old controller ' + oldcontrollername);
        // oldcontroller.baseAfterClose();
      // }
      oldcontroller.destroy();
      oldcontroller.getView().removeAllChildren();
      oldcontroller = null;
      //XXY Alloy.Globals.Controllers[oldcontrollername] = null;
    } catch(E) {
      $.lib.logError('Exception removing oldcontroller ' + oldcontrollername);
    }
  }
};

exports.showControllerTransition = function(controllername, cargs) {
  //$.lib.nav.counter++;
  //$.lib.logError('nav.counter='+$.lib.nav.counter);

  cargs = cargs || {};

  Alloy.CFG.profiling && $.lib.logInfo(controllername+'.showControllerTransition', [LOGTAG, 'timestart']);
  var hasDrawer = ((true === $.drawermenu) && Alloy.Globals.drawer) ? true : false;
  var inDrawer = (cargs.isDetail || cargs.isModal || cargs.modal) ? false : hasDrawer;

  // Open a controller
  if (! _.isString(controllername)) {
    $.lib.logError('baseviewcontroller.showController(), controllername not specified');
    return Alloy.Globals.activecontroller;
  }
  if (controllername.sameText('blank')) {
    $.lib.logError('baseviewcontroller.showController(), controllername = "blank"');
    return Alloy.Globals.activecontroller;
  }

  // Show mainmenu drawer
  if (controllername.sameText('MainMenu')) {
    if (hasDrawer) {
      Alloy.Globals.drawer.openLeftWindow();
      return Alloy.Globals.activecontroller;
    }
  }

  if (Alloy.Globals.activecontroller) {
    // Same? - Reshow it.
    if ((Alloy.Globals.activecontroller.__controllerPath === controllername) /*&& (undefined === cargs)*/) {
       $.lib.logInfo('baseviewcontroller.showController(), reshowing ' + controllername);
      if ((false === $.lib.platform.isTablet) && inDrawer) {
         Alloy.Globals.drawer.toggleLeftWindow();
      }
      return Alloy.Globals.activecontroller;
    }


   //////////////////
   //////////////////
   /*
    * TODO:
    *   Create the new controller but don't baseLoad it
    *
    *   If the new controller is not in the drawer, baseload and return
    *
    *   If the new controller is going in the drawer
    *      If a controller exists in the centerwindow - tag it oldcontroller for mem.release
    *
    *      If the drawer is not fullwidth (sidebar is showing)
    *      ... if the new controller is "heavy"
    *          closeLeftWindow setting opacity to 0.6
    *          baseLoad, addToCenterWindow, setOpacity to 1.0
    *          oldcontroller.removeallchildren and destroy
    *
    *      else baseload, addToCenterWindow, old.removeallchildren, closeLeftWindow
    */

  //var oldcontrollername = (! $.lib.isNull(Alloy.Globals.activecontroller) && ! _.isUndefined(Alloy.Globals.activecontroller.__controllerPath)) ? Alloy.Globals.activecontroller.__controllerPath : '';
  //var oldcontroller = Alloy.Globals.activecontroller && (oldcontrollername !== '') ? Alloy.Globals.activecontroller : undefined;

  // If there is an existing controller in the centerWindow AND we are going to replace it, get a handle to it here.
  if (inDrawer && Alloy.Globals.activecontroller && Alloy.Globals.centerWindow) {

    // XXY all detail windows are pushed, but only drawer windows are being popped?
    $.popController('CenterWindow.pop');
  }

  // if (inDrawer && (true === $.drawermenu) && (oldcontrollername !== '')) {
    // var newwidth = $.lib.platform.workingWidth - Alloy.CFG.drawerShadowWidth;
    // if (Alloy.Globals.drawer.leftDrawerWidth !== newwidth) {
      // Alloy.Globals.drawer.leftDrawerWidth = $.lib.platform.workingWidth - Alloy.CFG.drawerShadowWidth;
    // }
  // }

  Alloy.Globals.activecontroller = Alloy.createController(controllername, cargs);
  //XXY Alloy.Globals.activecontroller = Alloy.Globals.Controllers.instance(controllername, cargs);
  Alloy.Globals.activeview = Alloy.Globals.activecontroller.getView();
  Alloy.Globals.controllerstack.push(Alloy.Globals.activecontroller);
  $.logControllerStack('CenterWindow.push');


  }
};

exports.showController = function(controllername, cargs) {
  //$.lib.nav.counter++;
  //$.lib.logError('nav.counter='+$.lib.nav.counter);

  cargs = cargs || {};

  Alloy.CFG.profiling && $.lib.logInfo(controllername+'.showController', [LOGTAG, 'timestart']);
  var hasDrawer = ((true === $.drawermenu) && Alloy.Globals.drawer) ? true : false;
  var inDrawer = (cargs.isDetail || cargs.isModal || cargs.modal) ? false : hasDrawer;

  // Open a controller
  if (! _.isString(controllername)) {
    $.lib.logError('baseviewcontroller.showController(), controllername not specified');
    return Alloy.Globals.activecontroller;
  }
  if (controllername.sameText('blank')) {
    $.lib.logError('baseviewcontroller.showController(), controllername = "blank"');
    return Alloy.Globals.activecontroller;
  }

  // Show mainmenu drawer
  if (controllername.sameText('MainMenu')) {
    if (hasDrawer) {
      Alloy.Globals.drawer.openLeftWindow();
      return Alloy.Globals.activecontroller;
    }
  }

  if (Alloy.Globals.activecontroller) {
    // Same? - Reshow it.
    if ((Alloy.Globals.activecontroller.__controllerPath === controllername) /*&& (undefined === cargs)*/) {
       $.lib.logInfo('baseviewcontroller.showController(), reshowing ' + controllername);
      //if (controllername.sameText('MainMenu')) {
      if ((false === $.lib.platform.isTablet) && inDrawer) {
         Alloy.Globals.drawer.toggleLeftWindow();
      }
      return Alloy.Globals.activecontroller;
    }

    // New selection?
    // A new detail window opens over the existing one in the stack, a new drawer window replaces the existing one in the stack
    var oldcontrollername = (! $.lib.isNull(Alloy.Globals.activecontroller) && ! _.isUndefined(Alloy.Globals.activecontroller.__controllerPath)) ? Alloy.Globals.activecontroller.__controllerPath : '';

    if (inDrawer) {
      if (Alloy.Globals.centerWindow) {
        if (oldcontrollername !== '') {
          Alloy.Globals.centerWindow.removeAllChildren();//.remove(Alloy.Globals.activeview);
          Alloy.Globals.activeview = null;
          Alloy.Globals.activecontroller.destroy(); // TODO: This may require doCloseView to correctly release mem.
        }
        $.popController('CenterWindow.pop');
      }
    }
  }

  /* Swap to the controller */
    Alloy.Globals.activecontroller = Alloy.createController(controllername, cargs);
    Alloy.Globals.activeview = Alloy.Globals.activecontroller.getView();
   Alloy.Globals.controllerstack.push(Alloy.Globals.activecontroller);
  $.logControllerStack('CenterWindow.push');

  if (inDrawer && (true === $.drawermenu)) {
    Alloy.Globals.drawer.leftDrawerWidth = Alloy.CFG.leftDrawerWidth; // $.lib.platform.workingWidth - Alloy.CFG.drawerShadowWidth;
  }

  // Tell the child to start loading
  $.baseStartLoading(Alloy.Globals.activecontroller, {isDrawer: inDrawer, isDetail: cargs.isDetail, isModal: cargs.isModal});

  if (inDrawer && (true === $.lib.startup.ismenuloaded)) {
    try {
      Alloy.Globals.centerWindow.add(Alloy.Globals.activeview);
      if (false === $.lib.platform.isTablet) {
        Alloy.Globals.drawer.closeLeftWindow();
      }
    } catch(E) {
      $.lib.logError(E, 'showController');
    }
  }

  Alloy.CFG.profiling && $.lib.logInfo(controllername+'.showController', [LOGTAG, 'timeend']);
  return Alloy.Globals.activecontroller;
};

exports.baseStartLoading = function(activecontroller, args) {
  // Indicates that the controller+view is configured with properties and events
  // and can call showNow() when it is completed populating data.
  if (Ti.Shadow && activecontroller.__controllerPath) {
    Alloy.CFG.logging && $.lib.logInfo('Ti.Shadow activecontroller ' + activecontroller.__controllerPath);
    addSpy(activecontroller.__controllerPath, activecontroller);
    addSpy('activecontroller', activecontroller);  // this? _.extend($, exports);
  }
  // User activity detected
  $.lib.platform.resetIdleTimeout();

  if (activecontroller.navbar) {
    activecontroller.navbar.isDetail = args['isDetail'];
  }

  // Init mainview
  try {
    var loaded = false;
    if (_.isFunction(activecontroller.doLoadView)) {
      Alloy.CFG.logging && $.lib.logInfo(activecontroller.__controllerPath+'.doLoadView');
      loaded = activecontroller.doLoadView();
    }
    // Init navbar && tabbar if the mainview.startLoading didn't call them
    if ((activecontroller.navbar && (false === activecontroller.navbar.navbarloaded) && _.isFunction(activecontroller.navbar.doLoadView))) {
      Alloy.CFG.logging && $.lib.logInfo(activecontroller.__controllerPath+'.navbar.doLoadView');
      activecontroller.navbar.doLoadView(_.extend({onIconButtonClick: $.baseContextMenuClick}, args));
    }
    if ((activecontroller.tabbar && (false === activecontroller.tabbar.tabbarloaded) && _.isFunction(activecontroller.tabbar.doLoadView))) {
      Alloy.CFG.logging && $.lib.logInfo(activecontroller.__controllerPath+'.tabbar.doLoadView');
      activecontroller.tabbar.doLoadView(args);
    }

    // Use activecontroller.args not param.args callback to allow the inherited doLoadView to mark as handled by nulling the function
    if (loaded && activecontroller.args && _.isFunction(activecontroller.args.onViewLoaded)) {
      try {
        activecontroller.args.onViewLoaded(activecontroller);
      } catch(E) {
        $.lib.logError(E, 'onViewLoaded');
      }
    }
  } catch(E) {
    $.lib.logError(E, 'doLoadView');
    // TODO: Z 150201 JMH Return to main screen if there was an unhandled opening error?
  }
};

exports.baseAfterClose = function(){
  // When the view or window closes, call doCloseView to unbind any event handlers etc
  try {
    // User activity detected
    $.lib.platform.resetIdleTimeout();

    var canClose = true;
    if (_.isFunction($.doCloseView)) {
      canClose = (false === $.doCloseView()) ? false :  true;
      if (false === canClose) {
         // TODO: Z 150201 JMH Prevent the view/window closing in activecontroller

      }
    }
    // Deinit navbar && tabbar (unbind event handlers etc) if they were loaded
    if (($.navbar && (true === $.navbar.navbarloaded) && _.isFunction($.navbar.doCloseView))) {
      $.navbar.doCloseView();
    }
    if (($.tabbar && (true === $.tabbar.tabbarloaded) && _.isFunction($.tabbar.doCloseView))) {
      $.tabbar.doCloseView();
    }
    if ($.isSticky) {
      Alloy.CFG.logging && $.lib.logInfo('Not destroying sticky controller', LOGTAG);
    } else {
      Alloy.CFG.logging && $.lib.logInfo('Closing controller', LOGTAG);
      $.destroy();
    }
  } catch(E) {
    $.lib.logError(E, 'doCloseView');

    canClose = true;
    //$ = nil;
  }
};

exports.baseRelayout = function(){
  // Relayout the view (eg. when the orientation changes)
  if (_.isFunction($.doLayoutChange)) {
    $.doLayoutChange();
  } else if (_.isFunction($.relayout)) {
    $.relayout();
  }
};

/**
 * Default or defer to the controller when the user clicks the context menu icon or uses the context menu hardware key
 */
exports.baseContextMenuClick = function(e) {
  try {
    if (_.isFunction($.doContextMenuClick)) {
      $.doContextMenuClick();
    } else {
      Alloy.CFG.logging && $.lib.logInfo('Context menu click', 'nav');
      if ($.lib.config.debug.isdeveloper) {
        // Display the API debugmenu if nothing else is set.
        $.openDetailWindow('test/DebugView');  // nb. from ZCall has fullscreen: false as opts
      }
    }
  } catch(E) {
    $.lib.logError(E, 'baseContextMenuClick');
  }
};

/**
 * Add all window hooks consistently
 */
exports.applyWindowEvents = function(win, opts) {
  if (OS_ANDROID) {
    win.addEventListener('open', function(e) {
      $.handleWindowOpen(e);
    });
    win.addEventListener('close', function(e) {
      $.handleWindowClose(e);
    });
    if (opts && (true === opts.disableandroidback)) {
      win.addEventListener('androidback', function(e){
        Alloy.Globals.logLifecycleEvent('Back button from window is disallowed');
      });
    }
  }
};
/**
 * Return a new (or in some cases, where we want the shared) window instance for modal and detail windows
 */
//$.navWin = null;
function newWindow(opts) {
  var newwin = Ti.UI.createWindow(opts);
  // if (OS_IOS) {
    // opts = opts || {};
    // if (!! opts.isNavigationWindow) {
      // Alloy.CFG.logging && $.lib.logInfo('Creating iOS nav parent window', LOGTAG);
      // _.extend(opts, {window: newwin});
      // Alloy.Globals.navWin = Ti.UI.iOS.createNavigationWindow(opts);
    // } else if (opts.isNavigationChild) {
      // Alloy.CFG.logging && $.lib.logInfo('Creating iOS nav detail window', LOGTAG);
    // } else {
      // Alloy.CFG.logging && $.lib.logInfo('Nulling iOS nav detail window', LOGTAG);
      // Alloy.Globals.navWin = null;
    // }
  // }
  $.applyWindowEvents(newwin, opts);
  return newwin;
};

/**
 * Open a new window at the top of the stack which contains a viewcontroller
 */
function internalOpenWindow(controllername, opts) {
  Alloy.CFG.logging && $.lib.logInfo('OpenWindow ' + controllername + ' from ' + $.controllerName() + ' opts='+$.lib.stringify(opts), 'baseviewcontroller');
  try {
    opts = opts || {};
    var newcontroller = $.showController(controllername, opts);
    if (newcontroller) {
      Alloy.CFG.profiling && $.lib.logInfo(controllername+'.internalOpenWindow', [LOGTAG, 'timestart']);
      if (true === opts.popup) {
        _.extend(opts, {backgroundColor:"transparent"/*, opacity: 0.5*/});
      }
      $.lib.platform.fixAndroidTitlebar && (opts.backgroundColor = Alloy.CFG.backgroundColorBlue);
      if (OS_IOS && (Alloy.Globals.navWin != null) && (!! opts.isDetail)) {
        //_.extend(opts, {isNavigationChild: true});
      }

      //_.extend(opts, {controller: newcontroller}); // IOS crash
      var newwin = newWindow(opts);
      _.extend(newcontroller, {win: newwin, parentwindow: newwin}); // Give the controller a reference to the parentwindow

      var newview = newcontroller.getView();
      if (newview) {
        if ($.lib.platform.fixAndroidTitlebar && ((!! opts.isDetail) || (!! opts.isModal))) {
          newview.top = 20; // $.lib.platform.workingTop);
        }
        _.extend(newview, {win: newwin, parentwindow: newwin}); // Give the view a reference to the parentwindow
        newwin.add(newview);
      } else {
        $.lib.logError('OpenWindow NO VIEW for '+controllername, 'baseviewcontroller');
      }

      if (newcontroller.navbar) {
        newcontroller.navbar.parentwindow = newwin;
      }
      addToWindowStack(newwin, newcontroller);
      if (opts.isNavigationChild) {
        Alloy.CFG.logging && $.lib.logInfo('OpenWindow isNavigationChild', 'baseviewcontroller');
        Alloy.Globals.navWin.openWindow(newwin);
      } else {
        newwin.open(opts);
      }
      Alloy.CFG.profiling && $.lib.logInfo(controllername+'.internalOpenWindow', [LOGTAG, 'timeend']);
      return newcontroller;
    } else {
      $.lib.logError('OpenWindow NO CONTROLLER for '+controllername, 'baseviewcontroller');
    }
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.internalopenwindow');
    return undefined;
  }
};

/**
 * Open specific to CallConnect where the controller is pre-existing so only the view is swapped in and out of the preexisting controller
 * (allows us to resume from lockscreen faster)
 *
 */
exports.openWindow = function(opts) {
  if (! win) {
    Alloy.CFG.logging && $.lib.logInfo('openWindow: creating new window controller', LOGTAG);
    opts = opts || {};
    _.defaults(opts, {isModal:true, modal: true, top: $.lib.platform.workingTop, fullscreen: false, exitOnClose: false, theme: 'Theme.Feet'});
    win = Ti.UI.createWindow(opts);
    _.extend($, {win: win});
    $.applyWindowEvents(win, opts);
  }
  var cargs = _.extend(opts, {isDrawer: false, isDetail: opts.isDetail, isModal: opts.modal || opts.isModal});
  $.baseStartLoading($, cargs);
  _.extend($, {win: win, parentwindow: win});
  var mainview = $.mainview || $.getView();
  if (mainview) {
    _.extend(mainview, {win: win, parentwindow: win}); // Give the view a reference to the parentwindow
    win.add(mainview);
  }
  addToWindowStack(win, $);
  win.open(opts);
};

/**
 * Add a viewcontroller as a detail window
 */
exports.openDetailWindow = function(controllername, opts) {
  opts = opts || {};
  _.defaults(opts, {isDetail:true, detail: true, top: $.lib.platform.workingTop, fullscreen: false});
  if (OS_IOS) {
    _.extend(opts, {fullscreen: false, top: $.lib.platform.workingTop, statusBarStyle: Ti.UI.iPhone.StatusBar.LIGHT_CONTENT});

    if (Alloy.Globals.activeview && Alloy.Globals.activeview.parentwindow && Alloy.Globals.activeview.parentwindow.modal) {
       Alloy.CFG.logging && $.lib.logInfo('The current activeview is modal, creating iOS detail window as modal', LOGTAG);
       opts.modal = true;
    }
  }
  if (OS_ANDROID) {
    // Prevent the keyboard popping up when a window opens, but when the user focuses a text field, scroll the field into view without pushing bottom=0 bound buttons up
    _.extend(opts, {windowSoftInputMode: (Ti.UI.Android.SOFT_INPUT_ADJUST_PAN | Ti.UI.Android.SOFT_INPUT_STATE_ALWAYS_HIDDEN), theme: 'Theme.Feet'});
    if (opts.animated !== false) {
      opts.activityEnterAnimation = Ti.Android.R.anim.slide_in_left;
      opts.activityExitAnimation = Ti.Android.R.anim.slide_out_right;
      opts.animated = true;
    }
  }
  return internalOpenWindow(controllername, opts);
};

/**
 * Feet style navigation window on iOS
 *
function openDetailController(controllername, args) {
  try {
    var ctrl = Alloy.Globals.Controllers.instance(controllername, args);
    if ($.navWin) {
      $.navWin.openWindow(ctrl.getView());
    } else {
      ctrl.getView().open();
    }

    if (Ti.Shadow) {
      addSpy('active', ctrl);
      addSpy('activecontroller', ctrl);
    }
    Alloy.Globals.activecontroller = ctrl;
  } catch(E) {
     $.lib.logError('openDetailController for '+controllername, 'baseviewcontroller');
     $.lib.logError(E);
  }
};
exports.openDetailController = openDetailController;
 */

/**
 * Modal window behaviour args for iOS/Android used for popup widgets and persistent windows; passed to both Ti.UI.createWindow and window.open
 * Don't pass functions into the args - it will crash the window option events
 */
function modalWindowArgs(opts) {
 opts = opts || {};
  _.defaults(opts, {navBarHidden: false, isModal:true, modal: true, top: $.lib.platform.workingTop, fullscreen: false, exitOnClose: false, orientationModes: [Ti.UI.PORTRAIT,Ti.UI.UPSIDE_PORTRAIT]});
  if (OS_ANDROID) {
    // Prevent the keyboard popping up when a window opens, but when the user focuses a text field, scroll the field into view without pushing bottom=0 bound buttons up
    _.extend(opts, {windowSoftInputMode: (Ti.UI.Android.SOFT_INPUT_ADJUST_PAN | Ti.UI.Android.SOFT_INPUT_STATE_ALWAYS_HIDDEN), theme: 'Theme.Feet'});
  }
  return opts;
};
exports.modalWindowArgs = modalWindowArgs;

/**
 * Add a viewcontroller on top
 */
exports.openModalWindow = function(controllername, opts) {
  return internalOpenWindow(controllername, modalWindowArgs(opts));
};

/**
 * Open a new window to the right of the mainmenu
 */
exports.openDrawerWindow = function(controllername, opts) {
  try {
    return $.showController(controllername, opts);
  } catch(E) {
    $.lib.logError(E, 'openDrawerWindow');
  }
};

function windowCloseEvent() {
  try {
    Alloy.CFG.logging && $.lib.logInfo('windowCloseEvent for ' + this.controllername, LOGTAG);
    this.windowToOpen.removeEventListener('close', windowCloseEvent); // 20150721
    var ctlr = this.controller;
    if (! ctlr) {
      $.lib.logError('No controller to cleanup in onclose.eventlistener');
    } else {
      Alloy.CFG.logging && $.lib.logInfo('Removing window via onclose.eventlistener for ' +ctlr.__controllerPath + ' hasCloseFunction=' + _.isFunction(ctlr.closeFromWindowCloseEvent), LOGTAG);// +' atIndex='+windowToOpen.atIndex, LOGTAG);
      if (_.isFunction(ctlr.closeFromWindowCloseEvent)) {
        ctlr.closeWindowByName(this.controllername, false);
      }
    }
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.windowCloseEvent');
  }
};

function addToWindowStack(windowToOpen, controller) {
  if (_.isFunction(windowToOpen.addEventListener) && controller) {
    windowToOpen.addEventListener('close', _.bind(windowCloseEvent, {windowToOpen: windowToOpen, controllername: controller.__controllerPath, controller: controller}));
  }
};


/**
 * Remove the last controller from the controller stack and make ActiveController point to the top item
 */
exports.popController = function(popevent) {
  if (Alloy.Globals.controllerstack.length > 0) {
     Alloy.Globals.controllerstack.pop(Alloy.Globals.activecontroller);
  }
  if (Alloy.Globals.controllerstack.length > 0) {
    Alloy.Globals.activecontroller = Alloy.Globals.controllerstack[Alloy.Globals.controllerstack.length - 1];
  };// else {
    //Alloy.Globals.activecontroller = $.isActive('ZCalls') ? Alloy.Globals.zcalls : undefined;
  //}
  $.logControllerStack(popevent);
};

function closeWindowArgs(controller) {
  var _closeArgs = {};
  if (OS_ANDROID) {
    if ((true === controller) || (controller.navbar && !!controller.navbar.isDetail)) {
      _closeArgs.activityEnterAnimation = Ti.Android.R.anim.slide_in_left;
      _closeArgs.activityExitAnimation = Ti.Android.R.anim.slide_out_right; //fade_out; //Ti.Android.R.anim.slide_out_right;
      _closeArgs.animated = true;
      if (Alloy.Globals.drawer) {
        if (Alloy.Globals.drawer.isLeftWindowOpen()) {
          Alloy.Globals.drawer.closeLeftWindow();
        }
      }
    }
  }
  //Alloy.CFG.logging && $.lib.logInfo('closeWindowArgs = ' + JSON.stringify(_closeArgs), LOGTAG);
  return _closeArgs;
};
exports.closeWindowArgs = closeWindowArgs;

function internalCloseController(ctlr, removeparent, stackindex, afterclose) {
  $.logControllerStack('internalCloseController.start');

  var ctlrname = ctlr.__controllerPath;
  var reassignactivecontroller = $.isActive(ctlrname);
  stackindex = _.isUndefined(stackindex) ? Alloy.Globals.controllerstack.length - 1 : stackindex;

  Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.internalCloseController closing ' + ctlrname);
  if (_.isFunction(ctlr.doCloseView)) {
    ctlr.doCloseView();
  }

  Alloy.Globals.controllerstack.splice(stackindex, 1);
  if ((true === reassignactivecontroller) && (Alloy.Globals.controllerstack.length > 0)) {
    Alloy.Globals.activecontroller = Alloy.Globals.controllerstack[Alloy.Globals.controllerstack.length - 1];
    Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.internalCloseController new activecontroller is ' + Alloy.Globals.activecontroller.__controllerPath);
  }

  if (_.isFunction(ctlr.closeFromWindowCloseEvent)) {
    Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.internalCloseController.deleting property closeFromWindowCloseEvent of ' + ctlrname);
    if (ctlr.parentwindow && _.isFunction(ctlr.parentwindow.removeEventListener)) {
      Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.internalCloseController.deleting eventListener of ' + ctlrname);
      ctlr.parentwindow.removeEventListener('close', windowCloseEvent);
    }
    delete ctlr.closeFromWindowCloseEvent;
  }

  if (ctlr.parentwindow) {
    Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.internalCloseController.parentwindow is hooked, removing mainview of ' + ctlrname);
    var closeArgs = closeWindowArgs(ctlr);
    ctlr.destroy();
    if (ctlr.mainview) {
      ctlr.parentwindow.remove(ctlr.mainview);
      ctlr.mainview = null;
    }

    if (_.isFunction(afterclose)) {
      ctlr.parentwindow.addEventListener('close', afterclose);
    }
    if (true === removeparent) {
      Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.internalCloseController.parentwindow is not fromCloseEvent, removing window of ' + ctlrname);
      ctlr.parentwindow.close(closeArgs);
      ctlr.parentwindow = null;
    }

  } else {
    Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.internalCloseController no parentwindow - destroying controller of ' + ctlrname);
    ctlr.destroy();
    if (_.isFunction(afterclose)) {
      afterclose();
    }
  }

  $.logControllerStack('internalCloseController.end');
};


exports.closeWindowByName = function(controllername, removeparent, afterclose) {
  Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.closeWindowByName ' + controllername);
  try {
    var len = Alloy.Globals.controllerstack.length - 1;
    for (var i=len; i>=0; i--) {
      if (Alloy.Globals.controllerstack[i].__controllerPath == controllername) {
        Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.closeWindowByName removing ' + controllername + ' at ' + i, LOGTAG);
        var ctlr = Alloy.Globals.controllerstack[i];
        internalCloseController(ctlr, (removeparent || false), i, afterclose);
        break;
      }
    }
  } catch(E) {
    $.lib.logError(E, 'closeWindowByName');
  }
};

exports.closeFromWindowCloseEvent = function(e) {
  //return;
  Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.closeFromWindowCloseEvent ' + $.__controllerPath);
  if (_.isFunction($.doCloseView)) {
    $.doCloseView(e);
  }
  $.popController('baseviewcontroller.closeFromWindowCloseEvent');

  if ($.parentwindow) {
    Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.close.parentwindow is hooked, closing ' + $.__controllerPath);
    $.destroy();
    if ($.mainview) {
      $.parentwindow.remove($.mainview);
      $.mainview = null;
    }
    //$.parentwindow.close();
    //$.parentwindow = null;
  } else {
    $.destroy();
  }
};

exports.close = function(e) {
  Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.close ' + $.__controllerPath);
  if (_.isFunction($.doCloseView)) {
    $.doCloseView(e);
  }
  $.popController('baseviewcontroller.close');

  if ($.parentwindow) {
    Alloy.CFG.logging && $.lib.logInfo('baseviewcontroller.close.parentwindow is hooked, closing ' + $.__controllerPath);
    var closeArgs = closeWindowArgs($);
    $.destroy();
    if ($.mainview) {
      $.parentwindow.remove($.mainview);
      $.mainview = null;
    }
    $.parentwindow.close(closeArgs);
    $.parentwindow = null;
  } else {
    $.destroy();
  }

  // Allows events after CallConnect is closed
  if (e && _.isFunction(e.onViewClosed)) {
    e.onViewClosed(e);
    //_.defer(function(){ e.onViewClosed(e); });
  }
};
exports.closeWindow = exports.close;

exports.closeToMainMenu = function(e) {
  $.close();
  $.lib.nav.showMainMenu();
};

/**
 * Show an alert in a custom dialog style
 */
exports.showAlert = function(message, iserror) {
  message = $.lib.stringify(message, 1000);
  Alloy.CFG.logging && $.lib.logInfo(message, 'alert');
  Alloy.Globals.loading.hide();
  if (iserror && !$.lib.isforeground) {
    Ti.API.error(LOGTAG + ' not showing error whilst backgrounded '+message);
    return;
  }

  // 20150804 change to modal
  // Alloy.Globals.alert.show({
    // title: /*iserror ? L('msg-error', 'Error') :*/ Ti.App.name,
    // message: message,
    // error: iserror,
    // windowopts: $.modalWindowArgs(),
  // });
  $.showConfirm({title: Ti.App.name, message: message});
};

exports.hideAlert = function() {
  Alloy.Globals.alert.hide();
};
exports.closeAlert = exports.hideAlert;

exports.showError = function(messageOrObj) {
  $.lib.showError(messageOrObj);
};

/**
 * Show a confirmation dialog, UI standards expect [CANCEL, OK] default action on right, destrutive/cancel on left
 *
 * @param {Object} opts - dictionary with String title,message Boolean iserror, buttons: [array of String] Functions onCancel, onConfirm
 * If it is a 2 button [NO,YES] there should be onCancel/onConfirm callbacks
 * If it is a 1 or 3 button [CANCEL] or [1,2,3] type there should only be onCancel callback which contains e.source.index for the clicked button
 */
var dialog = undefined;
exports.showConfirm = function(opts) {
  Alloy.Globals.loading.hide();

  // 20150804 change to modal
  // opts = opts || {};
  // opts.windowopts = $.modalWindowArgs();
  // _.defaults(opts, {
    // title: Ti.App.name,
    // error: (opts.iserror || false),
    // confirm: (opts.onConfirm || undefined),
    // callback: (opts.onCancel || opts.onCallback || undefined)
  // });
  // Alloy.Globals.alert.show(opts);

  opts.cancel = -1;
  if (_.isUndefined(opts.buttons)) {
    if (_.isFunction(opts.onConfirm)) {
      opts.buttons = [L('cancel', 'Cancel'), L('ok', 'OK')];
    } else {
      opts.buttons = [L('ok', 'OK')];
    }
  }
  opts.buttonNames = opts.buttons; //.reverse();

  if (! $.lib.isNull(dialog)) {
    try {
      if (dialog.message === opts.message) {
        return;
      }
      dialog.hide();
    } catch(E) {
      $.lib.logError(E);
    }
  }

  dialog = Ti.UI.createAlertDialog(opts);
  dialog.addEventListener('click', function(e){
    Alloy.CFG.logging && $.lib.logInfo(e, LOGTAG);
    if (((e.index > 0) || (opts.buttons.length === 0)) && _.isFunction(opts.onConfirm)) {
      opts.onConfirm(e);
    } else if (_.isFunction(opts.onCancel)) {
      opts.onCancel(e);
    } else if (_.isFunction(opts.onCallback)) {
      opts.onCallback(e);
    }
    dialog = null;
  });
  dialog.show();
};

function cancelActivityTimeout() {
  if (Alloy.Globals.activitytimeoutid) {
    try {
      clearTimeout(Alloy.Globals.activitytimeoutid);
      Alloy.Globals.activitytimeoutid = undefined;
    } catch(E) {
    }
  }
};

exports.showActivityIndicator = function(message, timeout) {
  // Never show an activity indicator more than 30 seconds, since it is a blocking window and will hang the app.
  cancelActivityTimeout();
  if (! _.isNumber(timeout)) {
    timeout = 30000;
  }
  Alloy.Globals.activitytimeoutid = setTimeout(function(){
    $.hideActivityIndicator();
  },
  timeout
  );

  Alloy.Globals.loading.show(message, false);
};

exports.hideActivityIndicator = function() {
  Alloy.Globals.loading.hide();
};

/**
 * List the exported UI elements and functions - primarily for Ti.Shadow REPL help
 * @method logChildren
 */
exports.logChildren = function(toponly, functions) {
  $.lib.debug.logControllerViews($, toponly);
  if (true === functions) {
    $.lib.debug.logControllerFunctions($);
  }
};

function logControllerStack(logtitle) {
  var windowStack = Alloy.Globals.controllerstack;
  var str = logtitle || '';
  try {
    if (Alloy.Globals.drawer) {
      str += ' drawer=true';

    }
    if (Alloy.Globals.activecontroller) {
      str += ' active=' + Alloy.Globals.activecontroller.__controllerPath;
    }
    str += ' (' + windowStack.length + ')';
    for (var i=0; i<windowStack.length; i++) {
      var idx = new Number(i);
      var title = windowStack[i].__controllerPath;
      str = str + ' ' + idx + '=' + title;
    }
    Alloy.CFG.logging && $.lib.logInfo(str, ['stack']);
  } catch(E) {
    $.lib.logError('NavigationController window out of bounds in logControllerStack ' + E.message);
  }
};
exports.logControllerStack = logControllerStack;

function sendShowNotification(opts) {
  if (! _.isEqual(opts, $.lib.nav.lastnotification)) {
    $.lib.nav.lastnotification = _.clone(_.omit(opts, ['source']));
    Alloy.CFG.logging && $.lib.logInfo('sendShowNotification ' + JSON.stringify(opts), LOGTAG);
    Ti.App.fireEvent('app:shownotification', opts);
  }
};

var notificationtimeoutid;
function cancelNotificationTimeout() {
  if (notificationtimeoutid) {
    try {
      clearTimeout(notificationtimeoutid);
      notificationtimeoutid = undefined;
    } catch(E) {
    }
  }
};

exports.hideNotification = function() {
  cancelNotificationTimeout();
  sendShowNotification({visible: false});
};

/**
 * Shows an error notification below the tab bar
 * If debugtext was added, can tap the notification for more info/bug report
 */
exports.showErrorNotification = function(E, debugtext) {
  var msg = '';
  if (_.isString(E)) {
    msg = E;
  } else if (E && E.message) {
    msg = E.message;
  }

  if (debugtext) {
    $.lib.logError(msg + ' [debug]:' + $.lib.stringify(debugtext,1000));
    if ((msg !== '') /*&& $.lib.isforeground*/) {
      $.hideActivityIndicator();
      $.showNotification({notificationtype: 'error', title: msg, vibrate: false, timeout: 8000, onClick: function(){
        if ($.lib.isbeta) {
          alert($.lib.stringify(debugtext,1000));
        }
      }});
    }
  } else {
    $.lib.logError(msg);
    if ((msg !== '') /*&& $.lib.isforeground*/) {
      $.hideActivityIndicator();
      $.showNotification({notificationtype: 'error', title: msg, vibrate: false, timeout: 8000});
    }
  }
};

/**
 * Show a popup notification bar under the navigation bar
 * A notification can have a callback on tap, and a timeout or visible: false to close it, defer: ms to delay posting
 *
 * @{Param} opts - dictionary refer NotificationBar.js
 * {notificationtype: 'balance', title: msg, vibrate: false, defer: 150, timeout: 15000, onClick: doSomething})
 */
exports.showNotification = function(opts) {
  if (_.isUndefined(opts)) { // } || $.lib.isNull(Alloy.Globals.activecontroller)) { //}|| _.isUndefined(Alloy.Globals.activeview) || (Alloy.Globals.activecontroller === null)) {
    return;
  }

  if (_.isString(opts)) {
    opts = {notificationtype: 'notification', title: opts, vibrate: false, timeout: 15000};
  }
  opts.top = undefined;

  if (_.isNumber(opts.defer)) {
    setTimeout(function(){
      opts.defer = undefined; // Prevent recursion
      $.showNotification(opts);
    },
    opts.defer
    );
    return;
  }

  cancelNotificationTimeout();
  sendShowNotification(opts);
  if (_.isNumber(opts.timeout) && (opts.timeout > 500)) {
    notificationtimeoutid = setTimeout(function(){
      $.hideNotification();
      },
      opts.timeout
    );
  }
};

exports.showPersistentNotification = function(opts) {
  opts = opts || {};
  opts['timeout'] = 999999;
  $.showNotification(opts);
};

/**
 *
 * Android backbutton closes all windows, controller.close did not because $.lib.nav is always referencing a single viewcontroller instance of nav - it gets recreated each time
 *
 * nav is the navigation namespace for handling opening / closing of windows and controllers
 *
 *  Placeholders until functions moved to lib nav
 *  @class nav
 */
var nav = {
  counter: 1,
  navWin: Alloy.Globals.navWin,
  logControllerStack: exports.logControllerStack,

  showMainMenu: exports.showMainMenu,
  showMainWindow: exports.showMainWindow,
  showController: exports.showController,
  openDrawerWindow: exports.openDrawerWindow,
  openDetailWindow: exports.openDetailWindow,
  openWindow: exports.openWindow,
  openModalWindow: exports.openModalWindow,
  closeWindowArgs: exports.closeWindowArgs,
  closeWindow: exports.closeWindow,
  closeWindowByName: exports.closeWindowByName,
  closeToMainMenu: exports.closeToMainMenu,
  close: exports.close,
  activecontrollerName: exports.activecontrollerName,
  isActive: exports.isActive,

  modalWindowArgs: exports.modalWindowArgs,
  showAlert: exports.showAlert,
  showError: exports.showError,
  hideAlert: exports.hideAlert,
  showConfirm: exports.showConfirm,

  lastnotification: {},
  hideNotification: exports.hideNotification,
  showNotification: exports.showNotification,
  showErrorNotification: exports.showErrorNotification,

  showActivityIndicator: exports.showActivityIndicator,
  hideActivityIndicator: exports.hideActivityIndicator,
};
exports.lib.nav = nav;

if (Ti.Shadow) { addSpy('baseviewcontroller', $); }