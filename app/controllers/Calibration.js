exports.baseController = 'base/baseviewcontroller';
var LOGTAG = 'calibration';

var fa = require('shared/FontAwesome');

exports.doLoadView = function() {
  return true;
};

exports.doCloseView = function() {
  return true;
};


exports.handleClose = function() {
//  $.lib.tonegen.stop();
};

function handleButtonClick(e) {
  $.lib.buttonAction(e);
}
