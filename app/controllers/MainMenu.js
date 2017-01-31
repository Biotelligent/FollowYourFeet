/**
 * Main menu. We were adding the items here rather than in the XML to use fa.icons
 *
 var settingsItems = [ {properties: { itemId:"About" }, menuicon: {text: fa.commentO}, title:{text: "About"}, subtitle:{text:"About this app"} } ];
 $.settingssection.setItems(settingsItems);
 */
// TODO: Z 150120 Zoopa Menu UI - selection band, deselected icons, colors
exports.baseController = 'base/baseviewcontroller';
var moment = require('/alloy/moment');

function enableMenuItem(index, enabled) {
};
exports.enableMenuItem = enableMenuItem;

/**
 * Update the user header in response to any profile or settings change
 */
function updateHeader() {
  return;
};

/**
 * Update the visual style for a de/selected menu item
 */
function showItemSelected(section, index, selected) {
  var item = section.getItemAt(index);
  //item.template = (true === selected) ? 'menuSelectedTemplate' : 'menuDeselectedTemplate';
  //item.selectedview.visible = selected;
  //item.subview.opacity = (true === selected) ? 1.0 : 0.85;
  section.updateItemAt(index, item);
};

/**
 * Update the visual style for a de/selected contact
 */
function toggleSelectedMenuItem(section, index) {
  for (var i = 0; i < section.items.length; i++) {
    showItemSelected(section, i, (i == index));
  }
};

/**
 * Return the listitem index for selection/addition/removal of appsettings or visual changes
 */
function selectMenuItemByName(controllername) {
  var menuitem = menuitemByName(controllername);
  if (menuitem) {
    toggleSelectedMenuItem(menuitem.section, menuitem.index);
  }
};
exports.selectMenuItemByName = selectMenuItemByName;

function closeSideMenu() {
  if (Alloy.Globals.drawer && Alloy.Globals.drawer.isLeftWindowOpen()) {
    Alloy.Globals.drawer.closeLeftWindow();
  }
};

function openAsDetailWindow(controller, args) {
  $.lib.nav.openDetailWindow(controller, args);
  setTimeout(function(){
    //closeSideMenu();
    if (Alloy.Globals.drawer) {
      Alloy.Globals.drawer.closeLeftWindow();
    }

  },
  1500);
};

function listitemClick(e) {
  Alloy.CFG.logging && $.lib.logInfo('List click on e.itemIndex=' + e.itemIndex + ' e.itemId=' + e.itemId);
  var item = e.section.getItemAt(e.itemIndex);
  e.cancelBubble = true;
  if (e.source) {
    e.source.cancelBubble = true;
  }

  if (e.section == $.menusection) {
    toggleSelectedMenuItem(e.section, e.itemIndex);
  }
  if (e.itemId !== 'none') {
    if (item.properties.detail) {
      openAsDetailWindow(e.itemId, item.properties.opts);
    } else {
      $.openDrawerWindow(e.itemId, item.properties.opts);
    }
  }
};
var debouncedListClick = _.debounce(listitemClick, 450, true);
function handleItemClick(e) {
  debouncedListClick(e);
};

/**
 * Title is like navbar - close the sidemenu
 * @param {Object} e
 */
function doTitleClick(e) {
  closeSideMenu();
};


/**
 * About screen
 * @param {Object} e
 */
function doHelpClick(e) {
  //$.lib.nav.openDrawerWindow('HelpMenu');
  openAsDetailWindow('HelpMenu');
};

/**
 * Logout
 * @param {Object} e
 */
function doLogoutClick(e) {
  //openAsDetailWindow('SignIn');
};

if (OS_ANDROID) {
  $.mainview.width = Ti.UI.FILL;
}

if (Ti.Shadow) { addSpy('mainmenu', $); } // Because we were not created via baseStartLoading
