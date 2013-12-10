var assert = require('assert');
var gameUtils = require('../gameUtils');

var validateAnswer = gameUtils.validateAnswer;

describe('validateAnswer', function(){
	it('should accept plain old valid answers', function(){
		assert.equal(validateAnswer('bene gesserit witch', 'bgw'), true);
	});
	it('should properly handle extra whitespace', function(){
		assert.equal(validateAnswer('bene      gesserit    witch', 'bgw'), true);
	});
	it('should reject answers that are too short for the prompt', function(){
		assert.equal(validateAnswer('bene gesserit witch', 'bgwy'), false);
	});
	it('should reject answers that are too long for the prompt', function(){
		assert.equal(validateAnswer('bene gesserit witch', 'bg'), false);
	});
	it('should properly ignore ignored characters', function(){
		assert.equal(validateAnswer('123sp321ice m1us32t321 12fl32ow1', 'smf', ['1', '2', '3']), true);
	});
	it('should properly ignore optionally ignored words', function(){
		assert.equal(validateAnswer('the spice must flow', 'smf', [], ['the']), true);
	});
	it('should deal properly with funky capitalization', function(){
		assert.equal(validateAnswer('Fear Is the mind killer', 'fitMK'), true);
	});
});


/*

var randomCharacter = gameUtils.randomCharacter;

decribe('generatePrompt', function(){
	it('should generate answers with the same approximate frequency of ', function(){
		var sampleFrequencies = {
			'%': 7000,
			'$': 943,
			'(': 3490
		};

		var frequencyTestResults = {};

		for (attr in englishLanguageFirstLetterInAWordFrequencyMap){
			frequencyTestResults[attr] = 0;
		};

		var numberOfTests = 1000000;

		for (var i = 0; i < numberOfTests; i++){
			frequencyTestResults[randomCharacter()]++;
		};

		for (attr in frequencyTestResults){
			var deviationFromExpcected = sampleFrequencies[attr] - ((frequencyTestResults[attr] / numberOfTests) * 100);
			console.log('the letter %s deviated from its expected frequency by %s', attr, deviationFromExpcected);
		};
	});
});

*/