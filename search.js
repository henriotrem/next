var next = require("./next.js");
var universe = next.universe;

universe.dimensions = {};

universe.dimensions.space = next.spatiality;
universe.dimensions.space.origin = [47.864716, 2.349014];
universe.dimensions.space.limit = { distance : null, direction : null };
universe.dimensions.space.storage = new Map();

/*
universe.dimensions.time = omega.temporality;
universe.dimensions.time.origin = 1562066591;
universe.dimensions.time.limit = { distance : null, direction : null };
universe.dimensions.time.storage = new Map();
*/

universe.init({port: 6379,host: '127.0.0.1'},'index:action|space:#',9, 10);
universe.load();