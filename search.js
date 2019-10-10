const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});

var spatiality = require("./app/dimensions/spatiality");
var temporality = require("./app/dimensions/temporality");

var universe = require("./app/universe");

spatiality.init([47.864716, 2.349014], { distance : null, direction : null }, 3);
temporality.init(1562066591, { distance : null, direction : null }, 1);

universe.init(redis, null,{space: spatiality,time: temporality},'index:action|space:#',9, 10);

universe.load();