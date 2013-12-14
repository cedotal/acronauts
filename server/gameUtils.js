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
var letterFrequencies = require('./letterFrequencies.eng.js');
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

function validateAnswer(answer, prompt, ignoredCharacters, optionallyIgnoredWords){
	if (ignoredCharacters === undefined) { ignoredCharacters = []; }
	if (optionallyIgnoredWords === undefined) { optionallyIgnoredWords = []; }
	prompt = prompt.toLowerCase();
	answer = answer.toLowerCase();
	ignoredCharacters.forEach(function(character){
		var regExp = new RegExp(character, 'g');
		answer = answer.replace(regExp, '');

	});
	var splitAnswer = answer.split(' ').filter(function(segment){
		return segment !== '';
	});
	for (var p = 0; p < prompt.length; p++){
		while(splitAnswer[p] !== undefined && prompt[p] !== splitAnswer[p][0]){
			if(optionallyIgnoredWords.indexOf(splitAnswer[p]) !== -1){
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