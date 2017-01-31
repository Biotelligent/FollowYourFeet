/**
 * Metro style tab bar
 * Require this in your views with <Require src="TabBar" type="view" id="tabbar" />
 *
 * @class TabBar (TestTabBar)
 */
$.args = arguments[0] || {};
$.lib = Alloy.Globals.lib;
$.tabbarloaded = false; // Tag marked when the instance viewWillLoad is called. Allows custom call from owner.baseStartLoading

//$.nav = Alloy.Globals.nav;

var TabControl = require('/shared/TabControl');
var tabwindows = [];
var currenttab = -1;

/**
 * doLoadView is called as the owner view loads, and navbar specific arguments (detail, drawer etc) are passed in here
 *
 * @method doLoadView
 * @param {Object} widget - settings dictionary for the widget
 */
exports.doLoadView = function(widgetargs) {
  if (false === $.tabbarloaded) {
    try {
      $.tabbarloaded = true;
      _.extend($.args, widgetargs);
      createTabControl($.args);
    } catch(E) {
      $.lib.logError(E, 'tabbar.doLoadView');
    }
  }
  return true;
};

exports.doCloseView = function(widgetargs) {
  if (tabControl) {
    tabControl.removeEventListener('tabClick', onTabClick);
    $.tabbar.remove(tabControl);
    tabControl = null;
  }
  return true;
};

exports.currentTab = function() {
  try {
    return tabControl.currentTab();
  } catch(E) {
    $.lib.logError(E, 'TabBar.currentTab');
    return undefined;
  }
};

exports.index = function() {
  try {
    return tabControl.currentTab().index;
  } catch(E) {
    $.lib.logError(E, 'TabBar.index');
    return -1;
  }
};

function onTabClick(e) {
  if (_.isNumber(e.index)) {
    // BUTTON STYLE - let the parent check whether the tabclick matches the currently selected tab
    var tabnumber = e.index;
    if (tabwindows[tabnumber].action && _.isFunction($[tabwindows[tabnumber].action])) {
      tabwindows[tabnumber].action();
    } else if (tabwindows[tabnumber].controller) {
      $.nav.showController(tabwindows[tabnumber].controller);
    } else if (_.isFunction($.args.onTabClick)) {
      $.args.onTabClick(e);
    } else {
      Alloy.CFG.logging && $.lib.logInfo('onTabClick ' + e.index, ['nav']);
    }
  }
};

function createTabControl(args) {
  if (_.isArray(args.tabs)) {
    alert('createTabControl: args.tabs not implemented');
  }

  // tab options
  // - controller a view to open
  // - action - a function to callback
  // - title - name
  // - backgroundImage: '/images/tab_groups_selected.png'}
  // eg. tabwindows.push({title: 'Messages', controller: 'chatwin'})
  // Add any child controls that were in the require tag
  // <Require src="TabBar" type="view" id="tabbar">
  //    <Button title="left button">
  //  </Require>

	 //_.each($.args.children || [], function(child) {
	 //  tabwindows.push(child);
	 //});
   tabwindows.push({title: L('tab-debugconfig', 'Config')});
   tabwindows.push({title: L('tab-debuglog', 'Log')});
   tabwindows.push({title: L('tab-debugbackground', 'Act')});
   tabwindows.push({title: L('tab-debugplatform', 'Net')});
   tabwindows.push({title: L('tab-debugsip', 'SIP')});
   tabwindows.push({title: L('tab-testmenu', 'Test')});

  var tabcount = tabwindows.length;
  var tabwidth = Math.floor($.lib.platform.workingWidth / tabcount);

  var tabheight = args.tabheight || 30;
  var contentheight = args.contentheight || tabheight - 5;
  var iconsize = args.iconsize || 24;
  var tabfont = args.tabfont || Alloy.CFG.Skin.tabFont; // {fontSize: 9, fontWeight: 'normal', fontFamily: 'Helvetica Neue' };
  var tabselectedfont = args.tabselectedfont || Alloy.CFG.Skin.tabSelectedFont; // {fontSize: 12, fontWeight: 'normal', fontFamily: 'Helvetica Neue' };
  var tabcueabove = false;
  var opacity = args.opacity || 1.0;

  //Create our tab control settings
  var tabSettings = {
    backgroundColor: 'transparent',
    tintColor: 'white',
    horizontalBounce:false,
    contentHeight: contentheight,
    height: tabheight,
    selectedCue : {
      cueAtTop: tabcueabove,
      selectedBackgroundColor: 'white',
      defaultBackgroundColor:'transparent',
      size: '5%',
    },
    opacity: opacity,
    tabProperties: { left: 1, height: tabheight, width: tabwidth, iconSize: iconsize, backgroundColor: 'transparent' },
    labelProperties: {
      backgroundColor: 'transparent',
      color: 'white',
      font: tabfont,
      selectedFont: tabselectedfont,
      wordWrap: true,
      // For icon
      //height: Ti.UI.FILL,
      bottom: 0,
      verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGN_BOTTOM,
    },
  };
  // _.extend(tabSettings, args.tabSettings);

  //Define our buttons
  var i, tabs = [];
  for (i=0; i < tabcount; i++) {
    tabs.push({Tab: _.extend(_.clone(tabSettings.tabProperties), {icon: tabwindows[i].backgroundImage}), Label: _.extend(_.clone(tabSettings.labelProperties), {text: tabwindows[i].title, _backgroundImage: tabwindows[i].backgroundImage}) });
  }

  //Create our tab control
  tabControl = TabControl.createTabStrip(tabSettings, tabs);
  tabControl.zIndex = 99;
  tabControl.visible = true;
  if (args.tabindex) {
    tabControl.selectTab(args.tabindex);
  }
  $.tabbar.add(tabControl);
  $.tabbar.visible = true;
  $.tabbar.zIndex = 99;

  //Listen for which tab has been clicked
  tabControl.addEventListener('tabClick', onTabClick);
};

function recreateTabControl() {
  // For Ti.Shadow testing of relayout etc by injection of args
  $.doCloseView();
  createTabControl($.args);
};
exports.recreateTabControl = recreateTabControl;

if (Ti.Shadow) { addSpy('tabbar', $); }