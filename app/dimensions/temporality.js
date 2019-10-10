var constant = require("../constant");

this.referentials = [];
this.init = function (origin, limit, base) {

    this.origin = origin;
    this.limit = limit;
    this.referentials = [];
    this.base(base);
};
this.change = function (index) {

    this.referential = this.referentials[index-1];
};
this.base = function (index) {

    this.referentials[index-1] = {};

    this.referentials[index-1].root = constant.root;
    this.referentials[index-1].index = index;
    this.referentials[index-1].base = constant.base[index-1];
    this.referentials[index-1].storage = new Map();

    this.change(index);
};
this.locate = function (absolue) {

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
this.filter = function (distance, direction) {

    var result = true;

    if (this.limit.distance !== null && distance > this.limit.distance)
        result = false;

    if (this.limit.direction !== null && direction !== null && direction !== this.limit.direction)
        result = false;

    return result;
};
this.decode = function (hash) {

    if (hash === this.referential.root)
        return [-Infinity, Infinity];

    var values = hash.split('_');

    var year = values[0];
    var timehash = values[1];

    var offset = 126230400 * year + (946684800);

    var timeMin = (year >= 0 ? 0 : -126230400), timeMax = (year >= 0 ? 126230400 : 0);

    for (var i = 0; i < timehash.length; i++) {

        var idx = constant.base4.indexOf(timehash[i]);

        for (var n = this.referential.index; n >= 0; n--) {

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
this.encode = function (position, precision) {

    if (precision === 0)
        return this.referential.root;

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

        if (++bit === (this.referential.index + 1)) {

            hash += this.referential.base[idx];
            bit = 0;
            idx = 0;
        }
    }

    return year + "_" + hash;
};