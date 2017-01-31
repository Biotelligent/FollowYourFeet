/*jslint maxerr:1000 */
'use strict';

/*
* Load an API endpoint properties for direct input / testing
*
* @class TestAPIDetail
*/

exports.baseController = 'base/baseviewcontroller';
var LOGTAG = 'testapidetail';
var api;

exports.doLoadView = function() {
  api = $.args.api;
  api = 'pulse';
  
  //http://follow-your-feet.local/pulse?t=20&s=20&a=123456789abcdefedcba9876543210000000&b=0000000123456789abcdefedcba987654321
  $.lib.logInfo('TestAPIDetail opened for args.api=' + api);
	expandKeyValuePairs(api);
	return true;
};

exports.doCloseView = function() {
  return true;
};


function addKeyValuePair(listItems, dict_key, dict_obj) {
  $.lib.logInfo('Adding ' + dict_key + ' with value ' + dict_obj);
  listItems.push({
    properties: {
      itemId: dict_key,
      accessoryType: Ti.UI.LIST_ACCESSORY_TYPE_NONE,
    },
    apikeyLabel:{text: dict_key},
    apivalueText:{value: dict_obj},
  });
};

function expandKeyValuePairs(api) {
  //var dict = Alloy.Globals.feetapi.endpointDict(api);  
  //http://follow-your-feet.local/pulse?t=20&s=20&a=123456789abcdefedcba9876543210000000&b=0000000123456789abcdefedcba987654321

  var dict1 = {
  	description: 'pulse',
  	method: 'GET',
  	endpoint: 'pulse',
    data:{t:20, s:20, a:"123456789abcdefedcba9876543210000000", b: "0000000123456789abcdefedcba987654321"},
  }; 
  
  var dict = {
  	description: 'pulse',
  	method: 'GET',
  	endpoint: 'pulse',
    data:{t:20, s:10000, a:"f"},
  }; 
  //http://192.168.0.124/pulse?t=20&s=10000&a=f
  if (! _.isEmpty(dict)) {
    $.headerLabel.text = dict.description;
    $.headerGoButton.title = dict.method;
    $.responseArea.value = _.isUndefined(dict.expect) ? '' : JSON.stringify(dict.expect);

    var apiItems = [];
    addKeyValuePair(apiItems, 'endpoint', dict.endpoint);
    _.each(dict.data, function(dict_obj, dict_key) {
      addKeyValuePair(apiItems, dict_key, dict_obj);
    });
    $.section.setItems(apiItems);
  }
};
exports.expandKeyValuePairs = expandKeyValuePairs;

/**
 * Keep a reference to the textfield value as the user types, because the list item array doesn't store the value
 *
 */
function internalTFUpdate(e){
  try {
    var item = e.section.items[e.itemIndex];
    item[e.bindId].value = e.value;
    e.section.updateItemAt(e.itemIndex, item);
  } catch(E) {
    $.lib.logError(E);
  }
};
var throttledTFUpdate = _.throttle(internalTFUpdate, 100, {leading: true, trailing: true});
function TFUpdate(e) {
  throttledTFUpdate(e);
};

/**
 * Expand the lookup items (normally guids)
 * @param {Object} e
 */
function onListViewItemclick(e) {

	// We've set the items special itemId-property to the controller name
	var controllerName = e.itemId;

	// Which we use to create the controller, get the window and open it in the navigation window
	// See lib/xp.ui.js to see how we emulate this component for Android
	//$.navWin.openWindow(Alloy.createController(controllerName).getView());
}

function handleAPISuccess(e) {
  $.lib.nav.hideActivityIndicator();
  $.responseArea.value = 'SUCCESS\n' + JSON.stringify(e);
};

function handleAPIError(e) {
  $.lib.nav.hideActivityIndicator();
  $.responseArea.value = 'ERROR\n' + JSON.stringify(e);
};

function handleGoClick(e) {
  var section = $.section;
  var opts = {}; //Alloy.Globals.feetapi.endpointDict(api);
  var item = section.getItemAt(0);
  //$.lib.logInfo(item);
  opts.endpoint = 'pulse'; // item.apivalueText.value;
  opts.data = {};

  for (var i = 1; i < section.items.length; i++) {
    item = section.getItemAt(i);
    //$.lib.logInfo(item);
    opts.data[item.apikeyLabel.text] = item.apivalueText.value;
  }
  $.lib.logInfo(opts.data);

  $.lib.nav.showActivityIndicator();
  $.lib.apiCall(opts.endpoint, handleAPISuccess, handleAPIError, opts);
};

if (Ti.Shadow) {
  addSpy(LOGTAG, $);
}
