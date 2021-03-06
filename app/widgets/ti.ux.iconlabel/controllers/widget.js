
var args = arguments[0];
var WTools = require('WidgetTools');

WTools.setTiProps(args, $.viewContainer);


function initUI(){
	$.setText(args.text);
	$.setIcon(args.icon);
	if(args.color) $.setColor(args.color);
	if(args.iconColor) $.setIconColor(args.iconColor); 
}

$.setText = function(str){
	$.label.text = str || '';
};

$.setColor = function(color){
	$.label.color = color;
	$.icon.getView().color = color;
};

// JMH
$.setIconColor = function(iconcolor){
  $.icon.getView().color = iconcolor;
};

$.setIcon = function(iconcode){
	$.icon.setIcon(iconcode);
};

initUI();

WTools.cleanArgs(args);