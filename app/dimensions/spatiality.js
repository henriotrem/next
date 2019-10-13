var constant = require("../constant");

this.referentials;

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

    //point 1 : [absolue[0],absolue[1]]
    //point 2 : [absolue[2],absolue[1]]
    //point 3 : [absolue[2],absolue[3]]
    //point 4 : [absolue[0],absolue[3]]

    var direction;
    var distance;
    var data = 0;

    if (absolue[0] < this.origin[0] && this.origin[0] < absolue[2]) {

        data += 1;
    }

    if (absolue[1] < this.origin[1] && this.origin[1] < absolue[3]) {

        data += 2;
    }

    if(data === 3) {

        return [0, null];
    } else {

        if(data === 1) {

            distance = Math.min(this.distance([absolue[0], absolue[1]]), this.distance([absolue[2], absolue[1]]), this.distance([absolue[2], absolue[3]]), this.distance([absolue[0], absolue[3]]), this.distance([this.origin[0], absolue[1]]), this.distance([this.origin[0], absolue[3]]));
        } else if(data === 2) {

            distance = Math.min(this.distance([absolue[0], absolue[1]]), this.distance([absolue[2], absolue[1]]), this.distance([absolue[2], absolue[3]]), this.distance([absolue[0], absolue[3]]), this.distance([absolue[0], this.origin[1]]), this.distance([absolue[2], this.origin[1]]));
        } else {

            distance = Math.min(this.distance([absolue[0], absolue[1]]), this.distance([absolue[2], absolue[1]]), this.distance([absolue[2], absolue[3]]), this.distance([absolue[0], absolue[3]]));
        }

        direction = [this.direction([absolue[0], absolue[1]]), this.direction([absolue[2], absolue[1]]), this.direction([absolue[2], absolue[3]]), this.direction([absolue[0], absolue[3]])];
    }

    return [distance, direction];
};
this.filter = function (distance, direction, depth) {

    if (this.limit.distance !== null && distance > this.limit.distance)
        return false;

    if (this.limit.direction !== null && direction !== null) {

        if(depth < 2)
            return true;

        if(this.limit.direction[0] < this.limit.direction[1]) {

            for(let i = 0; i < direction.length; i++) {

                    if (direction[i] >= this.limit.direction[0] && direction[i] <= this.limit.direction[1]) {

                        return true;
                    }
            }

            let min = Math.min(...direction);
            let max = Math.max(...direction);

            if(max - min > 180) {

                if(this.limit.direction[0] >= max) {

                    return true;
                }

            } else if (min<= this.limit.direction[0] && max >= this.limit.direction[1]) {

                return true;
            }

        } else {

            for(let i = 0; i < direction.length; i++) {

                if (direction[i] >= this.limit.direction[0] || direction[i] <= this.limit.direction[1]) {

                    return true
                }
            }

            let min = Math.min(...direction);
            let max = Math.max(...direction);

            if(max - min > 180 && this.limit.direction[0] >= max) {

                return true;

            }
        }

        return false;
    }

    return true;

};
this.decode = function (hash) {

    if (hash === this.referential.root)
        return [-90, -180, 90, 180];

    var evenBit = true;
    var latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;

    for (var i = 0; i < hash.length; i++) {

        var idx = this.referential.base.indexOf(hash[i]);

        for (var n = this.referential.index; n >= 0; n--) {

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
        return this.referential.root;

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

        if (++bit === (this.referential.index + 1)) {

            geohash += this.referential.base[idx];
            bit = 0;
            idx = 0;
        }
    }

    return geohash;
};