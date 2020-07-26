var writer = require("../library/writer");

const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});

////////////////////////////////

var universe = {};

universe.key = "watch";
universe.dimensions = ["geospatiality", "temporality"];
universe.bases = [{root:"#", bit:4, alphabet:"ABCDEFGHIJKLMNOP"}, {root:"#", bit:2, alphabet:"ABCD"}];
universe.depth = 2;
universe.precision = 13;
universe.limit = 100;

var name = "video";
var number = 100000;

////////////////////////////////

writer.init(redis);
writer.save(universe);

for(var char1 of universe.bases[0].alphabet) {
    for (var char2 of universe.bases[1].alphabet) {
        for (var i = 3; i < 7; i++) {
            let key = universe.key + "|list:" + char1 + ":" + i + "_" + char2;
            redis.lpush(key, 1);
        }
    }
}

writer.randomize(name, number, universe);