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
var objects = [];

////////////////////////////////

view.init(redis, universes, origin , filter, step, function(result) {

    objects = objects.concat(result);

    if(result.length === step) {

        for(let object of result)
            console.log(object);

        //view.more();
        redis.quit();
    } else {

        console.log("Number : " + objects.length);

        redis.quit();
    }
});