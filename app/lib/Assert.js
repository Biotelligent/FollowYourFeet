/*
 * Hard breakpoint using the debugger keyword - this is no longer recognised as valid js by the compiler  
 */

function Assert(truth, message) {
  if (truth && (false === truth)) {
    Ti.API.error('Assert failed: ' + message);
    debugger;
  }
  return this;
};

Assert.prototype.assert = function(message) {
  if (message) {
    Ti.API.error('Assert failed: ' + message);
  }
  debugger;  
};

Assert.prototype.breakpoint = function(message) {
  if (message) {
    Ti.API.info('Breakpoint: ' + message);
  }
  debugger;  
};

module.exports = Assert;