define(['jquery', 'backbone', 'clockStateFromGameState', 'validateAnswer'], function($, Backbone, clockStateFromGameState, validateAnswer){
    return Backbone.View.extend({
        render: function(gameState){
            var self = this;
            var gamePhase = gameState.phase;
            var htmlOutput = '';
            switch (gamePhase){
                case 0:
                    $(self).html(htmlOutput);
                    break;
                case 1:
                var clockState = clockStateFromGameState(gameState);
                    if (clockState === 1){
                        var timeoutValue = gameState.clockStart - new Date().getTime();
                        setTimeout(function(){
                            htmlOutput += '<div>Type in your backronym:<form id="answerPrompt"><input id="answerPromptInput" type="text"></input><input type="submit"></input></form></div>';
                            $(self).html(htmlOutput);
                            var answerPrompt = $('#answerPrompt');
                            var answerPromptInput = $('#answerPromptInput');
                            answerPrompt.submit(function(){
                                var inputValue = answerPromptInput.val();
                                if (validateAnswer(inputValue, gameState.prompt, {
                                    ignoredCharacters: ['\'', '\"'],
                                    optionallyIgnoredWords: ['the', 'a', 'an']
                                }) === true){
                                    self.trigger('submitAnswer', {
                                        answerText: inputValue
                                    });
                                    $('input').attr('disabled', true);
                                } else {
                                    alert('That answer doesn\'t match the acronym given - try again!');
                                }
                                return false;
                            });
                        }, timeoutValue);
                        console.log(timeoutValue);
                        // turn off autoupdate so it doesn't eat the reponses
                        self.autoupdate = false;
                    }
                    break;
                default:
                    htmlOutput = 'An invalid game phase has been reached.';
                    $(self.el).html(htmlOutput);
            }
        }
    });
});