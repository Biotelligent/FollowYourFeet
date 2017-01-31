/*
 * Map view
 * 
 * Because the screen is closed between menu changes, we always load the last location 
 * in case it was the result of a manual search 
 * 
 * If the user is on a train, or has just started up the app elsewhere, they can press the userLocation pin 
 * on the map to re-centre themselves
 * 
 * At the moment the user can only search for a location, or filter to gluten, but ideally should be able to 
 * search on restaurant name etc
 * 
 */
exports.baseController = 'base/baseviewcontroller';
var LOGTAG = 'searchmap';

var Map = Alloy.Globals.Map;
var annotations = [];
var searchresults = [];
var searchfilters = [];
var returnedfilters = 0;
var limit = 100;
var layoutloaded = false;
var suppressRegionChanged = false;
var zoomlevel = 8;
var lastlocation = Ti.App.Properties.getObject('geolocation', { latitude:51.514079, longitude:-0.090943, zoomlevel: 0 });
var fitToAnnotations = true; // Recentre and resize the map to the search results on startup and after address search
var foursquare;
var activitytimer = -1;
var routePoints = [];
var cardioRoute;


if (OS_ANDROID && _.isFunction($.mapview.setEnableZoomControls)) {
  try {
    $.mapview.setEnableZoomControls(false); // use ours
  } catch(E) {
    $.lib.logError(E);
  }
}
$.zoomoutButton.title = fa.minus;
$.zoominButton.title = fa.plus;
$.locationButton.title = fa.locationArrow;
//$.mainmenuButton.title = fa.bars;
$.filterButton.title = fa.search;
$.activityView.hide();
$.needsZoomReset = true;

$.lib.config.load();

// We don't want default restaurants, schools etc
OS_IOS && ($.mapview.showsPointsOfInterest = false);
$.mapview.userLocation = true; // Show the users current location as a pin and a button allowing them to re-find it
$.mapview.userLocationButton = false; // Use our own button
$.mapview.addEventListener('complete', _.bind(handleMapLoaded, this));
$.mapview.addEventListener('regionchanged', _.bind(handleMapRegionChanged, this));

$.mapview.region = { latitude: lastlocation.latitude, longitude: lastlocation.longitude, latitudeDelta:0.02, longitudeDelta:0.02 };

function logLocation(info, lat, lon) {
  $.lib.logInfo(String.format(info + ' lat %2.5f lon %2.5f', lat, lon));  
};

exports.doCloseView = function () {
  $.platform.hideKeyboard($.mainview);
  $.mapview.removeEventListener('complete', handleMapLoaded);
  $.mapview.removeEventListener('regionchanged', handleMapRegionChanged);
  //$.destroy();
  return true;
};

function showActivityTimer(timeoutsec) {
  // Clear any running timer and restart
  if (activitytimer !== -1) {
    clearTimeout(activitytimer);
    activitytimer = -1;
  }
  
  activitytimer = setTimeout(function(e){
    hideActivity();
  }, timeoutsec * 1000);
  
  $.filterButton.hide();
  $.activityView.show();  
};

function hideActivity() {
  // Clear running timer
  if (activitytimer !== -1) {
    clearTimeout(activitytimer);
    activitytimer = -1;
  }
 
  $.activityView.hide();  
  $.filterButton.show();
};



function geocodeAddress(address, callbackSuccess, callbackFailure) {
  // Send off a request to Nominatum for the latitude + longitude which matches the given address
  // http://nominatim.openstreetmap.org/search?q=135+pilkington+avenue,+birmingham&format=json&polygon=0&addressdetails=1
  var newAddress = new String(address).replace(/\s+/g, "+");
  $.lib.logInfo('geocoding address ' + newAddress, ['search']);
  showActivityTimer(10);
  
  var geocodeXhr = Ti.Network.createHTTPClient({
    onload: function(e) {
      var responseAddress = JSON.parse(this.responseText);
      // If an array was returned, there is more than one possible match, ordered by "correctness"
      if (_.isArray(responseAddress)) {
        callbackSuccess(responseAddress[0], responseAddress.length);          
      } else {
        callbackSuccess(responseAddress, 1);                    
      }
      },
    onerror: function(e) {
      $.lib.logError(e.error);
      callbackFailure({e:e});
    },
    timeout: 10000,
  });
  
  geocodeXhr.open('GET', 'http://nominatim.openstreetmap.org' + '/search?q=' +
    newAddress + '&format=json&polygon=0&addressdetails=1' +
    '&accept-language=en-gb' +                // 'en-gb' -- not the same as Ti.Locale.language
    '&countrycodes=gb'                   // 'gb'     
  );
  geocodeXhr.setRequestHeader('Content-Type','application/json; charset=utf-8');
  geocodeXhr.send();
  return;
};   

function isLocationChange(changetype, newregion, writechange) {
  // Check whether each maploaded/mapregionchanged also requires us to requery foursquare
  // A map tile horizontal width at zoomlevel 10 is approx latitude-diff 0.02 and longitude vertical 0.02
  
  var latitudeDelta = Math.abs(newregion.latitude - lastlocation.latitude);
  var longitudeDelta = Math.abs(newregion.longitude - lastlocation.longitude);
  var isChange = ((latitudeDelta > 0.01) || (longitudeDelta > 0.01) || (zoomlevel > lastlocation.zoomlevel)) ? true : false;
  
  var willChange = (true === isChange) && (true === writechange);
  $.lib.logInfo('Update map:' + willChange + ' ' + String.format(changetype + ' new coords: %2.5f,%2.5f deltas: %2.5f %2.5f', newregion.latitude, newregion.longitude, latitudeDelta, longitudeDelta));
  if ((true === isChange) && (true === writechange)) {
    saveLocation(newregion);
  } 
  return isChange;
};

