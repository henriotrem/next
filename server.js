var view = require("./app/view");

const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});


var universes = ["read", "listen"];
var origin = {"geospatiality": [49.864716, 4.349014], "temporality": 1562066591};
var filter = {"geospatiality": { distance : 10000, direction : [60, 90]}, "temporality":{ distance : 0, direction : null }};

var step = 10;

view.init(redis, universes, origin , filter, step, function(result) {

    for(let object of result)
        console.log(object);

    if(result.length === step) {

        //view.more();
    } else {

        redis.quit();
    }
});