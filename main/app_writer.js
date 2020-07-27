var writer = require("../library/writer");

const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$";
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef";
const BASE16 = "ABCDEFGHIJKLMNOP";
const BASE8 = "ABCDEFGH";
const BASE4 = "ABCD";

redis.on("error", function (err) {
    console.log("Error " + err);
});

////////////////////////////////

var universe = {};

universe.key = "listen";
universe.dimensions = ["geospatiality", "temporality"];
universe.bases = [{root:"#", bit:4, alphabet:BASE16}, {root:"#", bit:2, alphabet:BASE4}];
universe.precision = 13;
universe.limit = 100;

var name = "music";
var number = 100000;

////////////////////////////////

writer.init(redis);
writer.flush();
writer.save(universe);
writer.randomize(name, number, universe);