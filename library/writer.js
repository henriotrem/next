this.dimensions = {};
this.dimensions.geospatiality = require("./dimensions/geospatiality");
this.dimensions.temporality = require("./dimensions/temporality");

const { v4: uuid } = require('uuid');

this.init = function (redis) {

    this.redis = redis;
    this.target = {};
};
this.save = function (universe) {

    this.redis.set("universe|"+universe.key, JSON.stringify(universe));
};
this.flush = function () {

    this.redis.flushdb();
};
this.randomize = function (name, number, universe) {

    let root = "";

    for(let i = 0; i < universe.bases.length; i++)
        root += (i === 0 ? "" : ":") + universe.bases[i].root;

    for(let i = 0; i < number; i++) {

        let object = {};

        object.key = name+"|"+uuid();

        for(let j = 0; j < universe.dimensions.length; j++) {
            let dimension = this.dimensions[universe.dimensions[j]];
            object[dimension.key] = dimension.random();
        }

        let hash = this.name(object, universe);
        this.redis.hmset(object.key, object);
        let value = object.key + ":" + hash;

        this.add(hash, value, universe, root);
    }
};
this.name = function(object, universe) {

    let hash = "";

    for(let i = 0; i < universe.dimensions.length; i++) {
        let dimension = this.dimensions[universe.dimensions[i]];
        hash += (i === 0 ? "" : ":") + dimension.encode(universe.bases[i], universe.precision, object[dimension.key]);
        object[dimension.key] = object[dimension.key].toString();
    }

    return hash;
};
this.parent = function(hashes, universe) {

    let parent = "";
    let arr = hashes.split(":");

    for (var j = 0; j < arr.length; j++) {
        let tmp = this.dimensions[universe.dimensions[j]].parent(universe.bases[j], arr[j]);

        if(tmp) {
            parent += (j === 0 ? "" : ":") + tmp;
        } else {
            return null;
        }
    }

    return parent;
};
this.add = function (hash, value, universe, root) {

    hash = this.parent(hash, universe);

    let key = universe.key  + "|list:" + hash;
    let bind = {context: this, key: key, value: value, hash: hash, universe: universe, root: root};

    if(this.parent(hash, universe) === root) {

        this.redis.lpush(bind.key, bind.value, this.push.bind(bind));
    } else {

        this.redis.lpushx(bind.key, bind.value, this.push.bind(bind));
    }
};
this.push = function (err, res) {

    if (res === 0) {

        this.context.add(this.hash, this.value, this.universe, this.root);
    } else {

        this.context.index(this.key, this.hash, this.universe, this.root);

        if (res === this.universe.limit)
            this.context.transfer(this.hash, this.universe);

    }
};
this.index = function(value, hash, universe, root) {

    hash = this.parent(hash, universe);

    let key = universe.key  + "|index:" + hash;

    this.redis.zincrby(key, 1, value);

    if(hash !== root)
        this.index(key, hash, universe, root);

};
this.transfer = function(hash, universe) {

    let arr = hash.split(":");
    let key = universe.key + "|list";
    this.target[hash] = 1;

    for (let i in arr)
        this.target[hash] *= universe.bases[i].alphabet.length;

    this.combinations(hash, key, arr, 0, universe);
};
this.combinations = function(hash, key, arr, i, universe) {

    for(var char1 of universe.bases[i].alphabet) {
        let tmp = key + ":" + arr[i] + char1;

        if ((i + 1) === arr.length) {
            this.generate(tmp, hash, universe);
        } else {
            this.combinations(hash, tmp, arr, i+1, universe);
        }
    }
};
this.generate = function(key, hash, universe){

    this.redis.lpush(key, 1, function(err, res) {

        if(--this.context.target[this.hash] === 0) {

            this.context.erase(this.hash, this.universe);
            this.context.complete(this.hash, this.universe);
        }

    }.bind({context: this, hash: hash, key: key, universe: universe}));
};
this.erase = function(hash, universe) {

    delete this.target[this.hash];

    let key = universe.key  + "|index:" + this.parent(hash, universe);
    let value = universe.key  + "|list:" + hash;

    this.redis.zrem(key, value);
};
this.complete = function(hash, universe) {

    let key = universe.key + "|list:" +hash;

    this.redis.rpop(key, function(err, object) {

        if(object != null) {

            if(object !== "1")
                this.context.add(object.split(/:(.+)/)[1], object, this.universe, this.context.parent(this.hash, this.universe));

            this.context.complete(this.hash, this.universe);
        }
    }.bind({context: this, hash: hash, universe: universe}));
};