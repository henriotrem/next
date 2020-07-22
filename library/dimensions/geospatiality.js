this.key = "geospatiality";
this.pointDistance = function (origin, destination) {
    var lat1 = Math.PI * origin[0] / 180;
    var lat2 = Math.PI * destination[0] / 180;
    var theta = Math.PI * (destination[1] - origin[1]) / 180;
    var dist = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(theta);
    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.151 * 1.609344;
    return dist;
};
this.pointDirection = function (origin, destination) {
    var lat1 = origin[0] * Math.PI / 180;
    var lat2 = destination[0] * Math.PI / 180;
    var theta = Math.PI * (destination[1] - origin[1]) / 180;
    return Math.atan2(Math.sin(theta) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(theta)) * 180 / Math.PI;
};
this.indexLocation = function(origin, bounds) {
    var location = 0;
    if (bounds[0] < origin[0] && origin[0] < bounds[2])
        location += 1;
    if (bounds[1] < origin[1] && origin[1] < bounds[3])
        location += 2;
    return location;
};
this.indexDistance = function (origin, bounds) {
    var location = this.indexLocation(origin, bounds);
    if(location === 0){
        return Math.min(this.pointDistance(origin, [bounds[0], bounds[1]]), this.pointDistance(origin, [bounds[2], bounds[1]]), this.pointDistance(origin, [bounds[2], bounds[3]]), this.pointDistance(origin, [bounds[0], bounds[3]]));
    } else if(location === 1) {
        return Math.min(this.pointDistance(origin, [bounds[0], bounds[1]]), this.pointDistance(origin, [bounds[2], bounds[1]]), this.pointDistance(origin, [bounds[2], bounds[3]]), this.pointDistance(origin, [bounds[0], bounds[3]]), this.pointDistance(origin, [origin[0], bounds[1]]), this.pointDistance(origin, [origin[0], bounds[3]]));
    } else if(location === 2) {
        return Math.min(this.pointDistance(origin, [bounds[0], bounds[1]]), this.pointDistance(origin, [bounds[2], bounds[1]]), this.pointDistance(origin, [bounds[2], bounds[3]]), this.pointDistance(origin, [bounds[0], bounds[3]]), this.pointDistance(origin, [bounds[0], origin[1]]), this.pointDistance(origin, [bounds[2], origin[1]]));
    } else {
        return 0;
    }
};
this.indexDirection = function (origin, bounds) {
    var location = this.indexLocation(origin, bounds);
    if(location !== 3) {
        return [this.pointDirection(origin, [bounds[0], bounds[1]]), this.pointDirection(origin, [bounds[2], bounds[1]]), this.pointDirection(origin, [bounds[2], bounds[3]]), this.pointDirection(origin, [bounds[0], bounds[3]])];
    } else {
        return null;
    }
};
this.filterDistance = function (limit, distance) {
    return limit !== 0 ? (distance <= limit) : true;
};
this.filterDirection =  function(limit, direction) {
    if (limit !== null && direction !== null) {
        let normal = limit[0] < limit[1];
        for(let i = 0; i < direction.length; i++) {
            let tmp1 = direction[i] >= limit[0]
            let tmp2 = direction[i] <= limit[1];
            if (normal && tmp1 && tmp2 || !normal && (tmp1 || tmp2) )
                return true;
        }
        let min = Math.min(...direction);
        let max = Math.max(...direction);
        return (max - min > 180 && limit[0] >= max || normal && min<= limit[0] && max >= limit[1])
    }
    return true;
};
this.decode = function (base, hash) {
    if (hash === base.root)
        return [-90, -180, 90, 180];
    var evenBit = true;
    var latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;
    for (var i = 0; i < hash.length; i++) {
        var idx = base.alphabet.indexOf(hash[i]);
        for (var n = base.bit-1; n >= 0; n--) {
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
this.encode = function (base, precision, position) {

    if (precision === 0)
        return base.root;

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

        if (++bit === (base.bit)) {
            geohash += base.alphabet[idx];
            bit = 0;
            idx = 0;
        }
    }

    return geohash;
};
this.parent = function(base, hash) {

    if(hash === base.root) {

        return null;
    } else if(hash.length === 1) {

        return base.root;
    } else {

        return hash.slice(0, -1);
    }
};
this.random = function() {

    return [(Math.random()-0.5)*180, (Math.random()-0.5)*360];
};