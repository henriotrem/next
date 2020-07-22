var view = require("../library/view");

const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});

////////////////////////////////

var universes = ["listen"];

var origin = {"geospatiality": [49.864716, 4.349014], "temporality": (Date.now()/1000)};
var filter = {"geospatiality": { ratio: 20036, distance : 5000, direction : [60, 90]}, "temporality":{ ratio: 31556952, distance : 150*24*60*60, direction : 1 }};

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