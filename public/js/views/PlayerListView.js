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
                        htmlOutput += '<div>' + player.id;
                        if (player.isClient === true){
                            htmlOutput += ' (YOU)';
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