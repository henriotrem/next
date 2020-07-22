this.dimensions = {};
this.dimensions.geospatiality = require("./dimensions/geospatiality");
this.dimensions.temporality = require("./dimensions/temporality");

var uuid = require('uuid/v4');

this.init = function (redis) {

    this.redis = redis;
};
this.save = function (universe) {

    this.redis.set("universe|"+universe.key, JSON.stringify(universe));
};
this.insert = function (object, universe) {

    let hashes = "";

    for(let i = 0; i < universe.dimensions.length; i++) {
        let dimension = this.dimensions[universe.dimensions[i]];
        hashes += (i === 0 ? "" : ":") + dimension.encode(universe.bases[i], universe.precision, object[dimension.key]);
        object[dimension.key] = object[dimension.key].toString();
    }

    let child = "";
    let value = object.key + ":" + hashes;

    for(let i = universe.precision; i >= 0;  i--) {

        let key = "";

        if(i < universe.depth) {

            key = universe.key  + "|index:" + hashes;

            this.redis.zincrby(key, 1, child);
        } else if(i === universe.depth) {

            key = universe.key  + "|set:" + hashes;

            this.redis.sadd(key, value);
        } else if(i === universe.precision) {

            this.redis.hmset(object.key, object);
        }

        let parent = "";
        let arr = hashes.split(":");

        for (var j = 0; j < arr.length; j++)
            parent += (j === 0 ? "" : ":") + this.dimensions[universe.dimensions[j]].parent(universe.bases[j], arr[j]);

        hashes = parent;
        child = key;
    }
};
this.flush = function () {

    this.redis.flushdb();
};
this.randomize = function (name, number, universe) {

    for(let i = 0; i < number; i++) {

        let object = {};

        object.key = name+"|"+uuid();

        for(let j = 0; j < universe.dimensions.length; j++) {
            let dimension = this.dimensions[universe.dimensions[j]];
            object[dimension.key] = dimension.random();
        }

        this.insert(object, universe);
    }
};
