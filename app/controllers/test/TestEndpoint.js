"use strict";
exports.baseController = 'base/baseviewcontroller';
var zplatform = Alloy.Globals.libzplatform;

exports.doLoadView = function(e) {
  return true;
};

exports.doCloseView = function(e) {
  return true;
};


function showalert(res, ok) {
  Alloy.Globals.loading.hide();  
  Alloy.Globals.alert.show({
    title: "Zoopacall",
    message: 'GUI check api call ' + ok + '\n' + JSON.stringify(res)
  });
 return;
};

function doLoginSuccess(res) {
  showalert(res, 'success');
};

function doLoginFailure(res) {
  showalert(res, 'failed');
};

function login() {
  Alloy.Globals.loading.show("Loading...", false);
  //setTimeout(function() { 
    //Alloy.Globals.zplatform.apiCall('accounts', _.defer(function(){doLoginSuccess();}), _.defer(function(){doLoginFailure();}) );
  //}, 2000);
  Alloy.Globals.zplatform.apiCall('accounts', doLoginSuccess, doLoginFailure);
};
exports.login = login;
