var constant = require("../constant");

this.distance = function (destination) {

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
this.direction = function (destination) {

    if (!destination)
        return null;

    var lat1 = this.origin[0] * Math.PI / 180;
    var lat2 = destination[0] * Math.PI / 180;
    var theta = Math.PI * (destination[1] - this.origin[1]) / 180;

    return Math.atan2(Math.sin(theta) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(theta)) * 180 / Math.PI;
};
this.locate = function (absolue) {

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
this.filter = function (distance, direction) {

    var result = true;

    if (this.limit.distance !== null && distance > this.limit.distance)
        result = false;

    if (this.limit.direction !== null && direction !== null && (direction[1] < this.limit.direction[0] || direction[0] > this.limit.direction[1]))
        result = false;

    return result;
};
this.decode = function (hash) {

    if (hash === constant.root)
        return [-90, -180, 90, 180];

    var evenBit = true;
    var latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;

    for (var i = 0; i < hash.length; i++) {

        var idx = constant.base16.indexOf(hash[i]);

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
this.encode = function (position, precision) {

    if (precision === 0)
        return constant.root;

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

            geohash += constant.base16[idx];
            bit = 0;
            idx = 0;
        }
    }

    return geohash;
};