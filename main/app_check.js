const Redis = require("redis");
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});

redis.zrevrangebyscore(['read|index:#:#', '+inf', '-inf', 'WITHSCORES'], function (err, response) {

    let sum = 0;

    for (var j = 0; j < response.length / 2; j++)
        sum += parseInt(response[2*j+1]);

    console.log(sum);
});

redis.quit();