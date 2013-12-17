define(['jquery', 'backbone'], function($, Backbone){
    return Backbone.View.extend({
        render: function(gameState){
            var self = this;
            gameState.players.forEach(function(player){
                if (player.isClient !== true && player.answer.text !== undefined) {
                    $(self.el).append('<div>' + player.answer.text + '<button id="' + player.id + '">Vote</button></div>');
                    $('#' + player.id).click(function(){
                        Backbone.trigger('submitVote', {
                            voteeId: player.id
                        });
                        gameState.players.forEach(function(player){
                            $('#' + player.id).attr('disabled', true);
                        });
                    });
                }
            });
            // turn autoupdate to false so new game states being sent from the server don't reset the diabled attr
            self.autoupdate = false;
        }
    });
});