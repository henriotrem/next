var view = require("../library/view");

const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});

////////////////////////////////

var universes = ["listen"];

var origin = {"geospatiality": [49.864716, 4.349014], "temporality": (Date.now()/1000)};
var filter = {"geospatiality": { ratio: 20036, distance : 10000, direction : [60, 90]}, "temporality":{ ratio: 31556952, distance : 3600*24*30, direction : 1 }};

var step = 10;
var total = 0;

////////////////////////////////

view.init(redis, universes, origin , filter, step, function(result) {

    for(var object of result)
        console.log(object.key);

    console.log("\nTotal : " + (total += result.length) + " | Queries : " + view.queries + " | Response ~" + Math.floor(view.unique/view.queries) + " bytes\n");

    if(result.length >= step) {

        if(total < step*20) {

            view.more();
        } else {

            redis.quit();
        }
    } else {

        redis.quit();
    }
});