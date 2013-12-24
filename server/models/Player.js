function Player(socket, options){
    this.socket = socket;
    this.name = options.name;
    this.voters = [];
    this.answer = {};
    this.status = 0;

    var self = this;

    // update player's current status: 'thinking', 'typing', etc.
    this.setStatus = function(status){
        self.status = status;
    };

    this.getStatus = function(){
        return self.status;
    };

    // validity checking for addVote and setAnswer are performed at the game level, not the player level
    this.addVote = function(votingPlayerId){
        self.voters.push(votingPlayerId);
    };

    this.setAnswer = function(answerText){
        self.answer = {
            text: answerText,
            // timestamp is stored for tiebreaker purposes
            timestamp: Date.now()
        };
    };

    this.getAnswer = function(){
        return self.answer;
    };

    // create a public version of a player object to send out to the clients. socket.io will automatically
    // strip all attrs that contain functions, but some attrs are not supposed to be public and some will,
    // when serialized, generate circular reference errors
    this.marshalPublicObject = function(){
        var publicObject = {};
        var publicAttrs = [
            'voters',
            'name',
            'status'
        ];
        publicAttrs.forEach(function(attr){
            publicObject[attr] = self[attr];
        });
        // clients don't need to worry about transport mechanisms
        publicObject.id = self.socket.id;
        // clients don't need to worry about answer timestamps since the server does the judging
        publicObject.answer = self.answer.text;
        return publicObject;
    };

    this.getNumberOfVotes = function(){
        return self.voters.length;
    };


    // return public functions
    return {
        socket: this.socket,
        setAnswer: this.setAnswer,
        addVote: this.addVote,
        marshalPublicObject: this.marshalPublicObject,
        name: this.name,
        getAnswer: this.getAnswer,
        getStatus: this.getStatus,
        setStatus: this.setStatus,
        getNumberOfVotes: this.getNumberOfVotes
    };       
}

module.exports = Player;