this.dimensions = {};
this.dimensions.geospatiality = require("./dimensions/geospatiality");
this.dimensions.temporality = require("./dimensions/temporality");

this.init = function (redis, universes, origin, filter, step, callback) {

    this.redis = redis;

    this.origin = origin;
    this.filter = filter;
    this.step = step;
    this.limit = step;
    this.level = 0;
    this.callback = callback;

    this.layers = [this.new(), this.new()];
    this.layer = this.layers[this.level];
    this.result = [];

    this.prepare(universes);

    this.queries = 0;
    this.unique = 0;
};
this.new = function() {

    let layer = {};
    layer.radius = Infinity;
    layer.indexed = {list: [], count: 0};
    layer.selected = {list: [], count: 0};
    layer.loaded = {list: [], count: 0};
    layer.waiting = 0;
    layer.target = 0;

    return layer;
};
this.prepare = function(universes) {

    this.universes = {};
    let size = universes.length;

    for(let name of universes) {

        this.redis.get("universe|"+name, function(err, response) {

            this.universes[this.name] = JSON.parse(response);

            let root = this.name + "|index";

            for(let base of this.universes[this.name].bases)
                root += ":" + base.root;

            this.layer.selected.list.push(this.view.create(root, 0, this.universes[this.name]));

            if(++this.layer.target === this.size)
                this.view.query();

        }.bind({view: this, universes: this.universes, name: name, layer: this.layer, size: size}));
    }
};
this.create = function(key, count, universe) {

    var element = {};

    element.key = key;
    element.universe = universe;
    element.type = key.indexOf("index") !== -1 ? "index" : key.indexOf("list") !== -1 ? "list" : "object";
    element.count = count;
    element.index = [];
    element.distance = 0;
    element.selected = true;

    var array = key.split(":");

    for (var i = 1; i < array.length; i++) {

        var dimension = this.dimensions[universe.dimensions[i-1]];
        var index = {};

        index.key = array[i];
        index.bounds = dimension.decode(universe.bases[i-1], index.key);

        index.distance = dimension.indexDistance(this.origin[dimension.key], index.bounds);
        index.direction = dimension.indexDirection(this.origin[dimension.key], index.bounds);

        element.distance += Math.pow(index.distance/this.filter[dimension.key].ratio, 2);
        element.selected = element.selected && dimension.filterDirection(this.filter[dimension.key].direction, index.direction) && dimension.filterDistance(this.filter[dimension.key].distance,  index.distance);

        element.index.push(index);
    }

    return element;
};
this.more = function () {

    this.queries = 0;
    this.unique = 0;

    this.level = this.layers.length-1;
    this.limit += this.step;
    this.result = [];

    this.next();
};
this.next = function () {

    this.layer = this.layers[this.level];

    if(this.level === 0) {

        this.limit -= this.step;
        this.more();
    } else if(this.select()){

        this.query();
    } else {

        this.level--;
        this.next();
    }
};
this.select = function () {

    let result = false;
    let selected = 0;
    let limit = 9 * Object.keys(this.universes).length;

    this.layer.indexed.list.sort(this.sort);

    if(this.layer.indexed.list.length === 0 && this.layer.selected.list.length > 0)
        result = true;

    for (let element of this.layer.indexed.list) {

        if(element.distance >= this.layers[this.level - 1].radius)
            break;

        if(this.layers.length === this.level + 1 && element.type !== 'object')
            this.layers.push(this.new());

        this.layer.selected.count += element.count;
        this.layer.indexed.count -= element.count;
        this.layer.selected.list.push(element);
        selected++;

        if(this.layer.loaded.count + this.layer.selected.count - this.layer.waiting >= this.limit) {
            result = true;

            if(this.layers[this.layers.length-1].loaded.count !== 0 || selected > limit || (this.level+1) === this.layers.length)
                break
        }
    }

    this.layer.indexed.list.splice(0, selected);
    this.layer.target += selected;

    this.adjust();

    return result;
};
this.adjust = function () {

    if(this.layer.selected.list.length > 0) {
        this.layer.radius = this.layer.selected.list[this.layer.selected.list.length-1].distance;
    } else if(this.level > 0) {
        this.layer.radius = this.layers[this.level-1].radius;
    }

    this.layers[this.level - 1].waiting = this.layer.indexed.count + this.layer.waiting;
    this.layers[this.level - 1].loaded.count = this.layer.indexed.count + this.layer.selected.count + this.layer.loaded.count;
};
this.query = function () {

    for (let element of this.layer.selected.list)
        this[element.type](element);

};
this.index = function(element) {

    this.redis.zrevrangebyscore([element.key, '+inf', '-inf', 'WITHSCORES'], function (err, response) {

        this.view.unique+= JSON.stringify(response).length;

        for (var j = 0; j < response.length / 2; j++)
            this.view.store(this.view.create(response[j * 2], parseInt(response[j * 2 + 1]), this.element.universe), this.storage);

        this.view.update(this.element);

    }.bind({view: this, layer: this.layer, storage: this.layers[this.level+1], element: element}));
};
this.list = function(element) {

    this.redis.lrange([element.key, 0, -1], function(err, response) {

        this.view.unique+= JSON.stringify(response).length;

        for (var j = 0; j < response.length - 1; j++)
            this.view.store(this.view.create(response[j], 1, this.element.universe), this.storage);

        this.view.update(this.element);

    }.bind({view: this, layer: this.layer, storage: this.layers[this.level+1], element: element}));
};
this.object = function(element) {

    if(this.level + 1 === this.layers.length) {

        this.redis.hgetall([element.key.split(":")[0]], function (err, response) {

            response.distance = Math.sqrt(this.element.distance);
            response.index = this.element.index;
            response.temporality = new Date(parseInt(response.temporality) * 1000);

            this.result.push(response);
            this.layer.loaded.count++;

            if (--this.layer.target === 0) {

                this.layer.selected.list = [];
                this.layer.selected.count = 0;

                this.result.sort(this.sort);

                this.callback(this.result);
            }

        }.bind({
            context: this,
            layer: this.layer,
            callback: this.callback,
            sort: this.sort,
            result: this.result,
            element: element
        }));
    } else {

        this.store(element, this.layers[this.level+1]);
        this.update(element);
    }
};
this.store = function (element, storage) {

    if (element.selected) {

        storage.indexed.list.push(element);
        storage.indexed.count += element.count;
    }
};
this.update = function(element) {

    this.layer.loaded.count += element.count;

    if (--this.layer.target === 0) {

        this.queries++;
        this.layer.selected.list = [];
        this.layer.selected.count = 0;
        this.level++;

        this.next();
    }
};
this.sort = function (a, b) {

    return a.distance - b.distance;
};