var _ = require('underscore');

// prompt generation
var convertObjectIntoPairOfArrays = function(object){
	var arrayPair = {
		attrs: [],
		values: []
	};
	for (var attr in object){
		arrayPair.attrs.push(attr);
		arrayPair.values.push(object[attr]);
	}
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
	}

	return rangeBoundariesArray;
};

// construct the paired character array/character range boundaries array here, so we do it once rather than every time a function is called
var letterFrequencies = require('./data/letterFrequencies.eng.json');
var characterFrequenciesArrayPair = convertObjectIntoPairOfArrays(letterFrequencies);
var characterRangeBoundariesArray = constructRangeBoundariesArrayFromFrequenciesArrayPair(characterFrequenciesArrayPair);
var characterRangeBoundariesArrayPair = {
	characters: characterFrequenciesArrayPair.attrs,
	rangeBoundaries: characterRangeBoundariesArray
};

// TODO: make either randomCharacter or generatePrompt accept an arbitrary frequency map so we can test
// and/or localize this
function randomCharacter(){
	var r = Math.random();

	var i = 0;

	for (i = 0; i < characterRangeBoundariesArrayPair.characters.length && r >= characterRangeBoundariesArrayPair.rangeBoundaries[i]; i++){}

    return characterRangeBoundariesArrayPair.characters[i];
}

function generatePrompt(length){
	var prompt = '';
	for (var i = 0; i < length; i++){
		prompt += randomCharacter();
	}
	return prompt;
}

function validateAnswer(answer, prompt, options){
	options = options || {};
	_.defaults(options, {
		ignoredCharacters: [],
		optionallyIgnoredWords: []
	});
	prompt = prompt.toLowerCase();
	answer = answer.toLowerCase();
	var regExp = new RegExp('[' + options.ignoredCharacters.join('') + ']', 'gi');
	var splitAnswer = answer.replace(regExp, '').split(/\s+/);
	// Possible bug: ignoredWords has to be all lowercase or matches will fail
    // Possible bug: If we ignore a char that's present in an ignoredWord, matches will fail
	for (var p = 0; p < prompt.length; p++){
		while(splitAnswer[p] !== undefined && prompt[p] !== splitAnswer[p][0]){
			if(options.optionallyIgnoredWords.indexOf(splitAnswer[p]) !== -1){
				// this word is being treated as being ignored, so cut it out!
				splitAnswer.splice(p, 1);
			} else {
				// failed test
				return false;
			}
		}
	}
	// even after our looping, it's possible that there could be extra segments in splitAnswer
	return prompt.length === splitAnswer.length;
}

module.exports.generatePrompt = generatePrompt;
module.exports.validateAnswer = validateAnswer;