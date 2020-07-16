const Redis = require("redis");

var spatiality = require("./app/dimensions/spatiality");
var temporality = require("./app/dimensions/temporality");

var universe = require("./app/universe");

const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});

var dimensions = [spatiality, temporality];
var bases = [{root:"#", index:2, alphabet:"ABCDEFGHIJKLMNOP"}, {root:"#", index:0, alphabet:"ABCD"}];
var depth = 9;
var origin = [[49.864716, 4.349014], 1562066591];
var filter = [{ distance : null, direction : [60, 90] }, { distance : null, direction : null }];

universe.init(redis, dimensions, bases, depth,origin , filter, 10);
universe.start("music:#:#");