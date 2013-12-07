// get our utility function for generating the prompts
var promptGenerator = require('../promptGenerator');
var generatePrompt = promptGenerator.generatePrompt;

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

var frequencyTestResults = {};

for (attr in englishLanguageFirstLetterInAWordFrequencyMap){
	frequencyTestResults[attr] = 0;
};

var numberOfTests = 1000000;

for (var i = 0; i < numberOfTests; i++){
	var randomCharacter = generatePrompt(1);
	frequencyTestResults[randomCharacter]++;
};

for (attr in frequencyTestResults){
	var deviationFromExpcected = englishLanguageFirstLetterInAWordFrequencyMap[attr] - ((frequencyTestResults[attr] / numberOfTests) * 100);
	console.log('the letter %s deviated from its expected frequency by %s', attr, deviationFromExpcected);
};