define(['jquery', 'backbone'], function($, Backbone){
    return Backbone.View.extend({
        render: function(){
            var self = this;
            var content = 'Finding a game...';
            $(self.el).html(content);
        }
    });
});