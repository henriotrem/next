var redis = require("redis");

var base4 = "ABCD";
var base8 = "ABCDEFGH";
var base16 = "ABCDEFGHIJKLMNOP";
var base32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg";
var base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/////////////////////////////////////////

this.temporality = {};

this.temporality.locate = function (absolue) {

    var dist;
    var direction;

    if (this.origin < absolue[0]) {

        dist = absolue[0] - this.origin;
        direction = 1;
    } else if (this.origin > absolue[1]) {

        dist = this.origin - absolue[1];
        direction = -1;
    } else {

        dist = 0;
        direction = null;
    }

    return [dist, direction];
};
this.temporality.filter = function (distance, direction) {

    var result = true;

    if (this.limit.distance !== null && distance > this.limit.distance)
        result = false;

    if (this.limit.direction !== null && direction !== null && direction !== this.limit.direction)
        result = false;

    return result;
};
this.temporality.decode = function (hash) {

    if (hash === "ALL")
        return [-Infinity, Infinity];

    var values = hash.split('_');

    var year = values[0];
    var timehash = values[1];

    var offset = 126230400 * year + (946684800);

    var timeMin = (year >= 0 ? 0 : -126230400), timeMax = (year >= 0 ? 126230400 : 0);

    for (var i = 0; i < timehash.length; i++) {

        var idx = base4.indexOf(timehash[i]);

        for (var n = 1; n >= 0; n--) {

            var bitN = idx >> n & 1;

            var timeMid = (timeMin + timeMax) / 2;
            if (bitN === 1) {
                timeMin = timeMid;
            } else {
                timeMax = timeMid;
            }
        }
    }

    return [timeMin + offset, timeMax + offset];
};
this.temporality.encode = function (position, precision) {

    if (precision === 0)
        return "ALL";

    var realTimestamp = position - (946684800);

    var time = (realTimestamp % 126230400);
    var year = (realTimestamp / 126230400 >> 0);

    var idx = 0;
    var bit = 0;
    var hash = "";

    var timeMin = (year >= 0 ? 0 : -126230400), timeMax = (year >= 0 ? 126230400 : 0);

    while (hash.length < precision) {

        var timeMid = (timeMin + timeMax) / 2;

        if (time > timeMid) {
            idx = idx * 2 + 1;
            timeMin = timeMid;
        } else {
            idx = idx * 2;
            timeMax = timeMid;
        }

        if (++bit === 2) {

            hash += base4[idx];
            bit = 0;
            idx = 0;
        }
    }

    return year + "_" + hash;
};

/////////////////////////////////////////

this.spatiality = {};

