this.init = function (redis, dimensions, bases, depth, origin, filter, step) {

    this.redis = redis;

    this.dimensions = dimensions;
    this.bases = bases;
    this.depth = depth;
    this.origin = origin;
    this.filter = filter;
    this.limit = step;
    this.step = step;
    this.level = 0;

    this.layers = [];

    for (var i = 0; i < this.depth; i++) {

        this.layers[i] = {};
        this.layers[i].radius = Infinity;
        this.layers[i].indexed = {list: [], count: 0};
        this.layers[i].selected = {list: [], count: 0};
        this.layers[i].loaded = {list: [], count: 0};
    }

    this.layer = this.layers[this.level];
};
this.start = function (root) {

    this.layer.selected.list.push(this.create(root, 0));
    this.query();
};
this.more = function () {

    this.level = this.depth;
    this.limit += this.step;

    this.next();
};
this.next = function () {

    this.layer = this.layers[this.level];

    if (this.level === 0) {

        if(this.layers[this.depth].loaded.count !== this.limit) {

            this.limit -= this.step;
            this.step--;

            this.more();
        }

    } else if (this.layers[this.depth].loaded.count < this.limit) {

        this.select();

        if (this.layer.loaded.count + this.layer.selected.count < this.limit) {

            this.level--;
            this.next();
        } else {

            this.query();
        }
    }
};
this.select = function () {

    var i = -1;

    while (++i < this.layer.indexed.list.length && this.layer.indexed.list[i].distance <= this.layers[this.level - 1].radius) {

        this.layer.selected.count += this.layer.indexed.list[i].count;
        this.layer.indexed.count -= this.layer.indexed.list[i].count;
        this.layer.selected.list.push(this.layer.indexed.list[i]);
    }

    this.layer.indexed.list.splice(0, i);
};
this.query = function () {

    var potential = this.layer.loaded.count;
    var i = -1;

    this.target = -1;
    this.current = 0;

    while (++i < this.layer.selected.list.length && potential < this.limit) {

        var element = this.layer.selected.list[i];

        if (potential += element.count >= this.limit || element.count === 0)
            this.target = i + 1;

        if(this.level < this.depth - 1) {

            this.redis.zrevrangebyscore([element.key, '+inf', '-inf', 'WITHSCORES'], this.parseIndex(err, response).bind({element : element}));
        } else if(this.level === this.depth - 1) {

            this.redis.smembers([element.key], this.parseSet(err, response).bind({element : element}));
        } else if(this.level === this.depth) {

            this.redis.hgetall([element.key.split(SEPARATOR)[0]], this.parseObject(err, response).bind({element : element}));
        }
    }

};
this.parseIndex = function(err, response) {

    for (var j = 0; j < response.length / 2; j++)
        this.store(this.create(response[j * 2], parseInt(response[j * 2 + 1])));

    if(this.confirm(this.element)) {

        this.update();
        this.next();
    }
};
this.parseSet = function(err, response) {

    for (var j = 0; j < response.length; j++)
        this.store(this.create(response[j], 1))

    if(this.confirm(this.element)) {

        this.update();
        this.next();
    }
};
this.parseObject = function(err, response) {

    response.distance = Math.sqrt(this.element.distance);
    response.count = 1;

    if(this.confirm(response)) {

        //RETURN
        console.log("SUCCESS");
    }
};
this.create = function(key, count) {

    var element = {};

    element.key = key;
    element.count = count;
    element.index = [];
    element.distance = 0;
    element.selected = true;

    var array = key.split(SEPARATOR);

    for (var i = 1; i < array.length; i++) {

        var dimension = this.dimensions[i-1];
        var index = {};

        index.key = array[i];
        index.bounds = dimension.decode(index.key, this.bases[i-1]);

        index.distance = dimension.indexDistance(this.origin[i-1], index.bounds);
        index.direction = dimension.indexDirection(this.origin[i-1], index.bounds);

        element.distance += Math.pow(index.distance, 2);
        element.selected &= dimension.filterDirection(this.filter.direction[i-1], index.direction) && dimension.filterDistance(this.filter.distance[i-1],  index.distance);

        element.index.push(index);
    }

    return element;
};
this.store = function(element) {

    if(element.selected) {

        this.layers[this.level+1].indexed.list.push(element);
        this.layers[this.level+1].indexed.count += element.count;
    }
};
this.confirm = function(element) {

    this.layer.loaded.list.push(element);
    this.layer.loaded.count += element.count;
    this.layer.selected.count -= element.count;

    if (++this.current === this.target || this.level === 0)
        this.layer.selected.list.splice(0, this.target);
};
this.update = function() {

    var delta = this.layer.loaded.count - (this.layers[this.level + 1].indexed.count + this.layers[this.level + 1].selected.count + this.layers[this.level + 1].loaded.count);

    if(delta !== 0)
        for(var level = this.level; level >= 0; level--)
            this.layers[level].loaded.count -= delta;

    this.layer.radius = this.layer.indexed[0].distance;
    this.layers[++this.level].indexed.list.sort(this.sort);
};
this.sort = function (a, b) {

    return a.distance - b.distance;
};