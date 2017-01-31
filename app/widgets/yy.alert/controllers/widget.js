var IOS8 = OS_IOS && parseInt(Ti.Platform.version, 10) > 7 ? true : false;
var IOS7 = (true === IOS8) || (OS_IOS && parseInt(Ti.Platform.version, 10) > 6) ? true : false;
var workingTop = IOS7 ? 20 : 0;
var workingWidth = Ti.Platform.displayCaps.platformWidth;
OS_ANDROID && (workingWidth /= Ti.Platform.displayCaps.logicalDensityFactor);
var workingHeight = Ti.Platform.displayCaps.platformHeight;
OS_ANDROID && (workingHeight /= Ti.Platform.displayCaps.logicalDensityFactor); // TODO: add in softkeys
workingHeight -= workingTop;

var buttonstyle = $.createStyle({ classes: ['blue-button-dialog'] });

exports.show = function(o){
  $.back.remove($.buttonArea);
  $.buttonArea = Ti.UI.createView({
    bottom: 0,
    left: 0,
    right: 0,
    layout:"horizontal",
    height: 65
  });
  $.back.add($.buttonArea);

  if (! _.isUndefined(o.height)) {
    $.back.height = o.height;
  } else {
    var islongmessage = o.message && (o.message.length > 200);
    if (islongmessage) {
       if (o.message.length > 300) {
         $.back.height = workingHeight - 80;
       } else {
         $.back.height = Math.min(500, workingHeight - 200);
       }
    } else { // else normally via class alert_background.height = 250;
      $.back.height = 260;
    }
  }
  $.back.top = Math.round((workingHeight / 2) - ($.back.height / 2) - 20);

  function click(e) {
    $.alert.close({animate: false});

    // If it is a [NO,YES] there should be onCancel/onConfirm callbacks
    if ((e.source.index > 0) || (o.buttons.length === 0)) {
      if (o.confirm) {
          o.confirm(e);
        }
    }

    // If it is a [CANCEL] or [1,2,3] type there should only be onCancel callback which passes e.source.index for the clicked button
    if ((e.source.index === 0) || _.isUndefined(o.confirm)) {
      if (o.callback) {
        if (_.isUndefined(o.cancel)) {
          o.cancel = 0;
        }
        if (o.cancel === e.source.index) {
          e.cancel = true;
        }
        o.callback(e);
      }
    }
  };

  if (o.error) {
    $.alert_title.color = 'red';
  } else {
    $.alert_title.color = "#616161";
  }
  $.alert_title.text = o.title;
  $.alert_content.text = o.message;
  //$.alert_content.height = $.back.height;
  // nb. iOS Human Interface Guidelines you should make the default action the right button, and the cancel button the left button for a two button alert
  // On Android, the "affirmative" action that continues progress is on the right, and cancel is on the left.
  // http://www.google.com/design/spec/components/dialogs.html#dialogs-confirmation-dialogs
  if (!o.buttons) {
    if (o.confirm) {
      o.buttons = [L('no',"No"), L('yes',"Yes")];
    } else {
      o.buttons = [L('ok',"OK")];
    }
  }
  console.log(o.buttons);
  var btnProperties = buttonstyle;
  var dialogWidth = workingWidth - 40;
  var buttonWidth = dialogWidth - 24;
  if (o.buttons.length === 2) {
    buttonWidth = Math.floor((buttonWidth / 2) - 6);
  } else if (o.buttons.length === 3) {
    buttonWidth = Math.floor((buttonWidth / 3) - 12);
  }

  _.extend(btnProperties, {top: 11, left: 12, right: null, width: buttonWidth});
  if (o.buttons.length > 2) {
    _.extend(btnProperties, {top: 5, left: 12, right: null, height: 54, width: buttonWidth, font: {fontFamily: Alloy.CFG.Skin.fontFamily, fontSize: 11},
      //left: "1%",
      //width: (Math.floor(100/o.buttons.length)-4) + "%",
      });
  }

  o.buttons.forEach(function(name, idx) {
    var but = Ti.UI.createButton({
      backgroundColor: /*o.error ? 'red' :*/ "#3876cc",
      title: name,
      index: idx,
    });
    but.applyProperties(btnProperties);
  // var btnFontSize = (o.buttons.length > 2) ? 11 : 16;
  // var btnHeight = (o.buttons.length > 2) ? 54 : 40;
  // $.buttonArea.height = btnHeight;
  // o.buttons.forEach(function(name, idx) {
    // var but = Ti.UI.createButton({
      // backgroundColor: /*o.error ? 'red' :*/ "#3876cc",
      // color: "white",
      // title: name,
      // left: 0,
      // width: (Math.floor(100/o.buttons.length)-1) + "%",
      // index: idx,
      // font: {
        // fontFamily: Alloy.CFG.Skin.fontFamily,
        // fontSize: btnFontSize,
      // },
      // height: btnHeight,
      // borderColor: "white",
      // borderWidth: 1,
      // borderRadius: Alloy.CFG.Skin.buttonBorderRadius,
    // });
    if (idx > 0) {
      but.backgroundColor = '#FF8416'; // orange
    }
    but.addEventListener("click",click);
    $.buttonArea.add(but);
  });
  if (OS_ANDROID) {
    $.alert.addEventListener('open', function(evt) {
      var actionBar = (evt.source._internalActivity) ? evt.source._internalActivity.actionBar : evt.source.activity.actionBar;
      if (actionBar){
        actionBar.hide();
      }
    });
  }

  var winopts = {
    animated: false
  };
  if (o.windowopts) {
    _.extend(winopts, o.windowopts); // e.g. Modal
  }
  $.alert.open(winopts);
};

exports.hide = function(e) {
  if ($.alert) {
    try {
      $.alert.close({animate: false});
    } catch(E) {
      Ti.API.error('Closing alert: ' + E.message);
    }
  }
};
