define(['jquery', 'backbone'], function($, Backbone){
    return Backbone.View.extend({
        render: function(gameState){
            var self = this;
            var content = '';
            var winnerSet = false;
            gameState.results.forEach(function(player){
                content += ('<div>');
                content += (player.name + ': "' + player.answer.text + '" - ' + player.voters.length);
                if (winnerSet === false) {
                    content += ' (WINNER)';
                    winnerSet = true;
                }
                content += '</div>';
            });
            content += '<div><button>Play a new game</button></div>';
            $(self.el).html(content);
            $(self.el).find('button').click(function(event){
                Backbone.trigger('leaveGame');
            });
        }
    });
});