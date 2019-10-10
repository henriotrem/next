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

    spatiality.init([47.864716, 2.349014], { distance : null, direction : null }, 3);
    temporality.init(1562066591, { distance : null, direction : null }, 1);

    universe.init(redis, ws, {space: spatiality,time: temporality},'index:action|space:#',9, 10);

    ws.on('message', function incoming(message) {
        if(message === 'load')
            universe.load();

        if(message === 'more')
            universe.more();
    });
});