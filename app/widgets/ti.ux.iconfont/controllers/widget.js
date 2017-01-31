var args = arguments[0] || {};
var WTools = require('WidgetTools');

var IconicFont = require(WPATH('IconicFont')),
	fontawesome = new IconicFont({
		font: WPATH('FontAwesome')
	});

function initUI(){
	WTools.setTiProps(args, $.iconLbl);
	$.init(args);
	WTools.cleanArgs(args);
}

//returns the whole map of charcodes
$.getCharMap = function(){
	return fontawesome.font.charcode || {};
};
$.setImage = function(imagepath){
  $.iconLbl.text = '';
  $.iconLbl.image = imagepath;
  $.iconLbl.backgroundImage = null;
};
$.setBackgroundImage = function(imagepath){
  $.iconLbl.text = '';
  $.iconLbl.image = null;
  $.iconLbl.backgroundImage = imagepath;
};
$.setIcon = function(codename){
  if (_.isString(codename) && (codename.substr(0,2) === 'fa')) {
    $.iconLbl.text = fontawesome.icon(codename);
    if (_.isNumber(args.iconSize)) {
      $.iconLbl.font.size = args.iconSize;
    }
    if (!_.isUndefined(args.iconBackgroundColor) && !_.isUndefined(args.iconBackgroundSize)) {
      $.iconLbl.applyProperties({
        width: args.iconBackgroundSize,
        height: args.iconBackgroundSize,
        borderRadius: Math.floor(args.iconBackgroundSize / 2),
        backgroundColor: args.iconBackgroundColor,
        textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
        verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGNMENT_CENTER,
      });
    } else {
      if (_.isNumber(args.width)) {
        $.iconLbl.width = args.width;
      }
      if (_.isNumber(args.height)) {
        $.iconLbl.height = args.height;
      }
    }
  } else {
    var width = 25;
    if (_.isNumber(args.width)) {
      width = args.width;
    } else if (_.isNumber(args.height)) {
      width = args.height;
    }
    $.iconLbl.applyProperties({backgroundImage: codename, text: '', image: null, visible: true, width: width});
  }
};
$.applyIcon = function(codename, size) {
  $.setIcon(codename);
  if (size) {
    width = size;
    $.iconLbl.applyProperties({width: width, height: width});
  }
};
$.applyIconProperties = function(newargs) {
  _.defaults(newargs, args);
  var text = newargs.icon;
  if (_.isString(newargs.icon) && (newargs.icon.substr(0,2) === 'fa')) {
    text = fontawesome.icon(newargs.icon);
  }
  if (!_.isUndefined(newargs.iconBackgroundColor) && !_.isUndefined(newargs.iconBackgroundSize)) {
    $.iconLbl.applyProperties({
      text: text,
      color: newargs.iconColor,
      font: {fontSize: newargs.iconSize, fontFamily: fontawesome.fontfamily},
      width: newargs.iconBackgroundSize,
      height: newargs.iconBackgroundSize,
      borderRadius: Math.floor(newargs.iconBackgroundSize / 2),
      backgroundColor: newargs.iconBackgroundColor,
      textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
      verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGNMENT_CENTER,
      wordWrap: false,
    });
  }
};


$.setIconColor = function(iconColor){
  $.iconLbl.color = iconColor;
};

$.init = function(argsInit){
  _.extend(args, argsInit);
	$.iconLbl.font = {
		fontSize: args.size || args.iconSize || 24,
		fontFamily: fontawesome.fontfamily
	};
	if(argsInit.iconColor) $.iconLbl.color = args.iconColor;
	if(argsInit.icon)	$.setIcon(args.icon);
  if(argsInit.textAlign) $.iconLbl.textAlign = argsInit.textAlign;
};

exports.hide = function (){
	$.iconLbl.hide();
};

initUI();