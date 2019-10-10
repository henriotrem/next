var omega = require("./omega.js");
var uuid = require('uuid/v4');

var search = omega.search;

search.dimensions = {};

search.dimensions.space = omega.spatiality;
search.dimensions.space.origin = [47.864716, 2.349014];
search.dimensions.space.limit = { distance : null, direction : null };
search.dimensions.space.storage = new Map();

//search.dimensions.time = omega.temporality;

search.init({port: 6379,host: '127.0.0.1'},'index:action|space:EARTH',8, 10);

search.client.flushdb( function (err, succeeded) { console.log(succeeded); });

for(var i = 0; i < 100; i++) {

  var action = {};

  action.latitude = (Math.random()-0.5)*180;
  action.longitude = (Math.random()-0.5)*360;
  action.time = 1562066591;
  action.key = "action:"+uuid();

  search.client.hmset(action.key, action)

  var parent = "index:action|space:" + search.dimensions.space.encode([action.latitude, action.longitude], search.depth);//+ "|time:" + search.dimensions.time.encode(action.time, search.depth);

  search.client.sadd(parent, action.key + "|space:" + search.dimensions.space.encode([action.latitude, action.longitude], 13));

  for(var j = search.depth; j > 0;  j--) {

    var element = parent;
    parent = search.parent(parent, j);

    search.client.zincrby(parent, 1, element);
  }
}

search.client.quit();



