define(['backbone'], function(Backbone){
    return Backbone.View.extend({
        render: function(gameState){
            var newDocumentTitle = '';
            switch(gameState.phase){
                case 0:
                    newDocumentTitle = 'Acronauts - Gathering players';
                    break;
                case 1:
                    newDocumentTitle = 'Acronauts - Game on!';
                    break;
                case 2:
                    newDocumentTitle = 'Acronauts - Voting';
                    break;
                case 3:
                    newDocumentTitle = 'Acronauts - Game over';
                    break;
                case 4:
                    newDocumentTitle = 'Acronauts - Game does not exist';
                    break;
            }
            document.title = newDocumentTitle;
        }
    });
});