'use strict';

let notes = [
	'A2',
	'B2',
	'C3',
	'D3',
	'E3',
	'F3',
	'G3',
	'A3',
	'B3',
	'C4',
	'D4',
	'E4',
	'F4',
	'G4',
	'A4',
	'E5',
	'F5',
	'G5',
	'A#2',
	'C#3',
	'D#3',
	'F#3',
	'A#3',
	'C#4',
	'D#4',
	'F#4',
	'A#4',
	'C#5',
	'D#5',
	'F#5'
	];

// Having a power of two means that zooming in will reuse some digits
// Sorting by length will get rid of the longer, more obscure terms
// fucks = fucks.sort( (a,b) => a.length - b.length ).slice(0, 512);
notes = notes.slice(0, 256);

const count = notes.length;

const precisionPerNote = Math.log2(count);

export function hashToString(hash, precision) {
	const digits = [];
	let s;

	while(precision > 0) {
		s = hash % count;
		digits.push(notes[s]);
		hash = Math.trunc(hash/count);
		precision -= precisionPerNote;
	}

	return digits.join(' ');
}

export const precisions = [];
for (let i = precisionPerNote; i < 60; i+= precisionPerNote) {
	precisions.push(i);
}

let regexp = new RegExp('([a-zA-Z]+)', 'g');

export function stringToHash(str) {
// 	let matches = [];
	let match;
	let hash = 0;
	let precision = 0;
	let multiplier = 1;
	regexp.exec('');	// Work around repeated queries
	while ((match = regexp.exec(str)) !== null) {
		let position = notes.indexOf(match[1]);
		if (position === -1) {
			if (precision) {
				// Return whatever we have up to this point
				return {hash: hash, precision: precision};
			} else {
				return undefined;
			}
		}
		hash += position * multiplier;
		multiplier *= count;
		precision += precisionPerNote;
// 		matches.push(match[1]);
	}
// 	console.log(matches, hash);
	return {hash: hash, precision: precision};
}

export default Object.freeze({
	hashToString: hashToString,
	precisions: precisions,
	stringToHash: stringToHash
});


