define(['jquery', 'backbone', 'clockStateFromGameState'], function($, Backbone, clockStateFromGameState){
    return Backbone.View.extend({
        render: function(gameState){
            var self = this;
            var htmlOutput = '';
            var gamePhase = gameState.phase;
            var i;
            switch(gamePhase){
                case 0:
                    for (i = 0; i < gameState.promptLength; i++){
                        htmlOutput += '_';
                    }
                    $(self.el).html(htmlOutput);
                    break;
                case 1:
                    var clockState = clockStateFromGameState(gameState);
                    htmlOutput = '';
                    if (clockState === 0) {
                        for (i = 0; i < gameState.promptLength; i++){
                            htmlOutput += '_';
                        }
                    } else {
                        htmlOutput = gameState.prompt.toUpperCase();
                    }
                    $(self.el).html(htmlOutput);
                    break;
                default:
                    console.log('an invalid game state has been passed to promptView');
            }
        }
    });
});