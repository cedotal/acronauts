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
                    if (clockState === 0){
                        var timeoutValue = gameState.clockStart - new Date().getTime();
                        setTimeout(function(){
                            htmlOutput += '<div>Type in your backronym:<form id="answerPrompt"><input id="answerPromptInput" type="text"></input><input type="submit"></input></form></div>';
                            $(self.el).html(htmlOutput);
                            var answerPrompt = $('#answerPrompt');
                            var answerPromptInput = $('#answerPromptInput');
                            answerPromptInput.keyup(function(event){
                                var val = answerPromptInput.val();
                                if (val === ''){
                                    Backbone.trigger('updatePlayerStatus', 0);
                                } else {
                                    Backbone.trigger('updatePlayerStatus', 1);
                                }
                            });
                            answerPrompt.submit(function(event){
                                event.preventDefault();
                                var inputValue = answerPromptInput.val();
                                if (validateAnswer(inputValue, gameState.prompt, {
                                    ignoredCharacters: ['\'', '\"'],
                                    optionallyIgnoredWords: ['the', 'a', 'an']
                                }) === true){
                                    Backbone.trigger('submitAnswer', {
                                        answerText: inputValue
                                    });
                                    $('input').attr('disabled', true);
                                } else {
                                    alert('That answer doesn\'t match the acronym given - try again!');
                                }
                            });
                        }, timeoutValue);
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