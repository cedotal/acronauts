define(['jquery', 'backbone'], function($, Backbone){
    return Backbone.View.extend({
        render: function(gameState){
            var content = 'This game is closed. Reload the page to start a new one.';
            $(this.el).html(content);
        }
    });
});