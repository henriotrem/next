const WebSocket = require('ws');
const Redis = require("redis");

var spatiality = require("./app/dimensions/spatiality");
var temporality = require("./app/dimensions/temporality");

var universe = require("./app/universe");

const wss = new WebSocket.Server({ port: 5050 });
const redis = Redis.createClient({port: 6379,host: '127.0.0.1'});

redis.on("error", function (err) {
    console.log("Error " + err);
});

wss.on('connection', function connection(ws) {

    ws.on('message', function incoming(message) {

        if(message === 'init') {

            spatiality.init([49.864716, 4.349014], { distance : 10000, direction : [50, 120] }, 3);
            temporality.init(1562066591, { distance : null, direction : null }, 1);

            universe.init(redis, ws, {space: spatiality,time: temporality}, 9, 13, 10, true);
        }
        if(message === 'start') {

            universe.start('index:action|space:#');
        }
        if(message === 'more') {

            universe.more();
        }
        if(message === 'flush') {

            universe.flush();
        }
        if(message === 'randomize') {

            universe.randomize(100000);
        }
    });
});