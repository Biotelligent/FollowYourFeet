exports.baseController = 'base/baseviewcontroller';
var LOGTAG = 'puppet';

$.isSticky = true;
$.args.isSticky = true;

var fa = require('shared/FontAwesome');

exports.doLoadView = function() {
  //initSequenceByName(Ti.App.Properties.getString('lastsequence', 'custom'))
    $.lib.loadapi();
    $.lib.Geo.config.callBack = onLocationChange;
    $.lib.Geo.startListening();

  return true;
};

exports.doCloseView = function() {
    $.colorSlider.value = 0;
  return true;
};

exports.handleClose = function() {
};

function onLocationChange(coords) {
    //$.lib.logInfo("onLocationChange " + $.lib.stringify(coords), LOGTAG)
    if (_.isNumber(coords.lastHeading)) {
       $.headingLabel.text = $.lib.degreesToHeading(coords.lastHeading) + String.format(" %1.1f", coords.lastHeading);
    }
}

function handleButtonClick(e) {
  $.colorSlider.value = 0;
  $.lib.buttonAction(e);
}

$.sendInterval = undefined;
$.lastInterval = 0;

function updateInterval(_pulsems) {
    $.lib.logInfo("updating interval to " + _pulsems);
    $.lastInterval = _pulsems;
    clearInterval($.sendInterval);
    $.sendInterval = setInterval(function(e){
            var action = ($.lastInterval < 0) ? 'Left' : 'Right';
            $.lib.buttonAction({source: {id: action}});
            flashButton(false);
            setTimeout(function(e){
                    flashButton(true);
                },
                150);
        },
        Math.abs(_pulsems * 1000)
    );

    // And do an immediate action
    var action = ($.lastInterval < 0) ? 'Left' : 'Right';
    $.lib.buttonAction({source: {id: action}});
    flashButton(false);
    setTimeout(function(e){
            flashButton(true);
        },
        150);
};

function flashButton(on) {
    if (Math.abs($.lastInterval) < 0.25) {
        $.colorLabel.visible = true;
        $.buttonLeft.visible = true;
        $.buttonRight.visible = true;
    } else {
        var action = ($.lastInterval < 0) ? 'Left' : 'Right';
        $['button'+action].visible = on;
        $.colorLabel.visible = on;
    }
};

function handleColorSliderChange(e) {
   if (Math.abs(e.value) < 10) {
    $.colorLabel.text = 'off';
    $.lastInterval = 0;
    clearInterval($.sendInterval);
    flashButton(true);
  } else {
    var barval = Math.round(e.value / 10);
    var pulseval = Math.abs($.lastInterval);
    switch(Math.abs(barval)) {
        case 1: pulseval = 5;
            break;
        case 2: pulseval = 4;
            break;
        case 3: pulseval = 3;
            break;
        case 4: pulseval = 2;
            break;
        case 5: pulseval = 1;
            break;
        case 6: pulseval = 0.5;
            break;
        default:
            break;
    }
    $.colorLabel.text = /*String.format("%1.0f", e.value) + " " +*/ pulseval + "s";
    if (barval < 1) {
        pulseval *= -1;
    }
    if (pulseval != $.lastInterval) {
        updateInterval(pulseval);
    }
  }
};
