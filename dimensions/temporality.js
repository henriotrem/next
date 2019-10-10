var constant = require("../constant");

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

    if (hash === constant.root)
        return [-Infinity, Infinity];

    var values = hash.split('_');

    var year = values[0];
    var timehash = values[1];

    var offset = 126230400 * year + (946684800);

    var timeMin = (year >= 0 ? 0 : -126230400), timeMax = (year >= 0 ? 126230400 : 0);

    for (var i = 0; i < timehash.length; i++) {

        var idx = constant.base4.indexOf(timehash[i]);

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
this.encode = function (position, precision) {

    if (precision === 0)
        return constant.root;

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

            hash += constant.base4[idx];
            bit = 0;
            idx = 0;
        }
    }

    return year + "_" + hash;
};