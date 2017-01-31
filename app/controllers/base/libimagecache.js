/*jslint maxerr:1000 */
'use strict';

/**
 * Image caching utils.
 *
 * Note an important principle here is *bypassing* the default Titanium caching
 * [Therefore we never load a remote URL into an imageview]
 * http://docs.appcelerator.com/titanium/latest/#!/guide/Image_Best_Practices-section-30082525_ImageBestPractices-Cachingremoteimages
 *
 * We handle caching internally so:
 *
 * 0. Images are pre-cropped to the correct icon sizes for the lists and details views without scaling skewing them
 * 1. We can store the downloaded images in externally accessible photo albums
 * 2. We can hide / favourite images
 * 3. We can local load a subset of images on demand as the user scrolls
 * 4. Thumbs are shared for the newsfeed, userimages, and collection thumb images but not organised into folders.
 * 5. Imagecache should be organised into albums/collections.
 *
 * @class libimagecache
 */
$.lib = Alloy.Globals.lib;
var LOGTAG = 'libimagecache';

function isNull(obj) {
  return (undefined === obj) || (obj === null) ? true : false;
};

function isNullOrBlank(obj) {
  return (undefined === obj) || (obj === null) || (_.isFunction(obj.trim) && (obj.trim() === '')) ? true : false;
};

var imagecache = {
  enabled: true,
  downloadqueue: [],
  downloading: false,
  thumbdir: '',
  imagedir: '',
  initialised: false
};

imagecache.initCacheDirs = function() {
  // Set up location of the image cache folder for downloaded images
  if (OS_ANDROID) {
    imagecache.thumbdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'thumbcache');
    imagecache.imagedir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'imagecache');
  } else {
    imagecache.thumbdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory + '../Library/Caches/', 'thumbcache');
    imagecache.imagedir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory + '../Library/Caches/', 'imagecache');
  }

  if (! imagecache.thumbdir.exists() ) {
    imagecache.thumbdir.createDirectory();
    Ti.API.warn('imagecache.initCacheDirs.created: ' + imagecache.thumbdir.name);
  }
  if (! imagecache.imagedir.exists() ) {
    imagecache.imagedir.createDirectory();
    Ti.API.warn('imagecache.initCacheDirs.created: ' + imagecache.imagedir.name);
  }

  imagecache.thumbdir = imagecache.thumbdir.nativePath;
  imagecache.imagedir = imagecache.imagedir.nativePath;
  imagecache.initialised = true;
};
imagecache.initCacheDirs();

imagecache.deleteCacheDirs = function() {
  // Erase downloaded images; primarily used for debugging "reset"
  Ti.API.error('*** imagecache.deleteCacheDirs is disabled');
  return;
  var thumbdeleted, imagedeleted;
  if (OS_ANDROID) {
    imagecache.thumbdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'thumbcache');
    imagecache.imagedir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'imagecache');
  } else {
    imagecache.thumbdir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory + '../Library/Caches/', 'thumbcache');
    imagecache.imagedir = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory + '../Library/Caches/', 'imagecache');
  }

  if (! imagecache.thumbdir.exists() ) {
    thumbdeleted = imagecache.thumbdir.deleteDirectory(true);
    Ti.API.warn('imagecache.deleteCacheDirs.delete: ' + thumbdeleted + ' ' + imagecache.thumbdir.name);
  }
  if (! imagecache.imagedir.exists() ) {
    imagedeleted = imagecache.imagedir.deleteDirectory(true);
    Ti.API.warn('imagecache.deleteCacheDirs.delete: ' + imagedeleted + ' ' + imagecache.imagedir.name);
  }

  if (imagecache.initialised) {
    imagecache.initCacheDirs();
  }
};

/**
 * Return jpeg from /blah/myphoto.jpeg or from the blob file
 *
 * @method fileExtension
 * @param {Object} fn - String filename or Image blob
 * @return {String} eg. png or jpeg
 */
imagecache.fileExtension = function(fn) {
  var result = 'png';
  try {
    if (_.isString(fn)) {
      // from http://stackoverflow.com/a/680982/292947
      var re = /(?:\.([^.]+))?$/;
      var tmpext = re.exec(fn)[1];
      result = (tmpext) ? tmpext : 'png';
    } else {
      // If its a file handle
      if (fn && _.isFunction(fn.extension)) {
        result = fn.extension();
      } else if (fn && _.isFunction(fn.getFile) && _.isFunction(fn.getFile().extension)) {
        result = fn.getFile().extension();
      }
    }
  } catch(e) {
    Ti.API.error(e);
  }
  return result;
};

