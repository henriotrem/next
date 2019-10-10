var next = require("./next.js");
var uuid = require('uuid/v4');

var universe = next.universe;

universe.dimensions = {};

universe.dimensions.space = next.spatiality;
universe.dimensions.space.origin = [47.864716, 2.349014];
universe.dimensions.space.limit = { distance : null, direction : null };
universe.dimensions.space.storage = new Map();

//universe.dimensions.time = omega.temporality;

universe.init({port: 6379,host: '127.0.0.1'},'index:action|space:#',9, 10);

universe.client.flushdb( function (err, succeeded) { console.log(succeeded); });

var precision = 13;

for(var i = 0; i < 100; i++) {

  var action = {};

  action.latitude = (Math.random()-0.5)*180;
  action.longitude = (Math.random()-0.5)*360;
  action.time = 1562066591;
  action.key = "action:"+uuid();

  universe.client.hmset(action.key, action);

  var geohash = universe.dimensions.space.encode([action.latitude, action.longitude], precision);

  var parent = "index:action|space:" + geohash;
  var value = action.key + "|space:" + geohash;

  for(var j = precision; j > 0;  j--) {

    var child = parent;
    parent = universe.parent(parent);

    if(j === universe.depth) {
      universe.client.sadd(parent, value);
    } else if(j < universe.depth) {
      universe.client.zincrby(parent, 1, child);
    }
  }
}

universe.client.quit();