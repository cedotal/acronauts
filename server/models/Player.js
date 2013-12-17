// set up Player class
function Player(socket, options){
    this.socket = socket;
    this.name = options.name;
    this.voters = [];
    this.answer = {};
    this.status = 0;
}

// validity checking for addVote and setAnswer are performed at the game level, not the player level
Player.prototype.addVote = function(votingPlayerId){
    this.voters.push(votingPlayerId);
};

Player.prototype.setAnswer = function(answerText){
    this.answer = {
        text: answerText,
        timestamp: Date.now()
    };
};

// create a public version of a player object to send out to the clients. socket.io will automatically
// strip all attrs that contain functions, but some attrs are not supposed to be public and some will,
// when serialized, generate circular reference errors
Player.prototype.marshalPublicObject = function(){
    var self = this;
    var publicObject = {};
    var publicAttrs = [
        'answer',
        'voters',
        'name',
        'status'
    ];
    publicAttrs.forEach(function(attr){
        publicObject[attr] = self[attr];
    });
    publicObject.id = self.socket.id;
    return publicObject;
};

module.exports = Player;