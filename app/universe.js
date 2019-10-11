var constant = require("./constant");
var uuid = require('uuid/v4');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

this.init = function (redis, ws, dimensions, depth, precision, step, full) {

    this.redis = redis;
    this.ws = ws;
    this.dimensions = dimensions;
    this.depth = depth;
    this.precision = precision;
    this.limit = step;
    this.step = step;
    this.full = full;
    this.level = 0;
    this.storage = new Map();

    this.layers = [];

    for (var i = 0; i < this.depth+1; i++) {

        this.layers[i] = {};
        this.layers[i].radius = Infinity;
        this.layers[i].removed = {list: [], count: 0};
        this.layers[i].indexed = {list: [], count: 0};
        this.layers[i].selected = {list: [], count: 0};
        this.layers[i].loaded = {list: [], count: 0};
    }
};
this.start = function (root) {

    this.index([root, '0'], 0);

    this.layers[this.level].selected.list.push(this.layers[this.level].indexed.list[0]);
    this.layers[this.level].indexed.list.splice(0, 1);

    this.load();
};
this.index = function (data, depth) {

    var selected = true;
    var element = {};

    element.key = data[0];
    element.depth = depth;
    element.count = parseInt(data[1]);
    element.index = [];
    element.distance = 0;

    var parts = element.key.split('|');

    for (var i in parts) {

        var tmp = parts[i].split(':');

        var dimension = this.dimensions[tmp[0]];
        var key = tmp[1];

        if (dimension !== undefined) {

            var index = {};

            index.key = key;
            index.bounds = dimension.decode(key);

            var result = dimension.locate(index.bounds);

            index.distance = result[0];
            index.direction = result[1];

            element.distance += Math.pow(index.distance, 2);

            if (selected) {

                selected = dimension.filter(index.distance, index.direction);
            }

            dimension.referential.storage.set(key, index);

            element.index.push(index);
        }
    }

    this.storage.set(element.key, element);

    if (selected) {

        this.layers[depth].indexed.list.push(element);
        this.layers[depth].indexed.count += element.count;

        this.ws.send(JSON.stringify({type: 'indexed', body: element}));
    } else {

        this.layers[depth].removed.list.push(element);
        this.layers[depth].removed.count += element.count;

        this.ws.send(JSON.stringify({type: 'removed', body: element}));
    }

    return element;
};
this.more = function () {

    this.level = this.depth;
    this.limit += this.step;

    this.next();
};
this.next = function () {

    if (this.level === 0) {

        if(this.layers[this.depth].loaded.count !== this.limit) {

            this.limit -= this.step;
            this.step--;

            this.more();
        }

    } else if (this.layers[this.depth].loaded.count < this.limit) {

        var layer = this.layers[this.level];

        this.select();

        if (layer.selected.list.length === 0 || layer.loaded.count + layer.selected.count < this.limit) {

            this.level--;
            this.next();
        } else {

            this.load();
        }
    } else {

        if(this.full && this.step > 0) {

            sleep(50).then(() => {
                this.more();
            });
        }

        console.log('Loaded : ' + this.layers[this.depth].loaded.count);
    }
};
this.select = function () {

    var layer = this.layers[this.level];
    var radiusMax = this.layers[this.level - 1].radius;

    var i = -1;

    while (++i < layer.indexed.list.length && layer.indexed.list[i].distance <= radiusMax) {

        layer.selected.count += layer.indexed.list[i].count;
        layer.indexed.count -= layer.indexed.list[i].count;
        layer.selected.list.push(layer.indexed.list[i]);
    }

    layer.indexed.list.splice(0, i);
};
this.load = function () {

    var layer = this.layers[this.level];
    var target = -1;
    var current = 0;

    var i = -1;

    while (++i < layer.selected.list.length && (layer.loaded.count < this.limit || !i)) {

        var element = layer.selected.list[i];

        if (this.level > 0) {
            layer.loaded.count += element.count;
            layer.selected.count -= element.count;
        }

        if (layer.loaded.count >= this.limit) {
            target = i + 1;
        }

        if(this.level < this.depth - 1) {

            this.redis.zrevrangebyscore([element.key, '+inf', '-inf', 'WITHSCORES'], function (err, response) {

                var count = 0;

                for (var j = 0; j < response.length / 2; j++)
                    count += this.universe.index([response[j * 2], response[j * 2 + 1]], (this.universe.level + 1)).count;

                if (this.element.count !== count)
                    this.element.count = count;

                layer.loaded.list.push(this.element);

                if (++current === this.target || !this.universe.level) {

                    this.universe.level++;
                    this.universe.layers[this.universe.level].indexed.list.sort(this.universe.sort);

                    this.universe.next();
                }

            }.bind({universe: this, element: element, target: target}));

        } else if(this.level === this.depth - 1) {

            this.redis.smembers([element.key], function (err, response) {

                var count = 0;

                for (var j = 0; j < response.length; j++)
                    count += this.universe.index([response[j],'1'], (this.universe.level + 1)).count;

                if (this.element.count !== count)
                    this.element.count = count;

                layer.loaded.list.push(this.element);

                if (++current === this.target) {

                    this.universe.level++;
                    this.universe.layers[this.universe.level].indexed.list.sort(this.universe.sort);

                    this.universe.next();
                }

            }.bind({universe: this, element: element, target: target}));

        } else if(this.level === this.depth) {

            this.redis.hgetall([element.key.split('|')[0]], function (err, response) {

                response.distance = Math.sqrt(this.element.distance);

                layer.loaded.list.push(this.element);

                this.universe.ws.send(JSON.stringify({type: 'object', body: response}));

                if (++current === this.target) {

                    this.universe.level++;
                    this.universe.next();
                }

            }.bind({universe: this, element: element, target: target}));

        }
    }

    layer.selected.list.splice(0, target);

    if (this.level > 0) {

        layer.radius = (layer.selected.list.length > 0) ? layer.selected.list[0].distance : this.layers[this.level - 1].radius;

        var removed = this.layers[this.level - 1].loaded.count - (layer.indexed.count + layer.selected.count + layer.loaded.count);

        if(removed > 0){

            for(var level = this.level - 1; level > 0; level--) {

                this.layers[level].loaded.count -= removed;
                this.layers[level].removed.count += removed;
            }
        }
    }
};
this.sort = function (a, b) {

    return a.distance - b.distance;
};
this.parent = function (key) {

    var parts = key.split('|');
    var parentKey = "";

    for (var i in parts) {

        if (i > 0)
            parentKey += '|';

        var tmp = parts[i].split(':');

        if (this.dimensions[tmp[0]] !== undefined) {

            var subkey;

            if (tmp[1] === constant.root) {

                return null;
            } else if (tmp[1].length === 1) {

                subkey = constant.root;
            } else {

                subkey = tmp[1].slice(0, -1);
            }

            parentKey += tmp[0] + ':' + subkey;
        } else {

            parentKey += parts[i];
        }
    }

    return parentKey;
};
this.insert = function (object) {

    this.redis.hmset(object.key, object);

    var geohash = this.dimensions.space.encode([object.latitude, object.longitude], this.precision);

    var parent = "index:action|space:" + geohash;
    var value = object.key + "|space:" + geohash;

    for(var j = this.precision; j > 0;  j--) {

        var child = parent;
        parent = this.parent(parent);

        if(j === this.depth) {
            this.redis.sadd(parent, value);
        } else if(j < this.depth) {
            this.redis.zincrby(parent, 1, child);
        }
    }
};
this.flush = function () {

    this.redis.flushdb(function (err, succeeded) { console.log(succeeded); });
};
this.randomize = function (limit) {

    for(var i = 0; i < limit; i++) {

        var action = {};

        action.latitude = (Math.random()-0.5)*180;
        action.longitude = (Math.random()-0.5)*360;
        action.time = 1562066591;
        action.key = "action:"+uuid();

        this.insert(action);
    }
};
