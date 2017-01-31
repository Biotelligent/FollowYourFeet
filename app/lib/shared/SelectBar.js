var TU = null;

/**
 * Provides a cross-platform "tabbed bar" selection view; on iOS, uses the TabbedBar,
 * and on Android, uses a series of Switch views.  Fires the "indexclick" event (note that this
 * is not the "change" event; see below)
 * 
 * var sb = TU.UI.createSelectBar ({
 * 		labels: ['foo', 'bar', 'baz']
 *      allow_deselect: true,
 *      allow_reselect: false, // mutually exclusive w/ allow_deselect
 * });
 * 
 * sb.addEventListener ('indexclick', function (e) {
 * 	   Ti.API.debug ('new index: ' + e.index);
 * });
 *
 * sb.xsetSelectedIndex (1);
 * 
 * ...
 * 
 * var selection = sb.xgetSelectedIndex ();
 * 
 * NOTE:
 * We use "indexclick" as the event rather than "change" because on Android, "change" events from
 * the Switches themselves on Android would be sent to the eventListener for the SelectBar's
 * change event; not sure why that's happening.  You would have to filter those out in your event
 * listener if we used "change", so to keep it simpler, we use "indexclick".
 * 
 * NOTE:
 * The width of the control must be divisble evenly by the number of labels; otherwise, Titanium
 * will miscalculate the width of the switch views in android, and the switches will not fit
 * inside the parent view. 
 * 
 * @param {Object} params
 */
