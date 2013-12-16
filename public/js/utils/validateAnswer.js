// figure out if an answer is a legal match for a given prompt
define(['underscore'], function(_){
    return function validateAnswer(answer, prompt, options){
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
    };
});