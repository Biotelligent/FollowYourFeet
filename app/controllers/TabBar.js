/**
 * Metro style tab bar
 * Require this in your views with <Require src="TabBar" type="view" id="tabbar" />
 *
 * @class TabBar
 */
$.args = arguments[0] || {};
$.lib = Alloy.Globals.lib;
$.tabbarloaded = false; // Tag marked when the instance doLoadView is called. Allows custom call from owner.baseStartLoading

//$.nav = Alloy.Globals.nav;

var TabControl = require('/shared/TabControl');
var tabwindows = [];
var currenttab = -1;
var tabControl;

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
    $.infoContainer.applyProperties({left: null, right: 70});
  }
  return true;
};

exports.doCloseView = function() {
  if (tabControl) {
    tabControl.removeEventListener('tabClick', onTabClick);
    $.tabbar.remove(tabControl);
    tabControl = null;
  }
  return true;
};

function showSearchBar(show) {
  if (show) {
    $.searchView.applyProperties({visible: true});
  } else {
    $.searchView.applyProperties({visible: false});
    $.searchText.value = '';
    $.searchText.blur();
  }
  if (_.isFunction($.args.onSearchStateChange)) {
    $.args.onSearchStateChange({visible: show});
  }
};
exports.showSearchBar = showSearchBar;

function isSearchVisible() {
  return $.searchView.visible;
};
exports.isSearchVisible = isSearchVisible;

function searchtext() {
  if ($.searchView.visible && $.searchText.hasText()) {
    return $.searchText.value;
  } else {
    return '';
  }
};
exports.searchtext = searchtext;

function refilterSearch(e) {
  $.lib.logInfo('searchText=' + searchtext(), LOGTAG);
};
var throttledRefilterSearch = _.throttle(refilterSearch, 250, {leading: false, trailing: true});
function doSearchTextChange(e) {
  throttledRefilterSearch();
};

function cancelClick(e){
  showSearchBar(false);
};
var debouncedCancelClick = _.debounce(cancelClick, 350, true);
function doCancelSearchClick(e) {
  debouncedCancelClick(e);
};

function doCancelSearchClick(e) {
  debouncedCancelClick(e);
};

function doClearSearchClick(e) {
  $.searchText.value = '';
  $.searchText.focus();
};

function doSearchTextReturn(e) {
   $.searchText.blur();
};

exports.currentTab = function() {
  try {
    return tabControl.currentTab();
  } catch(E) {
    $.lib.logError(E, 'TabBar.currentTab');
    return undefined;
  }
};

exports.selectTab = function(index) {
  tabControl.selectTab(index);
};

exports.index = function() {
  var idx = -1;
  try {
    if (tabControl) {
      idx = tabControl.currentTab().index;
    }
  } catch(E) {
    $.lib.logError(E, 'TabBar.index');
  }
  return idx;
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
  // eg. tabwindows.push({title: 'Messages', controller: 'chatwin'})
  // Add any child controls that were in the require tag
  // <Require src="TabBar" type="view" id="tabbar">
  //    <Button title="left button">
  //  </Require>

	 //_.each($.args.children || [], function(child) {
	 //  tabwindows.push(child);
	 //});
   if (args.search === true) {
     tabwindows.push({backgroundImage: '/images/tab_search_selected.png'});
   }

   // tabwindows.push({backgroundImage: '/images/tab_contacts_selected.png'});
   // if ($.lib.appsettings.enableZChat) {
     // tabwindows.push({backgroundImage: '/images/tab_groups_selected.png'});
   // }
   // if ($.lib.appsettings.enableCallLog) { // && ! args.isSMSDialog) {
     // tabwindows.push({backgroundImage: '/images/tab_recents_selected.png'});
   // }
   // tabwindows.push({backgroundImage: '/images/tab_favourites_selected.png'});
   // if (! args.isSMSDialog) {
     // tabwindows.push({backgroundImage: '/images/tab_numpad_selected.png'});
   // }
  tabwindows.push({title: "\uf1da"}); // history
  tabwindows.push({title: "\uf007"}); // user
  tabwindows.push({title: "\uf095"}); // phone
  tabwindows.push({title: "\uf0c0"}); // users
  var tabfont = Alloy.CFG.iconButtonFont;
  var tabselectedfont = Alloy.CFG.iconButtonFont;

  var tabcount = tabwindows.length;
  var tabwidth = Math.floor($.lib.platform.workingWidth / tabcount);

  // Specifics
  var tabheight = args.tabheight || 60;
  var contentheight = args.contentheight || tabheight - 5;
  var iconsize = args.iconsize || 24;
  var tabcueabove = true;
  var opacity = args.opacity || 1.0;

  //Create our tab control settings
  var tabSettings = {
    backgroundColor: Alloy.CFG.backgroundColorBlue,
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
      selectedBackgroundColor: Alloy.CFG.tabColorSelected,
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
    //tabs.push({Tab: _.extend(_.clone(tabSettings.tabProperties), {icon: tabwindows[i].backgroundImage}), Label: _.extend(_.clone(tabSettings.labelProperties), {text: tabwindows[i].title, _backgroundImage: tabwindows[i].backgroundImage}) });
    tabs.push({Tab: _.clone(tabSettings.tabProperties), Label: _.extend(_.clone(tabSettings.labelProperties), {text: tabwindows[i].title, height: Ti.UI.FILL}) });
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