this.spatiality.distance = function (destination) {

    var lat1 = Math.PI * this.origin[0] / 180;
    var lat2 = Math.PI * destination[0] / 180;
    var theta = Math.PI * (destination[1] - this.origin[1]) / 180;
    var dist = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(theta);

    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.151 * 1.609344;

    return dist;
};
this.spatiality.direction = function (destination) {

    if (!destination)
        return null;

    var lat1 = this.origin[0] * Math.PI / 180;
    var lat2 = destination[0] * Math.PI / 180;
    var theta = Math.PI * (destination[1] - this.origin[1]) / 180;

    return Math.atan2(Math.sin(theta) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(theta)) * 180 / Math.PI;
};
this.spatiality.locate = function (absolue) {

    var data;

    var destination = [];
    var border1 = [];
    var border2 = [];

    if (this.origin[0] < absolue[0]) {

        destination[0] = absolue[0];
        data = 10
    } else if (this.origin[0] > absolue[2]) {

        destination[0] = absolue[2];
        data = 20
    } else {

        destination[0] = this.origin[0];
        data = 0
    }

    if (this.origin[1] < absolue[1]) {

        destination[1] = absolue[1];
        data += 1
    } else if (this.origin[1] > absolue[3]) {

        destination[1] = absolue[3];
        data += 2
    } else {

        destination[1] = this.origin[1];
        data += 0
    }

    if (data === 1) {

        border1 = [absolue[2], absolue[1]];
        border2 = [absolue[0], absolue[1]];
    } else if (data === 2) {

        border1 = [absolue[0], absolue[3]];
        border2 = [absolue[2], absolue[3]];
    } else if (data === 10) {

        border1 = [absolue[0], absolue[1]];
        border2 = [absolue[0], absolue[3]];
    } else if (data === 20) {

        border1 = [absolue[2], absolue[3]];
        border2 = [absolue[2], absolue[1]];
    } else if (data === 11) {

        border1 = [absolue[2], absolue[1]];
        border2 = [absolue[0], absolue[3]];
    } else if (data === 22) {

        border1 = [absolue[0], absolue[3]];
        border2 = [absolue[2], absolue[1]];
    } else if (data === 12) {

        border1 = [absolue[0], absolue[1]];
        border2 = [absolue[2], absolue[3]];
    } else if (data === 21) {

        border1 = [absolue[2], absolue[3]];
        border2 = [absolue[0], absolue[1]];
    } else {

        return [0, null, null]
    }

    var direction = [this.direction(border1), this.direction(border2)];
    var dist = this.distance(destination);

    return [dist, direction];
};
this.spatiality.filter = function (distance, direction) {

    var result = true;

    if (this.limit.distance !== null && distance > this.limit.distance)
        result = false;

    if (this.limit.direction !== null && direction !== null && (direction[1] < this.limit.direction[0] || direction[0] > this.limit.direction[1]))
        result = false;

    return result;
};
this.spatiality.decode = function (hash) {

    if (hash === "EARTH")
        return [-90, -180, 90, 180];

    var values = hash.split('_');

    var year = values[0];
    var geohash = values[1];

    var evenBit = true;
    var latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;

    for (var i = 0; i < geohash.length; i++) {

        var idx = base16.indexOf(geohash[i]);

        for (var n = 3; n >= 0; n--) {

            var bitN = idx >> n & 1;

            if (evenBit) {

                var lonMid = (lonMin + lonMax) / 2;
                if (bitN === 1) {
                    lonMin = lonMid;
                } else {
                    lonMax = lonMid;
                }
            } else {

                var latMid = (latMin + latMax) / 2;
                if (bitN === 1) {
                    latMin = latMid;
                } else {
                    latMax = latMid;
                }
            }

            evenBit = !evenBit;
        }
    }

    return [latMin, lonMin, latMax, lonMax];
};
this.spatiality.encode = function (position, precision) {

    if (precision === 0)
        return "EARTH";

    var lat = position[0];
    var lon = position[1];

    var idx = 0;
    var bit = 0;
    var evenBit = true;
    var geohash = "";

    var latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;

    while (geohash.length < precision) {

        if (evenBit) {

            var lonMid = (lonMin + lonMax) / 2;

            if (lon > lonMid) {
                idx = idx * 2 + 1;
                lonMin = lonMid;
            } else {
                idx = idx * 2;
                lonMax = lonMid;
            }
        } else {

            var latMid = (latMin + latMax) / 2;

            if (lat > latMid) {
                idx = idx * 2 + 1;
                latMin = latMid;
            } else {
                idx = idx * 2;
                latMax = latMid;
            }
        }

        evenBit = !evenBit;

        if (++bit === 4) {

            geohash += base16[idx];
            bit = 0;
            idx = 0;
        }
    }

    return "EARTH_" + geohash;
};

/////////////////////////////////////////

this.search = {};

this.search.init = function (connection, key, depth, step) {

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
this.search.index = function (data, depth) {

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
this.search.more = function () {

    this.level = 1;
    this.limit += this.step;

    this.next();
};
this.search.next = function () {

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
this.search.select = function () {

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
this.search.load = function () {

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
                    count += this.search.index([response[j * 2], response[j * 2 + 1]], (this.search.level + 1)).count;

                if (this.element.count !== count)
                    this.element.count = count;

                layer.loaded.list.push(this.element);

                if (++current === this.target || !this.search.level) {

                    this.search.level++;
                    this.search.layers[this.search.level].indexed.list.sort(this.search.sort);

                    this.search.next();
                }

            }.bind({search: this, element: element, target: target}));

        } else if(this.level === this.depth - 1) {

            this.client.smembers([element.key], function (err, response) {

                var count = 0;

                for (var j = 0; j < response.length; j++)
                    count += this.search.index([response[j],'1'], (this.search.level + 1)).count;

                if (this.element.count !== count)
                    this.element.count = count;

                layer.loaded.list.push(this.element);

                if (++current === this.target) {

                    this.search.level++;
                    this.search.layers[this.search.level].indexed.list.sort(this.search.sort);

                    this.search.next();
                }

            }.bind({search: this, element: element, target: target}));

        } else if(this.level === this.depth) {

            this.client.hgetall([element.key.split('|')[0]], function (err, response) {

                response.distance = this.element.distance;

                console.log(response);

                layer.loaded.list.push(this.element);

                if (++current === this.target) {

                    this.search.level++;
                    this.search.next();
                }

            }.bind({search: this, element: element, target: target}));

        }
    }

    layer.selected.list.splice(0, target);
};
this.search.sort = function (a, b) {

    return a.distance - b.distance;
};
this.search.parent = function (key, depth) {

    if (depth === 0)
        return null;

    var parts = key.split('|');
    var parentKey = "";

    for (var i in parts) {

        var tmp = parts[i].split(':');

        var dimension = this.dimensions[tmp[0]];
        var subkey = tmp[1];

        if (dimension !== undefined) {

            if (depth === 1) {

                subkey = dimension.encode("", 0);
            } else {

                subkey = subkey.slice(0, -1);
            }
        }

        if (i > 0)
            parentKey += '|';

        parentKey += tmp[0] + ':' + subkey;
    }

    return parentKey;
};