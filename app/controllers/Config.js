exports.baseController = 'base/baseviewcontroller';
var LOGTAG = 'config';

exports.doLoadView = function() {
  $.lib.config.load();
  $.lib.loadapi();

  _.each($.lib.api, function(value, key){
    $.lib.logInfo("key="+key);
    if ($[key] && ($[key].apiName === "Ti.UI.TextField")) {
      $[key].setValue(value);
    }
  });

  $.aboutView.addEventListener('click', handleShowWebsite);
  //$.mainview.addEventListener('close', handleClose);

  $.aboutLabel.text = Ti.App.description;
  $.visitLabel.text = Ti.App.url;
  $.copyrightLabel.text = '\u24b8' + ' ' + Ti.App.copyright + '\n' + L('allrightsreserved', 'All rights reserved.');
  $.copyrightLabel.bubbleParent = false;

  return true;
};

exports.doCloseView = function() {
  Save();
  return true;
};

function Save() {
  $.lib.logInfo('Settings: saving changes');
  $.lib.platform.iterateChildren($.notificationview, function(element){
    if (element.apiName === 'Ti.UI.TextField') {
      $.lib.logInfo(element.id + ' = ' + element.value);
      if (element.hasText() && (element.value !== "")) {
        $.lib.api[element.id.toLowerCase()] = element.value;
      } else {
        $.lib.api[element.id.toLowerCase()] = undefined;  // reset to default
      }
    }
  });
  $.lib.saveapi();
}

function handleInputReturn(e) {
  $.platform.hideKeyboard(e.source);
  //Save();
};

function handleSwitchChange(e) {
  Save();
};

function handlePresetChange(e) {
  Save();
  //  var dialog = Ti.UI.createAlertDialog({
  //   cancel: 0,
  //   title: 'Clear saved presets?',
  //   //message: '(or enter a new preset name)',
  //   //text: sequence['name'],
  //   //style: Ti.UI.iPhone.AlertDialogStyle.PLAIN_TEXT_INPUT,
  //   buttonNames: ['No', 'Clear'],
  // });
  // dialog.addEventListener('click', function(e){
  //   if (e.index === e.source.cancel) {
  //     return;
  //   }
  //
  //   Ti.App.Properties.setString('presetlist', '');
  // });
  // dialog.show();
};  

function handleSleepChange(e) {
  Save();
 };

function handleShowWebsite(e) {
  Ti.Platform.openURL(Ti.App.url);
};

function handleClose(e) {
  Save();
  $.platform.hideKeyboard($.mainview);
  $.mainview.removeEventListener('close', handleClose);
  $.aboutView.removeEventListener('click', handleShowWebsite);
  //$.destroy();
};
exports.handleClose = handleClose;

