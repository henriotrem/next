var writer = require("../library/writer");

const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});

////////////////////////////////

var universe = {};

universe.key = "listen";
universe.dimensions = ["geospatiality", "temporality"];
universe.bases = [{root:"#", bit:3, alphabet:"ABCDEFGHIJKLMNOP"}, {root:"#", bit:1, alphabet:"ABCD"}];
universe.depth = 6;
universe.precision = 13;

var name = "music";
var number = 100000;

////////////////////////////////


writer.init(redis);
writer.flush();
writer.save(universe);
writer.randomize(name, number, universe, function() {

    redis.quit();
});