function saveLocation(coords) {
  lastlocation = {latitude: coords.latitude, longitude: coords.longitude, zoomlevel: zoomlevel};
  Ti.App.Properties.setObject('geolocation', lastlocation);
};

function handleMapLoaded(e) { 
  // nb. also occurs after a zoom-out
  if ((false === layoutloaded) || isLocationChange('maploaded', e.source.region, true)) {
    layoutloaded = true;
    loadVenuesByCoordinate(lastlocation);
    $.lib.Geo.callBack2 = onLocationChange;
  } else if ($.needsZoomReset) {
    loadVenuesByCoordinate(lastlocation);
  }
};

function onLocationChange(coords) {
  $.lib.logInfo("onLocationChange " + $.lib.stringify(coords), LOGTAG)
  if (_.isNumber(coords.lastHeading) /*&& isLocationChange("backgroundGeo", coords, true)*/) {
    //$.headingLabel.text = $.lib.degreesToHeading(coords.lastHeading) + String.format(" %1.1f", coords.lastHeading);
    addPoint(coords.latitude, coords.longitude, true);
  }
}


function handleLocationUpdate() {
  addPoint($.lib.Geo.co)
};

function handleMapRegionChanged(e) {
  if ((false === layoutloaded) || (true === suppressRegionChanged)) {
    isLocationChange('mapregion-suppressed', {latitude: e.latitude, longitude: e.longitude}, false);
    hideActivity();
    return;
  }

  if (isLocationChange('mapregionchanged', {latitude: e.latitude, longitude: e.longitude}, true)) {
    loadVenuesByCoordinate({latitude: e.latitude, longitude: e.longitude});
  }
};
 
function handleZoomOutClick(e) {
  $.needsZoomReset = false;
  zoomlevel -= 1;
  $.mapview.zoom(-1);
};

function handleZoomInClick(e) {
  $.needsZoomReset = false;
  zoomlevel += 1;
  $.mapview.zoom(1);
};

function handleMapClick(evt) {
  if (evt && evt.annotation) {
  }
};

function handleUserLocationClick(e) {
  $.needsZoomReset = true;
  _.debounce(getUserLocation(e), 500, true);
};

function handleDebouncedSearch(e) {
  function onLocationFound(e, matchcount) {
    if (undefined !== e) {
      $.lib.logInfo('Searching near geocoded address: ' + e.display_name.replace(/, European Union/g, ""));
      suppressRegionChanged = false; 
      fitToAnnotations = true;
      $.mapview.region = {latitude: e.lat, longitude: e.lon};   
    }
  };
  
  function onLocationNotFound(e, matchcount) {
    alert('Could not find a location matching ' + area);
  };

  var area = $.search.value || '';
  if (area !== '') {
    geocodeAddress(area, onLocationFound, onLocationNotFound);     
  }
};

function handleSearchReturn(e) {
  $.platform.hideKeyboard(e.source);
  _.debounce(handleDebouncedSearch(e), 500, true);
};

function getUserLocation() {
  if (Ti.Geolocation) { // && ! $.lib.platform.isSimulator) {
    Ti.Geolocation.purpose = 'To find nearby places.';
    Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_BEST;
    Ti.Geolocation.distanceFilter = 0;
    showActivityTimer(10);
    $.lib.logInfo('Ti.Geolocation.getCurrentPosition');
    Ti.Geolocation.getCurrentPosition(function (e) {
      if (!e.success || e.error) {
        Ti.API.info('Error getting user location');
      } else {
        $.lib.logInfo('Ti.Geolocation.getCurrentPosition e='+JSON.stringify(e));
        suppressRegionChanged = false;
        fitToAnnotations = true;
        $.mapview.region = { latitude: e.coords.latitude, longitude: e.coords.longitude };
      }
    });
  }
};

function loadVenuesByCoordinate(coords) {
  // When the map has changed via scroll or zoom, requery foursquare 
  hideActivity();
  annotations = [];
  if ($.needsZoomReset === true) {
    $.mapview.zoomlevel = 8;
    zoomlevel = 8;
  }
  suppressRegionChanged = false; // So that it only triggers when all filters return
  //$.mapview.annotations = annotations;
  addPoint(coords.latitude, coords.longitude, true);

  // Fit the map to the new annotations if this was the result of an address lookup
  if ((annotations.length > 0) && (true === fitToAnnotations) && _.isFunction($.mapview.showAnnotations)) {
    $.lib.logInfo('Fitting map to annotations');
    fitToAnnotations = false;
    try {
      $.mapview.showAnnotations(annotations);
    } catch(E) {
      $.lib.logError('$.mapview.showAnnotations() failed with ' + E.message);
    }
  }
};

function addPoint(lat, lon, drawroute) {
  //if (OS_ANDROID) return; // Black map?
  routePoints.push({
    latitude: lat,
    longitude: lon
  });

  if (true === drawroute) {
    removeRoute();
    cardioRoute = Alloy.Globals.Map.createRoute({
      name: '1',
      points: routePoints,
      color: 'blue', //'#2ecc71',
      width: 5
    });
    $.mapview.addRoute(cardioRoute);
  }
};

function removeRoute() {
  if (! _.isUndefined(cardioRoute)) {
    $.mapview.removeRoute(cardioRoute);
  }
};


