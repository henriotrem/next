this.key = "temporality";
this.pointDistance = function(origin, destination) {
    return Math.abs(destination - origin);
};
this.pointDirection = function(origin, destination) {
    return Math.sign(origin - destination);
};
this.indexDistance = function(origin, bounds) {
    return (origin < bounds[0] ? this.pointDistance(origin, bounds[0]) : origin > bounds[1] ? this.pointDistance(origin, bounds[1]) : 0);
};
this.indexDirection = function(origin, bounds) {
    return (origin < bounds[0] ? 1 : origin > bounds[1] ? -1 : null);
};
this.filterDistance = function (limit, distance) {
    return limit !== 0 ? (distance <= limit) : true;
};
this.filterDirection =  function(limit, direction) {
    return limit !== null && direction !== null? direction === limit : true;
};
this.decode = function (base, hash) {
    if (hash === base.root)
        return [-Infinity, Infinity];

    var values = hash.split('_');
    var year = values[0];
    var timehash = values[1];
    var offset = 126230400 * year + (946684800);
    var timeMin = (year >= 0 ? 0 : -126230400), timeMax = (year >= 0 ? 126230400 : 0);
    for (var i = 0; i < timehash.length; i++) {
        var idx = base.alphabet.indexOf(timehash[i]);
        for (var n = base.bit-1; n >= 0; n--) {
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
this.encode = function (base, precision, position) {

    if (precision === 0)
        return base.root;

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

        if (++bit === (base.bit)) {

            hash += base.alphabet[idx];
            bit = 0;
            idx = 0;
        }
    }

    return year + "_" + hash;
};
this.parent = function(base, hash) {

    if(hash === base.root) {

        return null;
    } else if(hash[hash.length - 2] === "_") {

        return base.root;
    } else {

        return hash.slice(0, -1);
    }
};
this.random = function() {

    return  ((1753007253 - 1437388053) * Math.random() + 1437388053);
};