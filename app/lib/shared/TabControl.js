/*jslint maxerr:1000 */

/**
*
* tabcontrol.js: Cross-platform metro style tab control
* Copyright: 2013 Benjamin Bahrenburg (http://bencoding.com)
* License: http://www.apache.org/licenses/LICENSE-2.0.html
*
* Extensions for icon & cues: jholloway@biotelligent.co.uk
*/

var _isAndroid = Ti.Platform.osname === 'android';

// ----------------------------------------------
//
//	Default Configuration Option
//
// ----------------------------------------------

var STRIP_DEFAULTS = {
	backgroundColor:'#999',
	contentWidth:500,
	contentHeight:55,
	height:65,
	width: Ti.UI.FILL,
	verticalBounce:false,
  //horizontalBounce:false,
	currentPage : 0,
	scrollType : 'horizontal',
	scrollingEnabled: false,
};

var TAB_DEFAULTS = {
	height:65,
	width:50,
	iconSize: 32,
	backgroundColor:STRIP_DEFAULTS.backgroundColor
};

var LABEL_DEFAULTS = {
	height:'auto',
	textAlign:'center',
	verticalAlign: Ti.UI.TEXT_VERTICAL_ALIGNMENT_CENTER,
	width:Ti.UI.FILL,
	color:'#000'
};

var CUE_DEFAULTS = {
  cueAtTop: true,
	selectedBackgroundColor:'blue',
	backgroundColor:'transparent',
	size: '10%'
};

// ----------------------------------------------
//
//	Internal Methods
//
// ----------------------------------------------

//Extend an object with the properties from another
//(thanks Dojo - http://docs.dojocampus.org/dojo/mixin)
function mixin(/*Object*/ target, /*Object*/ source){
	var name, s, i,empty = {};
	for(name in source){
		s = source[name];
		if(!(name in target) || (target[name] !== s && (!(name in empty) || empty[name] !== s))){
			target[name] = s;
		}
	}
	return target; // Object
};

//Check if there is number
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

//Return zero if not found or null
function zeroIfEmptyUndefinedOrNull(value){
	if((value === null) || (value === undefined)){
		return 0;
	}else{
		return value;
	}
};

//Calculate the Percentage that is left
//from the provided value
function remainderPercentage(value){
	value = value +''; //Force to be a string
	var base = value.replace('%','').trim();
	if(!isNumber(base)){
		return value;
	}

	return ((100 - parseFloat(base)) + '%');
};

// Convert 90% to 0.9
function percentMultiplier(value){
  try {
    var base = value.replace('%','').trim();
    return (+base / 100);
  } catch(E) {
    return 1.0;
  }
};


function createTabView(scrollView,selectedCue,index,startPoint,tabSettings){
  // The actual tab
	var tabParams = mixin(TAB_DEFAULTS,tabSettings.Tab);
	//Force the left to be a specific value
	tabParams.left = startPoint;
	//Build our view
	var view = Ti.UI.createView(tabParams);
	view.name = 'tabview';
	//Add specific properties
	view.index = index;
	view.layout = "vertical"; //Force vertical layout
	//Add the Label node, for use later
	view.Label = mixin(LABEL_DEFAULTS,tabSettings.Label);

	//View used for Selected Visual Cue
	var accent = Ti.UI.createView({
		height: selectedCue.size, width:Ti.UI.FILL, backgroundColor:'transparent', name:'accent'
	});
	if (selectedCue.cueAtTop) {
    view.add(accent);
	}

	//Our main section container
	var section = Ti.UI.createView({
		height:remainderPercentage(selectedCue.size), width:Ti.UI.FILL, backgroundColor:'transparent', name:'section'
	});
	view.add(section);

	if (tabParams.icon) {
	  try {
	    var icontop = isNumber(section.height) ? (Math.round(section.height - tabParams.iconSize) / 2) : (Math.round(percentMultiplier(section.height)*view.height - tabParams.iconSize) / 2);
	    var iconleft = Math.round((tabParams.width - tabParams.iconSize) / 2);
	  } catch(E) {
	    icontop = 0;
	    iconleft = 0;
	    Ti.API.error(E.message);
	  }

	  var icon = Ti.UI.createImageView({_backgroundColor: 'black', top: icontop, height: tabParams.iconSize, width: tabParams.iconSize, left: iconleft, image: tabParams.icon});
	  view.Icon = icon;
	  section.add(icon);
	}

	//Tab Text
	var label = Ti.UI.createLabel(mixin(LABEL_DEFAULTS,tabSettings.Label));
	view.TabLabel = label;
	label.name = "tab_label";
	section.add(label);

	//If provided select without the default, use the platform created one
	if((view.Label.hasOwnProperty("selectedFont")) && (!view.Label.hasOwnProperty("font"))){
		view.Label.font = label.font;
	}
  if (!selectedCue.cueAtTop) {
    view.add(accent);
  }
  view.Accent = accent;


	//Add event handler to be fired on click
	view.addEventListener('click',function(e){
	  if (e.source) {
	    e.source.cancelBubble = true;
	  }
	  e.cancelBubble = true;

		//Set selected to new index
		scrollView.selectTab(index);
		//Fire event
		scrollView.fireEvent('tabClick',{index:index, source:view});
	});

	return view;
};

