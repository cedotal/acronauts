var should = require('should');
var gameUtils = require('../gameUtils');

var validateAnswer = gameUtils.validateAnswer;

describe('validateAnswer', function(){
	it('should accept plain old valid answers', function(){
		validateAnswer('bene gesserit witch', 'bgw').should.be.true;
	});
	it('should properly handle extra whitespace', function(){
		validateAnswer('bene      gesserit    witch', 'bgw').should.be.true;
	});
	it('should reject answers that are too short for the prompt', function(){
		validateAnswer('bene gesserit witch', 'bgwy').should.be.false;
	});
	it('should reject answers that are too long for the prompt', function(){
		validateAnswer('bene gesserit witch', 'bg').should.be.false;
	});
	it('should properly ignore ignored characters', function(){
		validateAnswer('123sp321ice m1us32t321 12fl32ow1', 'smf', ['1', '2', '3']).should.be.true;
	});
	it('should properly ignore optionally ignored words', function(){
		validateAnswer('the spice must flow', 'smf', [], ['the']).should.be.true;
	});
	it('should deal properly with funky capitalization', function(){
		validateAnswer('Fear Is the mind killer', 'fitMK').should.be.true;
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