function SelectBar(params)
{
	var _labels = [];
	var _buttons = [];
	var _self = null;
	var _enabled = true;

  var platformName = Ti.Platform.osname;
  var android = (platformName == 'android') ? true : false;
  var ios = ((platformName == 'iphone') || (platformName == 'ipad')) ? true : false;	
	var _allow_deselect = false;
  var _allow_reselect = false;
	
	var _current_idx = -1;
	
	var onswitchclick = function (e) 
	{
		// Ugh: getValue() doesn't work here -- just use the property directly...
		var btn_val = e.source.value;

		var btn_idx = -1;
		for (var j = 0; j < _buttons.length; j++)
		{
			if (_buttons[j] == e.source)
			{
				btn_idx = j;
				break;
			}
		}
		
		if (btn_idx == -1)
		{
			// this should never happen - punt
			return;
		}
		
		var new_idx = btn_idx;
		if (btn_val)
		{
			if (btn_idx != _current_idx)
			{
				// if we've got a new index, turn off the last button
				if (_current_idx != -1)
				{
					_buttons[_current_idx].setValue (false);
				}
			}
		}
		else
		{
			if (_allow_deselect)
			{
				new_idx = -1;
			}
			else
			{
				e.source.setValue(true);
			}
		}
		
		if  ((_allow_reselect) || (new_idx != _current_idx))
		{
			_current_idx = new_idx;
			_self.fireEvent ('indexclick', { index: _current_idx });
		}
	};

	var _init = function (params)
	{
		if (typeof params.labels == 'undefined')
		{
		  Ti.API.error('labels must be passed in the selectbar create parameters');
			return null;	
		}
		if (typeof params.labels == 'string') { // Alloy XML
		  params.labels = params.labels.split(',');
		};
		_labels = params.labels;
		
		if (typeof params.allow_deselect != 'undefined')
		{
			_allow_deselect = !!params.allow_deselect;
			delete params.allow_deselect;
		}
    if (typeof params.allow_reselect != 'undefined')
    {
      _allow_reselect = !!params.allow_reselect;
      delete params.allow_reselect;
    }
	
		if (typeof params.height == 'undefined')
		{
			params.height = Ti.UI.SIZE;
		}
		
		if (ios)
		{
			if (typeof params.style == 'undefined')
			{
				 params.style = Titanium.UI.iPhone.SystemButtonStyle.BAR;
			}
			
			_self = Ti.UI.iOS.createTabbedBar(params);

			var gotclickevent = false;
			var lastclicktime = +new Date();
			var newtapindex = -2;
			var timeoutid = -1;
			
      _self.addEventListener ('click', function (e) {
        // Can occur before or after the tap event
        //Ti.API.info('click ' + ' _current_idx=' + _current_idx + ' e.index=' + e.index);
        if (timeoutid !== -1) {
          clearTimeout(timeoutid);
        }
        
        _self.fireEvent ('indexclick', { index: e.index } ); // _self.xgetSelectedIndex () });
        _current_idx = e.index;
        
        gotclickevent = true;         
        lastclicktime = +new Date(); 
      });       
			
			_self.delayedTap = function(tapindex) {
			  // Process the 'tap' event if a click hasn't occurred 500 seconds either side         
        if (tapindex === -1) {
          _self.setIndex (null);
        }
        _current_idx = tapindex;
        _self.fireEvent ('indexclick', { index: tapindex });			  
			};
			
			if (_allow_deselect || _allow_reselect)
			{
				// @HACK: we're taking advantage of the fact that the click event seems
				// to fire before the singletap event on iOS; if we see a singletap
				// without a corresponding click event, we know that the user is
				// tapping a previously-selected button; therefore we can deselect it.
				_self.addEventListener ('singletap', function (e) {
				  var newindex = (undefined === e.source.index) || (null === e.source.index) ? -1 : e.source.index;
				  var isSameIndex = (newindex === _current_idx) ? true : false;
				  var mselapsed = +new Date() - lastclicktime;				  
				  
          //Ti.API.info('singletap: ' + mselapsed + ' isSameIndex=' + isSameIndex + ' _current_idx=' + _current_idx + ' newindex=' + newindex + ' ' + JSON.stringify(e));
				  if (gotclickevent && (mselapsed < 750)) {
            //Ti.API.info('singletap: skipped');
            gotclickevent = false;
				    return;
				  } 
				  
          if (timeoutid !== -1) {
            clearTimeout(timeoutid);
          }
				  
	 				if (isSameIndex && _allow_reselect) {
            //Ti.API.info('singletap: reselect ' + newindex);
	 				  newtapindex = newindex;
            timeoutid = setTimeout(function(e) {
              timeoutid = -1;
              _self.delayedTap(newtapindex);
            }, 250);             	 				  
          } else if (isSameIndex && _allow_deselect && (_current_idx !== -1)) {
            //Ti.API.info('singletap: deselect to -1');
            timeoutid = setTimeout(function(e) {
              timeoutid = -1;
              _self.delayedTap(-1);
            }, 250); 
          }
				});
		  }

		}
	
		else
		{
			//jmhparams.layout = 'horizontal';
      var backgroundColor = 'white';
      var borderColor = '#ccc';

      params.backgroundColor = backgroundColor;
      params.borderColor = borderColor;
      params.borderWidth = 1;
			params.layout = 'horizontal';
      params.horizontalWrap = false;
			_self = Ti.UI.createView(params);

      var btnw = parseInt (100 / _labels.length); 
      btnw = '' + btnw + '%';
      //var width = params.width || _self. 
      if (params.width && _labels.length) {
        var btndp = Math.floor(params.width / _labels.length) + 'dp';
      } else {
        var btndp = btnw;
      }
      Ti.API.info('button width for '+ _labels.length + ' buttons=' + btnw + '% or dp=' + btndp);

      var buttonfont = params.font || {fontSize: 14}; 
			for (var i = 0; i < _labels.length; i++)
			{
				var label = params.labels[i];
				var button = Ti.UI.createSwitch({
				  color: 'black',
					titleOn: label,
					titleOff: label,
					font: buttonfont,
					left: 0,
					right: 0,
					width: btnw,
          //backgroundColor: params.backgroundColor,
          borderColor: params.borderColor,
          borderWidth: params.borderWidth,					
				});
				_buttons.push (button);
				button.addEventListener ('click', onswitchclick);
				_self.add (button);
			}
		}
	};
	
	_init (params);
	if (_self == null)
	{
		return null;
	}
	
	_self.xgetSelectedIndex = function ()
	{
		return _current_idx;
	};
		
	_self.xsetSelectedIndex = function (idx)
	{
		if (idx < -1)
		{
			return;
		}
		if (idx > _labels.length - 1)
		{
			return;
		}
		
		_current_idx = idx;
		
		if (ios)
		{
			if (idx == -1)
			{
				idx = null;
			}
			
			_self.setIndex (idx);
			return;
		}
		
		for (var i = 0; i < _buttons.length; i++)
		{
			_buttons[i].setValue (false);			
		}
		_buttons[idx].setValue (true);
	};
	
	_self.xsetEnabled = function (enabled)
	{
		_enabled = enabled;
		if (ios)
		{
			_self.setTouchEnabled (enabled);
			return;
		}
		
		for (var j = 0; j < _buttons.length; j++)
		{
			_buttons[j].enabled = enabled;
		}
	};
	
	return _self;
};


module.exports = SelectBar;
