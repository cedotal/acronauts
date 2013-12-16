define(['jquery', 'backbone'], function($, Backbone){
    return Backbone.View.extend({
        render: function(gameState){
            var self = this;
            gameState.players.forEach(function(player){
                // TODO: fix this so that the controller alters the gamestate to
                // mark the current player so that this works properly, since
                // views no longer know about sockets
                // if (player.id !== socket.socket.sessionid && player.answer.text !== undefined) {
                    $(self.el).append('<div>' + player.answer.text + '<button id="' + player.id + '">Vote</button></div>');
                    $('#' + player.id).click(function(){
                        self.trigger('submitVote', {
                            voteeId: player.id
                        });
                        gameState.players.forEach(function(player){
                            $('#' + player.id).attr('disabled', true);
                        });
                    });
                // }
            });
            // turn autoupdate to false so new game states being sent from the server don't reset the diabled attr
            self.autoupdate = false;
        }
    });
});