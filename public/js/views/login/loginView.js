define(['jquery', 'backbone'], function($, Backbone){
    return Backbone.View.extend({
        render: function(){
            var self = this;
            var content = '<div>A.C.R.O.N.A.U.T.S.</div>';
            content += '<form>';
            content += '<input type="text"></input>';
            content += '<button>Join a Game!</button>';
            content += '</form>';
            $(this.el).html(content);
            $(this.el).find('button').click(function(event){
                event.preventDefault();
                var name = $(self.el).find('input').val();
                Backbone.trigger('login', {name: name});
            });

        }
    });
});