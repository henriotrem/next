var constant = require("./constant");
var redis = require("redis");

this.init = function (connection, key, depth, step) {

    this.client = redis.createClient(connection);
    this.client.on("error", function (err) {console.log("Error " + err);});

    this.depth = depth;
    this.limit = step;
    this.step = step;
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

    this.index([key, '0'], 0);

    this.layers[this.level].selected.list.push(this.layers[this.level].indexed.list[0]);
    this.layers[this.level].indexed.list.splice(0, 1);
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

            var result = dimension.locate(dimension.decode(key));

            index.distance = result[0];
            index.direction = result[1];

            element.distance += Math.pow(index.distance, 2);

            if (selected) {

                selected = dimension.filter(index.distance, index.direction);
            }

            dimension.storage.set(key, index);

            element.index.push(index);
        }
    }

    this.storage.set(element.key, element);

    if (selected) {

        this.layers[depth].indexed.list.push(element);
        this.layers[depth].indexed.count += element.count;
    } else {

        this.layers[depth].removed.list.push(element);
    }

    return element;
};
this.more = function () {

    this.level = 1;
    this.limit += this.step;

    this.next();
};
this.next = function () {

    if (this.level === 0) {

        this.client.quit();

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

        this.more();
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

        if (element.distance > 0) {
            layer.radius = element.distance;
        }

        if (this.level > 0) {
            layer.loaded.count += element.count;
            layer.selected.count -= element.count;
        }

        if (layer.loaded.count >= this.limit) {
            target = i + 1;
        }

        if(this.level < this.depth - 1) {

            this.client.zrevrangebyscore([element.key, '+inf', '-inf', 'WITHSCORES'], function (err, response) {

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

            this.client.smembers([element.key], function (err, response) {

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

            this.client.hgetall([element.key.split('|')[0]], function (err, response) {

                response.distance = this.element.distance;

                console.log(response);

                layer.loaded.list.push(this.element);

                if (++current === this.target) {

                    this.universe.level++;
                    this.universe.next();
                }

            }.bind({universe: this, element: element, target: target}));

        }
    }

    layer.selected.list.splice(0, target);
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