function assembleTabs(scrollView,tabs,selectedCue){
	var totalLength = 0;
	var leftOffsetCount = 0;
	var tabLength = tabs.length;

	//Loop through all tabs and add them to our scrollview
	for (var iLoop = 0; iLoop < tabLength; iLoop++) {
		//Determine how far left we need to be
		leftOffsetCount=(zeroIfEmptyUndefinedOrNull(tabs[iLoop].Tab.left) + totalLength);
		//Create a tab and add to scrollview
		scrollView.add(createTabView(scrollView,selectedCue,iLoop,leftOffsetCount,tabs[iLoop]));
		//Track our total length
		totalLength=(leftOffsetCount + zeroIfEmptyUndefinedOrNull(tabs[iLoop].Tab.width));
	}

	//Set the total contextWidth as it has been calculated
	scrollView.contentWidth = totalLength;
	//Return completed ScrollView
	return scrollView;
};

// ----------------------------------------------
//
//	Public Methods
//
// ----------------------------------------------

exports.createTabStrip=function(settings,tabs){
	//Determine our UI Cue's
	var selectedCue = mixin(CUE_DEFAULTS,settings.selectedCue);
	var tabParams = mixin(STRIP_DEFAULTS, settings);
	var scrollView = Ti.UI.createScrollView(tabParams);
	var priorIndex = null;

	//Provide access to the Current Page (index)
	scrollView.currentPage = tabParams.currentPage;

	function showSelection(_tab, _isSelected) {
      _tab.Accent.backgroundColor = _isSelected ? selectedCue.selectedBackgroundColor : selectedCue.backgroundColor;
      if (_tab.Icon) _tab.Icon.opacity = _isSelected ? 1.0 : 0.5;
      //if (_tab.Label) _tab.Label.opacity = _isSelected ? 1.0 : 0.8;
      if((_tab.Label.hasOwnProperty("selectedFont")) && (_tab.Label.hasOwnProperty("font"))){
         _tab.TabLabel.font = _isSelected ? _tab.Label.selectedFont : _tab.Label.font;
      }
      if((_tab.Label.hasOwnProperty("selectedFont")) && (_tab.Label.hasOwnProperty("font"))){
         _tab.TabLabel.font = _isSelected ? _tab.Label.selectedFont : _tab.Label.font;
      }
      if(_tab.Label.hasOwnProperty("selectedBackgroundColor")){
         _tab.TabLabel.backgroundColor = _isSelected ? _tab.Label.selectedBackgroundColor : 'transparent';
      }
	};

	//Reset all of the tab's to basic type
	function resetAllTabStyles(){
	 	var iLength = scrollView.children.length;
 		for (var iLoop = 0; iLoop < iLength; iLoop++) {
 		  showSelection(scrollView.children[iLoop], false);
 		}
	};
	//Helper method to reset all styles
	scrollView.resetAllTabStyles = resetAllTabStyles;

	// JMH - Adjust all tabwidths to the new parent width
	function reLayout(parentwidth) {
	  if (undefined === parentwidth) {
	    var parentwidth = Ti.Platform.displayCaps.platformWidth;
	    OS_ANDROID && (parentwidth /= Ti.Platform.displayCaps.logicalDensityFactor);
	  }
    scrollView.width = parentwidth;
	  scrollView.contentWidth = parentwidth;
	  var tabwidth = Math.floor(parentwidth / tabs.length);
    var iLength = scrollView.children.length;
    for (var iLoop = 0; iLoop < iLength; iLoop++) {
      scrollView.children[iLoop].applyProperties({left: iLoop*tabwidth, width: tabwidth});
    }
	};
	scrollView.reLayout = reLayout;

	//Select a Tab by its index
	function selectTab(index){
		resetAllTabStyles();
	 	var iLength = scrollView.children.length;
 		for (var iLoop = 0; iLoop < iLength; iLoop++) {

 			if(scrollView.children[iLoop].index === index){
        showSelection(scrollView.children[iLoop], true);
 			}
 		}
 		//Update the current Page (index) helper
 		scrollView.currentPage = index;
 		scrollView.fireEvent('indexChanged',{index:index, oldIndex:priorIndex, source:currentTab()});

 		if(priorIndex !== index){
 			priorIndex = index;
 		}
	};
	//Helper Method to select a tab
	scrollView.selectTab = selectTab;

  //Add helper method to return current Tab
	function currentTab(){
	 	var result = null;
	 	var iLength = (scrollView.children && scrollView.children.length) ? scrollView.children.length : 0;
 		for (var iLoop = 0; iLoop < iLength; iLoop++) {
 			if(scrollView.children[iLoop].index === scrollView.currentPage){
 				result = scrollView.children[iLoop];
 			}
 		}
 		return result;
	};
  scrollView.currentTab = currentTab;

  function tabAt(tabindex){
    var result = null;
    var iLength = scrollView.children.length;
    for (var iLoop = 0; iLoop < iLength; iLoop++) {
      if(scrollView.children[iLoop].index === tabindex){
        result = scrollView.children[iLoop];
      }
    }
    return result;
  };
  scrollView.tabAt = tabAt;


	//Assemble our tabs
	scrollView = assembleTabs(scrollView,tabs,selectedCue);

	//Set the default page
	scrollView.selectTab(scrollView.currentPage);
	//Return our scrollview
	return scrollView;
};

