// https://gitlab.com/IvanSanchez/geogrids/-/tree/master/
// Given a location with at least `lat` and `lng`, compute its `octant` and
// its first `x`, `y`, `max`; then set `levels` to an empty array.
function computeOctant(location) {
	
	if (location.lat > 0) {
		if (location.lng < -90) {
			location.octant = 0;
		} else if (location.lng < 0) {
			location.octant = 1;
		} else if (location.lng < 90) {
			location.octant = 2;
		} else {
			location.octant = 3;
		}
	} else {
		if (location.lng < -90) {
			location.octant = 4;
		} else if (location.lng < 0) {
			location.octant = 5;
		} else if (location.lng < 90) {
			location.octant = 6;
		} else {
			location.octant = 7;
		}
	}
	
	// Compute remainder x,y mapping them to [0,1]
	location.x = ((location.lng + 180) % 90) / 90;
	location.y = Math.abs(location.lat) / 90;
	location.x *= (1-location.y);
	location.levels = [];
	
	return location;
}


// Given a location with `octant`, `x`, `y`, `max` and `levels`, compute the next level.
function computeLevel(location) {
	
	if (location.y > 0.5) {
		location.levels.push(1);
		location.x *= 2;
		location.y = (location.y - 0.5) * 2;
	} else if (location.y < 0.5-location.x) {
		location.levels.push(2);
		location.x *= 2;
		location.y *= 2;
	} else if (location.x >= 0.5) {
		location.levels.push(3);
		location.x = (location.x - 0.5) * 2;
		location.y *= 2;
	} else {
		// And this is an inverse triangle
		location.levels.push(0);
// 		location.x = 2*x + 2*y - 1;
		location.x = 1 - location.x*2;
		location.y = 1 - location.y*2;
	}
	
	return location;
}


// Given a location with `octant`, `x`, `y` and `max`, compute its lat-lng.
function computeLatLng(location) {
	let l = location.levels.length;
	let x = location.x;
	let y = location.y;
	
	for (let i=l-1; i>=0; i--) {
		let level = +location.levels[i];
		if (level === 1) {
			x /= 2;
			y = y/2 + 0.5;
		} else if (level === 2) {
			x /= 2;
			y /= 2;
		} else if (level === 3) {
			x = x/2 + 0.5;
			y /= 2;
		} else if (level === 0) {
			x = (1 - x)/2;
			y = (1 - y)/2;
		}
// 		console.log(level, x,y);
	}
	
	x /= 1 - y;
	x *= 90;
	y *= 90;
	
	if (location.octant == 0) {
		x -= 180;
	} else if (location.octant == 1) {
		x -= 90;
	} else if (location.octant == 2) {
		x += 0;
	} else if (location.octant == 3) {
		x += 90;
	} else if (location.octant == 4) {
		x -= 180;
		y = -y;
	} else if (location.octant == 5) {
		x -= 90;
		y = -y;
	} else if (location.octant == 6) {
		x += 0;
		y = -y;
	} else if (location.octant == 7) {
		x += 90;
		y = -y;
	}
	
	location.lat = y;
	location.lng = x;
	
	return location;
}

// Given a location, return its human-readable hash
function locationToReadableHash(location) {
	return location.octant + '' + location.levels.join('');
}

// Given a location, return its numeric hash
function locationToNumericHash(location) {
	let acc = location.octant;
	let mult = 8;
	
	for (let i in location.levels) {
		acc += mult * location.levels[i];
		mult *= 4;
	}
	return acc;
}


// Given a human-readable hash, return a location
function readableHashToLocation(hash) {
	let octant = hash[0];
	let precision = 3;
	let levels = [];
	let l = hash.length;
	let i = 1;
	while(i < l) {
		levels.push( hash[i++] );
		precision += 2;
	}
	
	return levelsToLocation(octant, levels);
}


// Given a numeric hash, return a location
// Precision needs to be given to account for leading zeroes.
function numericHashToLocation(hash, precision) {
	if (!precision) precision = 25;
	let octant = hash % 8;
	hash = Math.trunc(hash / 8);
	let i = 3;
	let levels = [];
	while(i < precision) {
		levels.push( hash % 4 );
		hash = Math.trunc(hash / 4);
		i += 2;
	}
	
	return levelsToLocation(octant, levels);
}

// Given a lat-lon and a precision (in number of bits), return a location with computed octant and levels
function latLngToPrecisionLocation(lat, lng, precision){
	let location = {lat: lat, lng: lng};
	
	computeOctant(location);
	let currPrecision = 3;
	
	while (currPrecision < precision) {
		computeLevel(location);
		currPrecision += 2;
	}
	return (location);
}

// Given octant and levels, return a location with back-computed lat-lng.
function levelsToLocation(octant, levels, x, y) {
	if (x === undefined) x = 0.3;
	if (y === undefined) y = 0.3;
	
	let location = {
		octant: octant,
		levels: typeof levels === 'String' ? levels.split() : levels,
		x: x,
		y: y
	}
	
	return computeLatLng(location);
}


// Given octant and levels, return three locations with back-computed lat-lng.
function levelsToTriangle(octant, levels, normalizePoles) {
	
	if (typeof(levels) === 'String') {
		levels = levels.split();
	}
	
	let location1 = {
		octant: octant,
		levels: levels,
		x: 0,
		y: 0
	}
	
	let location2 = {
		octant: octant,
		levels: levels,
		x: 0,
		y: 1
	}
	
	let location3 = {
		octant: octant,
		levels: levels,
		x: 1,
		y: 0
	}
	
	computeLatLng(location1);
	computeLatLng(location2);
	computeLatLng(location3);
	
	if (normalizePoles) {
		//Edge case: the triangle has a pole, return a square instead of a triangle.
		if (Math.abs(location2.lat) == 90) {
			let location2a = {
				octant: octant,
				levels: levels,
				x: 0,
				y: 1,
				lat: location2.lat,
				lng: location1.lng
			}
			let location2b = {
				octant: octant,
				levels: levels,
				x: 0,
				y: 1,
				lat: location2.lat,
				lng: location3.lng
			}
			return [location1,location2a,location2b,location3];
		}
	}
	
	return [location1,location2,location3];
}


///// Exported functions

function latLngToReadableHash(lat, lng, precision) {
	let loc = latLngToPrecisionLocation(lat, lng, precision);
	return locationToReadableHash(loc);
}

function latLngToNumericHash(lat, lng, precision) {
	let loc = latLngToPrecisionLocation(lat, lng, precision);
	return locationToNumericHash(loc);
}

function numericHashToLatLng(hash, precision) {
	let loc = numericHashToLocation(hash, precision);
	return {lat: loc.lat, lng: loc.lng };
}

function readableHashToLatLng(hash) {
	let loc = readableHashToLocation(hash);
	return {lat: loc.lat, lng: loc.lng };
}

function numericHashToArea(hash, precision) {
	let loc = numericHashToLocation(hash);
	return levelsToTriangle(loc.octant, loc.levels, true);
}

function readableHashToArea(hash) {
	let loc = readableHashToLocation(hash);
	return levelsToTriangle(loc.octant, loc.levels, true);
}


let hashPrecisions = [];
for (let i = 3; i < 60; i+=2) {
	hashPrecisions .push(i);
}

export const oqtm = Object.freeze({
	latLngToReadableHash: latLngToReadableHash,
	latLngToNumericHash: latLngToNumericHash,
	numericHashToLatLng: numericHashToLatLng,
	readableHashToLatLng: readableHashToLatLng,
	numericHashToArea: numericHashToArea,
	readableHashToArea: readableHashToArea,
	hashPrecisions: hashPrecisions
});
