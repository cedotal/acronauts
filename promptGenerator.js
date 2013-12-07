// set up utility functions for generating the prompts

// instead of just picking letters of the alphabet randomly, we weight letters according to the frequency
// with which they begin words in english (sourced from https://en.wikipedia.org/wiki/Letter_frequency)
var englishLanguageFirstLetterInAWordFrequencyMap = {
	a: 11.602,
	b: 4.702,
	c: 3.511,
	d: 2.670,
	e: 2.007,
	f: 3.779,
	g: 1.950,
	h: 7.232,
	i: 6.286,
	j: 0.597,
	k: 0.590,
	l: 2.705,
	m: 4.374,
	n: 2.365,
	o: 6.264,
	p: 2.545,
	q: 0.173,
	r: 1.653,
	s: 7.755,
	t: 16.671,
	u: 1.487,
	v: 0.649,
	w: 6.753,
	x: 0.037,
	y: 1.620,
	z: 0.034
};

var convertObjectIntoPairOfArrays = function(object){
	var arrayPair = {
		attrs: [],
		values: []
	};
	for (attr in object){
		arrayPair.attrs.push(attr);
		arrayPair.values.push(object[attr]);
	};
	return arrayPair;
};

var constructRangeBoundariesArrayFromFrequenciesArrayPair = function(frequenciesAsPairedArrays){
	// first, we convert the character frequency map into a pair of arrays, one holding the letters
	// and one holding their frequency boundaries
	var rangeBoundariesArray = [];
	var sum = 0;

	// iterate over all characters and put the range 
	for (var i = 0; i < frequenciesAsPairedArrays.attrs.length - 1; i++){
		sum += (frequenciesAsPairedArrays.values[i] / 100);
		rangeBoundariesArray[i] = sum;
	};

	return rangeBoundariesArray;
};

// construct the paired character array/character range boundaries array here, so we do it once rather than every time a function is called
var characterFrequenciesArrayPair = convertObjectIntoPairOfArrays(englishLanguageFirstLetterInAWordFrequencyMap);
var characterRangeBoundariesArray = constructRangeBoundariesArrayFromFrequenciesArrayPair(characterFrequenciesArrayPair);
var characterRangeBoundariesArrayPair = {
	characters: characterFrequenciesArrayPair.attrs,
	rangeBoundaries: characterRangeBoundariesArray
};

function randomCharacter(){
	var r = Math.random();

	var i = 0;

	for (i = 0; i < characterRangeBoundariesArrayPair.characters.length && r >= characterRangeBoundariesArrayPair.rangeBoundaries[i]; i++);

    return characterRangeBoundariesArrayPair.characters[i];
};

function generatePrompt(length){
	var prompt = '';
	for (var i = 0; i < length; i++){
		prompt += randomCharacter();
	};
	return prompt;
};

module.exports.generatePrompt = generatePrompt;