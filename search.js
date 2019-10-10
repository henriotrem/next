var omega = require("./omega.js");
var search = omega.search;

search.dimensions = {};

search.dimensions.space = omega.spatiality;
search.dimensions.space.origin = [47.864716, 2.349014];
search.dimensions.space.limit = { distance : null, direction : null };
search.dimensions.space.storage = new Map();

/*
search.dimensions.time = omega.temporality;
search.dimensions.time.origin = 1562066591;
search.dimensions.time.limit = { distance : null, direction : null };
search.dimensions.time.storage = new Map();
*/

search.init({port: 6379,host: '127.0.0.1'},'index:action|space:EARTH',9, 10);
search.load();

