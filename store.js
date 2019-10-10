const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
  console.log("Error " + err);
});

var uuid = require('uuid/v4');

var spatiality = require("./app/dimensions/spatiality");
var temporality = require("./app/dimensions/temporality");

var universe = require("./app/universe");

spatiality.init([47.864716, 2.349014], { distance : null, direction : null }, 3);
temporality.init(1562066591, { distance : null, direction : null }, 1);

universe.init(redis, null,{space: spatiality,time: temporality},'index:action|space:#',9, 10);

universe.redis.flushdb( function (err, succeeded) { console.log(succeeded); });

var precision = 13;

for(var i = 0; i < 100000; i++) {

  var action = {};

  action.latitude = (Math.random()-0.5)*180;
  action.longitude = (Math.random()-0.5)*360;
  action.time = 1562066591;
  action.key = "action:"+uuid();

  universe.redis.hmset(action.key, action);

  var geohash = universe.dimensions.space.encode([action.latitude, action.longitude], precision);

  var parent = "index:action|space:" + geohash;
  var value = action.key + "|space:" + geohash;

  for(var j = precision; j > 0;  j--) {

    var child = parent;
    parent = universe.parent(parent);

    if(j === universe.depth) {
      universe.redis.sadd(parent, value);
    } else if(j < universe.depth) {
      universe.redis.zincrby(parent, 1, child);
    }
  }
}

universe.redis.quit();