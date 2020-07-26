var view = require("../library/view");

const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});

////////////////////////////////

var universes = ["listen", "read", "watch"];

var origin = {"geospatiality": [49.864716, 4.349014], "temporality": (Date.now()/1000)};
var filter = {"geospatiality": { ratio: 20036, distance : 0, direction : null}, "temporality":{ ratio: 31556952, distance : 0, direction : null }};

var step = 10;
var total = 0;

////////////////////////////////

view.init(redis, universes, origin , filter, step, function(result) {

    total += result.length;

    /*for(var object of result)
        console.log(object.key);*/

    if(result.length === step) {

        console.log("Total : " + total + " / Queries : " + view.queries);

        if(total < 30000) {
            view.more();
        } else {
            redis.quit();
        }
    } else {

        redis.quit();
    }
});