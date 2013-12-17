define(['jquery', 'backbone'], function($, Backbone){
    return Backbone.View.extend({
        render: function(gameState){
            var self = this;
            var gamePhase = gameState.phase;
            var intervalSet = false;
            var playerListElement = $(self.el);
            var htmlOutput;
            switch(gamePhase){
                case 0:
                case 1:
                    htmlOutput = '';
                    htmlOutput += '<div>Players</div>';
                    gameState.players.forEach(function(player){
                        htmlOutput += '<div>' + player.name;
                        if (player.isClient === true){
                            htmlOutput += ' (YOU)';
                        }
                        htmlOutput += ' - ';
                        if (player.status === 1){
                            htmlOutput +=  'typing...';
                        } else if (player.status === 2) {
                            htmlOutput +=  'done!';
                        } else {
                            htmlOutput += 'thinking...';
                        }
                        htmlOutput += '</div>';
                    });
                    playerListElement.html(htmlOutput);
                    break;
                default:
                    htmlOutput = 'An invalid game phase has been reached.';
                    playerListElement.html(htmlOutput);
            }
        }
    });
});