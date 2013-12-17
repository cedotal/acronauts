define(['jquery', 'backbone'], function($, Backbone){
    return Backbone.View.extend({
        render: function(gameState){
            var self = this;
            var content = '';
            gameState.results.forEach(function(player){
                content += ('<div>' + player.id + ': "' + player.answer.text + '" - ' + player.voters.length + '</div>');
            });
            $(self.el).html(content);
        }
    });
});