imagecache.cachedfilename = function(imageurl) {
  //return encodeURIComponent(opts.image.substr(4, opts.image.length).replace(/\//g, '_'));
  if (_.isString(imageurl)) {
    return imageurl.substr(4, imageurl.length).replace(/\//g, '_');
  } else {
    return undefined;
  }
};

imagecache.filenameWithType = function(filename, ext, id) {
  // Generally something like guid_user_justin.png
  var result = id ? id + '_' : '';
  result += filename;

  var extn = '.' + (ext ? ext : imagecache.fileExtension(filename));
  return result.replace(/\//g, '_') + extn;
};

imagecache.exists = function(filename) {
  // Pass the full path which includes the image or thumb folder
  var result = false;
  if (! isNullOrBlank(filename)) {
    if (! filename.containsText(imagecache.imagedir)) {
      filename = imagecache.imagedir + '/' + filename; // + '.' + imagecache.fileExtension(filename);
    }

    var f = Ti.Filesystem.getFile(filename);
    result = f && f.exists();
    f = null;
  }
  return result;
};

imagecache.avatarLocalFileName = function(url) {
  // Remote url should end assets/ & be 140px * 140px
  // var url = 'http://api.zoopacall.com/assets/7fc40022d5b33ede4891b5b3ee7d228e';
  if (_.isString(url)) {
    return url.substr(url.lastIndexOf('/')+1) + '.png';
  } else {
    return '';
  }
};

imagecache.saveImagesFromRemote = function(url, forceupdate) {
  // Load event is not triggering on IOS https://jira.appcelerator.org/browse/TIMOB-18545

  // Remote url should end assets/ & be 140px * 140px
  // var url = 'http://api.zoopacall.com/assets/7fc40022d5b33ede4891b5b3ee7d228e';
  var localfilename = imagecache.avatarLocalFileName(url);
  if (imagecache.exists(localfilename) && ! forceupdate) {
    return localfilename;
  }
  if (false === $.lib.net.online()) {
    return '';
  }
  Alloy.CFG.logging && $.lib.logInfo('saveImagesFromRemote for ' + localfilename, LOGTAG);

  var imageView = Titanium.UI.createImageView({
    preventDefaultImage: true,
    //touchEnabled: true,
    width: 140,
    height: 140,
  });

  function imageLoaded(e) {
    imageView.removeEventListener('load', imageLoaded);
    var image = e.source.image;
    var newlocalfilename = imagecache.avatarLocalFileName(image);

    Alloy.CFG.logging && $.lib.logInfo('saveImagesFromRemote imageView.addEventListener.load fired for ' + image + ' to ' + newlocalfilename, LOGTAG);
    var imageblob = OS_ANDROID ? e.source.toImage().media : e.source.toImage();
    var newname = imagecache.saveImages(newlocalfilename, imageblob);
    Alloy.CFG.logging && $.lib.logInfo('saveImagesFromRemote saved as ' + newname, LOGTAG);

    imageblob = null;
    e.source = null;
  };

  imageView.addEventListener('load', imageLoaded);

  imageView.addEventListener('error', function(e) {
    $.lib.logError('saveImagesFromRemote error');
    imageView = null;
  });

  imageView.setImage(url);
  Alloy.CFG.logging && $.lib.logInfo('saveImagesFromRemote - image was set ' + imageView.image, LOGTAG);

  // Required to trigger the load event on android
  imageView.toImage();
  return localfilename;
};

/**
 * Convert and save the imageblob in thumb & detail sizes; return the short name with extension or blank
 * @method saveImages
 *
 */
imagecache.saveImages = function(filename, imageblob) {
  try {
    filename = '' + filename; // Convert numbers to string
    if (filename.trim() === '') {
      return '';
    }
    if (_.isString(imageblob)) {
      $.lib.logError('saveImages *** TODO: convert avatar to blob and store ' + filename, LOGTAG);
      return '';
    }

    if (! filename.endsWith('.png')) {
      filename +=  '.png'; //+ imagecache.fileExtension(imageblob);
    }
    if (imageblob && _.isFunction(imageblob.imageAsThumbnail)) {
      var fimage = Titanium.Filesystem.getFile(imagecache.imagedir + '/' + filename);
      fimage.write(imageblob.imageAsThumbnail(80, 0, 0));
      fimage = null;

      var fthumb = Titanium.Filesystem.getFile(imagecache.thumbdir + '/' + filename);
      fthumb.write(imageblob.imageAsThumbnail(50, 0, 4));
      fthumb = null;

      return filename;
    } else {
      //$.lib.logError('saveImages no imageblob.imageAsThumbnail for ' + filename, LOGTAG);
      return '';
    }

  } catch(e) {
    $.lib.logError(e, LOGTAG+'.saveImages');
    return '';
  }
};

imagecache.saveImage = function(filename, image) {
  if (_.isString(filename)) {
    if (! filename.containsText(imagecache.imagedir)) {
      filename = imagecache.imagedir + '/' + imagecache.filenameWithType(filename);
    }

    try {
      var f = Titanium.Filesystem.getFile(filename);
      f.write(image);
      return filename;
    } catch(E) {
      $.lib.logError(E, LOGTAG+'.saveImage');
      return null;
    }
  } else {
    $.lib.logError('saveImage with no filename', LOGTAG);
  }
};

imagecache.resizeImageFile = function(filename, size, round/* newwidth, newheight, crop*/) {
  // See also imageAsThumbnail
  var imageView = Titanium.UI.createImageView({
    image:filename,
    //width: 100, height:100
  });
  var imageblob = imageView.toImage();
  try {
    if (true === round) {
      if (true === round) {
        var cropped = imageblob.imageAsThumbnail(size, 1, Math.round(size/2));
      } else {
        var cropped = imageblob.imageAsThumbnail(size, 0);
      }
    }
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.resizeImage');
    return undefined;
  }
  return cropped;
};

/**
 * As resize functions seem to be unreliable btw sdk versions, we resize here by placing the image into an imageview and reading back
 */
imagecache.resizeImage = function(imageblob, size, round/* newwidth, newheight, crop*/) {
  // See also imageAsThumbnail
  if (isNull(imageblob)) {
    return undefined;
  }

  // Filename rather than blob?
  var returnblob = imageblob;
  if (imageblob.apiName && imageblob.apiName !== 'Ti.Blob') {
    returnblob = imagecache.imageOrRemote(imageblob, imageblob);
    if (isNull(imageblob)) {
      return undefined;
    }
  }

  // imageAsThumbnail seems to combine scaling and resizing in one op.
  try {
    /*
    var width = imageblob.width;
    var height = imageblob.height;
    var returnblob = returnblob.
    if (height > new)
    */
    if (true === round) {
      return imageblob.imageAsThumbnail(size, 1, Math.round(size/2));
    } else {
      return imageblob.imageAsThumbnail(size, 0);
    }
  } catch(E) {
    $.lib.logError(E, LOGTAG+'.resizeImage');
  }
/*
You can crop an image without using an external module. Here's how to crop 100x100 pixels from an image starting at position 200,200 and then display the cropped image in an image view:

// Here's our base (full-size) image.
// It's never displayed as-is.
var baseImage = Titanium.UI.createImageView({
    image:'flower.jpg',
    width:512, height:512,
});

// Here's the view we'll use to do the cropping.
// It's never displayed either.
var cropView = Titanium.UI.createView({
    width:100, height:100
});

// Add the image to the crop-view.
// Position it left and above origin.
cropView.add(baseImage);
baseImage.left=-200;
baseImage.top=-200;

// now convert the crop-view to an image Blob
var croppedImage = cropView.toImage();

// make an imageView containing the image Blob
var imageView = Titanium.UI.createImageView({
    image:croppedImage,
    width: 100, height:100
});

// add it to the window
win1.add(imageView);
  var messageimage, messageimagestr;
    if (hasPendingImage()) {
      messageimage = $.pendingimage.image;
      // Resize to thumbnail
      if (OS_IOS) {
        var messagephoto = $.pendingimage.toImage();
        Ti.API.warn('Imageblob size  : ' + messagephoto.length);
        messageimagestr = Ti.Utils.base64encode(messagephoto);
        Ti.API.warn('Imageblob base64: ' + messageimagestr.length);
      } else if (OS_ANDROID) {
        var messagephoto = $.pendingimage.toImage();
        messageimagestr = Ti.Utils.base64encode(messagephoto.media);
      }
      clearPendingImage();
      resizeTextField();
    }
 */

    // messageimage is the original, messageimagestr is resized & encoded
};

imagecache.imageOrRemote = function(filename, imageurl, local) {
  if (! imagecache.initialised) {
    imagecache.initCacheDirs();
  }

  // JMH TODO: at the moment it is returning "getFile not supported for non-file blob types." FIX
  local = false;
  return imageurl;
  /*

  // Pass the full path which includes the image or thumb folder
  if (filename) {
    var f = Ti.Filesystem.getFile(filename);
    if (f.exists()) {
      local = true;
      return f;
    }
  }
  local = false;
  if (filename && imageurl) {
    Ti.API.error('Cachedimage not found for ' + filename + ' ' + imageurl);
  }
  return imageurl;
  */
};

/****
 * Camera helpers
 */
imagecache.imageFile = function(fileName, returnNativePath) {
  // Return the local image resource or null. Try the one we installed first.
  // Note that the "proper" way is to prefix the /, whereas a non-prefixed "should" try a path relative to the
  // resources folder. Mileage varies.
  fileName = fileName.replace(/\//g, '_');
  var f;
  var basepath = Ti.Filesystem.applicationDataDirectory;
  var respath = Ti.Filesystem.resourcesDirectory;

  // Handle Ti.Shadow asset redirection
  if (Ti.Shadow) {
    var ospath = OS_ANDROID ? 'android/' : 'iphone/';
    basepath += Ti.App.name +'/' + ospath;
    respath += ospath;
  }

  // Try in Documents/ then Documents/images
  f = Ti.Filesystem.getFile(imagecache.imagedir + 'images/', fileName);

  f = Ti.Filesystem.getFile(basepath + 'images/', fileName);
  if (!f.exists()) {
    f = Ti.Filesystem.getFile(basepath + fileName);
  }
  if (!f.exists()) {
   f = Ti.Filesystem.getFile(respath, fileName);
  }
  if (!f.exists()) {
    f = Ti.Filesystem.getFile(respath + 'images/', fileName);
  }

  if (f.exists()) {
    if ((undefined !== returnNativePath) && (true === returnNativePath)) {
      return f.nativePath;
    } else {
      return f;
    }
  } else {
    return null;
  }
};

imagecache.imageFilePath = function(fileName) {
  return $.imageFile(fileName, true);
};

imagecache.getImageFromGallery = function(e, callbackSuccess) {
  Titanium.Media.openPhotoGallery({
    success:function(e)
      {
        var image = e.media;
        if (callbackSuccess) {
          callbackSuccess(image);
        }
        return image;
      },
    cancel:function()
      {
      },
    error:function(error)
      {
      },
      allowEditing: false,
      autoHide: true,
      mediaTypes:[Ti.Media.MEDIA_TYPE_PHOTO]
    });
};

imagecache.getImageFromCamera = function(e, callbackSuccess) {
  // Won't work in simulator
  if (Alloy.Globals.libdata.platform.isSimulator) {
    var imageTest = $.imageFile('appicon.png');
    if (callbackSuccess) {
      callbackSuccess(imageTest);
    }
    return imageTest;
  }

  // TODO: store image name, request whether to upload to facebook
  Ti.Media.showCamera({
    success: function(e) {
      // Could be video
      if (e.mediaType == Ti.Media.MEDIA_TYPE_PHOTO) {
        if (callbackSuccess) {
          callbackSuccess(e.media);
        }
        return e.media;
      }
      return;
    },

    cancel: function(){
      Alloy.Globals.libdata.logInfo('user cancelled photo');
    },

    error: function(error) {
      if (error.code == Ti.Media.NO_CAMERA) {
        alert(L('nocamera', 'Camera not available'));
      } else {
        alert('Camera error: ' + error.code);
      }
    },

    mediaTypes: Ti.Media.MEDIA_TYPE_PHOTO,
    allowEditing: false,
    saveToPhotoGallery: true,
  });
};

imagecache.handleCameraButton = function(e, callbackSuccess) {
  var opts = {
    cancel : 2,
    selectedIndex : 2,
    destructive : 2,
    options : [L('image-takephoto', 'Use camera'), L('image-chooseexisting', 'Choose existing'), L('dialog-cancel', 'Cancel')],
    //title: 'Do you want to continue?',
  };

  var dialog = Ti.UI.createOptionDialog(opts);
  dialog.addEventListener('click', function(e) {
    if (e.index == 0) {
      return $.getImageFromCamera(e, callbackSuccess);
    } else if (e.index == 1) {
      return $.getImageFromGallery(e, callbackSuccess);
    } else {
      return;
    }
  });
  dialog.show();
};


imagecache.deleteFromImageCache = function(filename) {
  var f = Ti.Filesystem.getFile(filename);
  if (f.exists()) f.deleteFile();
};

imagecache.addToDownloadQueue = function(localpath, remoteurl, id) {
  // Return true if we added this to the queue
  if (! imagecache.exists(localpath)) {
    if (! isNull(remoteurl) && (remoteurl !== '')) {
      imagecache.downloadqueue.push({
        'filepath' : localpath,
        'url' : remoteurl,
        'id': id
      });
      return true;
    }
  }
  return false;
};

imagecache.startDownloadQueue = function(localpath, remoteurl) {
  // This is very slow. The pro way to do it is to
  // 1. Glue all images together into a giant photo
  // 2. Multiple xhrs
  if (! imagecache.initialised) {
    imagecache.initCacheDirs();
  }

  var lib = Alloy.Globals.libdata;
  if (lib.data && lib.data.photo) {
    if ((imagecache.downloadqueue.length > 0) && (imagecache.downloading === false)) {
      imagecache.downloading = true;
      try {
        lib.logInfo('startDownloadQueue fetching ' + imagecache.downloadqueue.length + ' images');
        var utility = new(require('download_utility'))();

        var _callBack_DownloadOneFileFinished = function(download_result) {
          lib.logInfo('(' + imagecache.downloadqueue.length + ' remain). Downloaded: ' + JSON.stringify(download_result));
          if ((download_result.status === 200) && download_result.id) {
            lib.data.photo.update({id: download_result.id}, {$set: {local_processed: true}}, function(error, doc){
              if (! isNull(error)) {
                lib.logError('lib.data.photo.update error: ' + JSON.stringify(error));
              }
            });
          }
        };

        var _callBack_DownloadMultipleFileFinished = function() {
          imagecache.downloading = false;
          lib.logInfo('Finished downloading all files');
          return;
        };

        utility.downloadMultiFile(imagecache.downloadqueue, _callBack_DownloadOneFileFinished, _callBack_DownloadMultipleFileFinished);
      } catch(E) {
        imagecache.downloading = false;
        lib.logError(E);
      }} else if (imagecache.downloadqueue.length > 0) {
        lib.logInfo('DLQ.continue, remaining: ' + imagecache.downloadqueue.length);
      }
   } else {
     lib.logError('Image database is undefined or not linked to $.lib', 'libimagecache.startDownloadQueue');
   }
};


var _factor;

function crop(blob, options, height) {

    if (typeof options !== 'object') {
        options = {
            width: options,
            height: height
        };
    }

    // No dimensions or otherwise un-usable
    if (!blob.width || !blob.height) {
        return blob;
    }

    // https://jira.appcelerator.org/browse/TIMOB-4865 - image gets rotated by 90degrees on iOS
    if (options.fix !== false) {
        blob = blob.imageAsResized(blob.width, blob.height);
    }

    if (options.hires !== false) {
        options = pixels(options);
    }

    if (options.width && options.height) {
        var blob_ratio = blob.width / blob.height;
        var ratio = options.width / options.height;

        if (blob_ratio !== ratio) {

            // Cut left and right
            if (blob_ratio > ratio) {
                blob = blob.imageAsCropped({
                    width: Math.round(blob.height * ratio),
                });
            }

            // Cut top and bottom
            else {
                blob = blob.imageAsCropped({
                    height: Math.round(blob.width / ratio)
                });
            }
        }

        if (blob.width !== options.width || blob.height !== options.height) {
            blob = blob.imageAsResized(options.width, options.height);
        }

        return blob;

    } else {
        return blob.imageAsCropped(options);
    }
}

function pixels(dimension) {

    if (typeof dimension === 'number') {
        return dimension * pixelFactor();
    }

    if (dimension.width) {
        dimension.width = dimension.width * pixelFactor();
    }

    if (dimension.height) {
        dimension.height = dimension.height * pixelFactor();
    }

    return dimension;
}

function pixelFactor() {

    if (!_factor) {
        _factor = 1;

        if (Ti.Platform.name === 'iPhone OS') {

            if (Ti.Platform.displayCaps.density === 'high') {
                _factor = 2;
            }

        } else if (Ti.Platform.name === 'android') {
            _factor = (Ti.Platform.displayCaps.dpi / 160);
        }
    }

    return _factor;
}

exports.crop = crop;
exports.pixels = pixels;
exports.pixelFactor = pixelFactor;

_.extend(exports, imagecache);

if (Ti.Shadow) { addSpy('libimagecache',$); }
