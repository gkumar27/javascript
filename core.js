define(function (require) {
  
  var core = { };
  core.logger = {
      error: function(){
        console.error.apply(console.error,arguments);
      },
      info: function(){
        console.info.apply(console.info,arguments);
      },
      warn: function(){
        console.warn.apply(console.warn,arguments);
      },
      log: function(){
        console.log.apply(console.log,arguments);
      },
      debug: function(){
        console.debug.apply(console.debug,arguments);
      }
  }
  
  return core;
     
  
});