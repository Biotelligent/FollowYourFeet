/*
* Bootstrap:
*   start mainmenu if verified
*   OR
*   redirect to signup on first/invalid install
*
* @class index
*/
Ti.API.info('Initialising index.js');

exports.baseController = 'base/baseviewcontroller'; // Required to setup $.lib.nav
var LOGTAG = 'index';
$.lib = Alloy.Globals.lib;
$.lib.config.load();
$.lib.nav.showMainWindow();
