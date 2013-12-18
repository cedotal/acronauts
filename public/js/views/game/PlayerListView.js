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
                    htmlOutput = '';
                    htmlOutput += '<div>Players</div>';
                    gameState.players.forEach(function(player){
                        htmlOutput += '<div>' + player.name;
                        if (player.isClient === true){
                            htmlOutput += ' (YOU)';
                        }
                        htmlOutput += '</div>';
                    });
                    playerListElement.html(htmlOutput);
                    break;
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
                case 2:
                    htmlOutput = '';
                    htmlOutput += '<div>Players</div>';
                    gameState.players.forEach(function(player){
                        htmlOutput += '<div>' + player.name;
                        if (player.isClient === true){
                            htmlOutput += ' (YOU)';
                        }
                        htmlOutput += ' - ';
                        if (player.status === 3){
                            htmlOutput +=  'thinking...';
                        } else if (player.status === 4) {
                            htmlOutput +=  'voted';
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