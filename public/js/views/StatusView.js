define(['jquery', 'backbone', 'clockStateFromGameState'], function($, Backbone, clockStateFromGameState){
    return Backbone.View.extend({
        render: function(gameState){
            var self = this;
            var classToAdd;
            var htmlOutput;
            switch (gameState.phase){
                case 0:
                    htmlOutput = 'Waiting for players to join...';
                    break;
                case 1:
                    var clockState = clockStateFromGameState(gameState);
                    if (clockState === 0){
                        var currentWait = Math.ceil((gameState.clockStart - Date.now())/1000);
                        htmlOutput = currentWait + ' sec until start';
                    } else if (clockState === 1) {
                        var secondsLeft = Math.ceil((gameState.clockEnd - Date.now())/1000);
                        htmlOutput = secondsLeft + ' secs left';
                        if (secondsLeft <= 15 && secondsLeft > 5){
                            classToAdd = 'minorWarning';
                        } else if (secondsLeft <= 5) {
                            classToAdd = 'majorWarning';
                        }
                    } else if (clockState === 2) {
                        htmlOutput = 'Time\'s up!';
                    } else {
                        console.log('you\'ve done something terribly wrong with clockState');
                    }
                    break;
                default:
                    htmlOutput = 'An invalid game phase has been reached.';
            }
            $(self.el).html(htmlOutput);
            if (classToAdd !== undefined) { $(self.el).addClass(classToAdd); } 
        }
    });
});