var args = arguments[0];
var WTools = require('WidgetTools');
var clickFn = undefined;

var IconicFont = require(WPATH('IconicFont')),
	fontawesome = new IconicFont({
		font: WPATH('FontAwesome')
	});

$.getCharMap = function(){
  return fontawesome.font.charcode || {};
};
$.setImage = function(imagepath){
  $.btn.title = '';
  $.btn.image = imagepath;
  $.btn.backgroundImage = null;
};
$.setBackgroundImage = function(imagepath){
  $.btn.title = '';
  $.btn.image = null;
  $.btn.backgroundImage = imagepath;
};
// nb. Because setX is a property "setter", the second parameter (size) gets discarded. So use applyIcon instead.
$.setIcon = function(codename, size) {
  $.applyIcon(codename, size);
};
$.applyIcon = function(codename, size) {
  if (_.isString(codename) && (codename.substr(0,2) === 'fa')) {
  	//Ti.API.info('Iconbutton.setIcon  ' + codename + ' to size ' + size);
    $.btn.applyProperties({backgroundImage: null, image: null, title: fontawesome.icon(codename)});
    if (size) {
      $.btn.font = {
        fontSize: size,
        fontFamily: fontawesome.fontfamily
      };
    }
  } else {
    var width = 25;
    if (size) {
      width = size;
    } else if (_.isNumber(args.width)) {
      width = args.width;
    } else if (_.isNumber(args.height)) {
      width = args.height;
    }
    if (args.xplatform && OS_IOS) { // iOS sizes image correctly, android does not
      $.btn.applyProperties({backgroundImage: null, title: '', image: codename, width: width, height: width});
    } else {
      var noimage = OS_ANDROID ? undefined : null;
      $.btn.applyProperties({backgroundImage: codename, title: '', image: noimage, width: width, height: width});
    }
  }
};
$.setIconColor = function(iconColor){
  $.btn.color = iconColor;
};

function initUI(){
  WTools.setTiProps(args, $.btn);
  $.init(args);
  WTools.cleanArgs(args);
}

$.init = function(argsInit){
  $.btn.font = {
    fontSize: args.size || 24,
    fontFamily: fontawesome.fontfamily
  };
  if(argsInit.iconColor) $.btn.color = args.iconColor;
  if(argsInit.icon) $.applyIcon(args.icon, args.iconSize);

	// JMH
	if(argsInit.onClick) {
	  if ($[argsInit.onClick] && _.isFunction($[argsInit.onClick])) {
	    clickFn = $[argsInit.onClick];
	    Ti.API.info('ICONBUTTON ... adding onClick handler');
	    $.btn.addEventHandler('click', clickFn);
	  }

	}
};

exports.isVisible = function() {
  return $.btn.visible ? true : false;
};

exports.show = function (){
  $.btn.show();
};

exports.hide = function (){
  $.btn.hide();
};

exports.destroy = function() {
  // JMH
  if(clickFn) {
    $.btn.removeEventHandler('click', clickFn);
  }
};

initUI();
