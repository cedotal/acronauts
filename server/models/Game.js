// get our utility function for generating the prompts
var gameUtils = require('../gameUtils');
var generatePrompt = gameUtils.generatePrompt;
var validateAnswer = gameUtils.validateAnswer;

// set up Game class
function Game(io, gameId, gameConfig){
    var self = this;
    this.io = io;
    this.id = gameId;
    this.gameConfig = gameConfig;
    this.players = [];
    this.phase = 0;
    this.promptLength = gameConfig.promptLength;
    this.minPlayers = gameConfig.minPlayers;
    this.maxPlayers = gameConfig.maxPlayers;
    this.ignoredCharacters = gameConfig.ignoredCharacters;
    this.optionallyIgnoredWords = gameConfig.optionallyIgnoredWords;
    this.idealStartTime = Date.now() + (gameConfig.idealGameWait * 1000);
}

Game.prototype.handleGameStateUpdate = function(){
    var self = this;
    switch(this.phase){
        case 0:
            if(this.checkIfGameCanBegin() === true){
                this.begin();
            }
            break;
        case 1:
            if(this.checkIfAnsweringIsComplete() === true){
                this.endAnswering();
            }
            break;
        case 2:
            if(this.checkIfVotingIsComplete() === true){
                this.endVoting();
            }
            break;
        case 3:
            if(this.checkIfGameCanBeRemoved === true){
                this.markGameForRemoval();
            }
            break;
    }
    this.players.forEach(function(player){
        player.socket.emit('gameState', self.marshalPublicObject());
    });
};

// create a public version of the game object to send out to the clients. socket.io will automatically
// strip all attrs that contain functions, but some attrs are not supposed to be public and some will,
// when serialized, generate circular reference errors
Game.prototype.marshalPublicObject = function(){
    var self = this;
    var publicObject = {};
    var publicAttrs = [
        'phase',
        'promptLength',
        'minPlayers',
        'id',
        'clockStart',
        'clockEnd',
        'prompt',
        'results'
    ];
    publicAttrs.forEach(function(attr){
        publicObject[attr] = self[attr];
    });
    publicObject.players = this.players.map(function(player){
        return player.marshalPublicObject();
    });
    return publicObject;
};

// functions that check whether the game phase can be advanced to the next phase at any given point
Game.prototype.checkIfGameCanBegin = function(){
    // if we have the max number of players, we're good to go!
    if (this.players.length >= this.maxPlayers){
        return true;
    } else if (this.players.length >= this.minPlayers && Date.now() >= this.idealStartTime) {
        // if we have at least the minimum number of players and we're past the ideal start
        // time, we can start the game
        return true;
    } else {
        return false;
    }
};

Game.prototype.checkIfAnsweringIsComplete = function(){
    var totalAnswers = 0;
    this.players.forEach(function(player){
        if (player.answer.text !== undefined && player.answer.text !== ''){
            totalAnswers += 1;
        }
    });
    // answering is complete if either everyone has answered, or we're past the end of the clock
    return totalAnswers >= this.players.length || Date.now() >= this.clockEnd;
};

// TODO: if a player leaves before voting, voting could end before everyone left has voted
Game.prototype.checkIfVotingIsComplete = function(){
    var totalVotes = 0;
    this.players.forEach(function(player){
        totalVotes += player.voters.length;
    });
    return totalVotes >= this.players.length;
};

Game.prototype.checkIfGameCanBeRemoved = function(){
    return this.players.length === 0;
};


// functions that advance the game phase. note that none of them contains validity checks; those
// are called by game.tick() before deciding whether or not to call these
Game.prototype.begin = function(){
    var self = this;
    if (this.phase === 0){
        var gameConfig = this.gameConfig;
        this.prompt = generatePrompt(gameConfig.promptLength);
        this.clockStart = Date.now() + gameConfig.gameStartDelay * 1000;
        this.clockEnd = Date.now() + (gameConfig.gameStartDelay + gameConfig.clockLength) * 1000;
        this.phase = 1;
        var answeringEndTimer = self.clockEnd - Date.now();
        setTimeout(function(){
            self.endAnswering();
        }, answeringEndTimer);
        self.handleGameStateUpdate();
    }
};

Game.prototype.endAnswering = function(){
    if (this.phase === 1){
        this.phase = 2;
    }
    this.handleGameStateUpdate();
};

Game.prototype.endVoting = function(){
    if (this.phase === 2){
        this.phase = 3;
        this.judgeGame();
    }
    this.handleGameStateUpdate();
};

Game.prototype.markGameForRemoval = function(){
    if (this.phase === 3){
        this.phase = 4;
    }
};

Game.prototype.addPlayer = function(player){
    var self = this;
    if (this.phase === 0){
        player.socket.on('submitAnswer', function(data){
            self.submitAnswer(player.socket.id, data.answerText);
        });
        player.socket.on('submitVote', function(data){
            self.submitVote(player.socket.id, data.voteeId);
        });
        player.socket.on('disconnect', function(){
            self.removePlayerById(player.socket.id);
        });
        this.players.push(player);
    }
    self.handleGameStateUpdate();
};

Game.prototype.submitAnswer = function(playerId, answerText){
    // submission only goes through if:
    // 1. it matches the prompt
    // 2. the game is in the proper phase
    // else fail silently
    // note that, as long as it's still phase 1, the server implementation allows players to change their answers!
    var answerValidity = validateAnswer(answerText, this.prompt, {
        ignoredCharacters: this.ignoredCharacters,
        optionallyIgnoredWords: this.optionallyIgnoredWords
    }); 
    if (answerValidity && this.phase === 1){
        var player = this.getPlayerById(playerId);
        player.setAnswer(answerText);
    }
    this.handleGameStateUpdate();
};

Game.prototype.submitVote = function(voterId, voteeId){
    // submission only goes through if:
    // 1. the game is in the proper phase
    // 2. a player is not voting for themselves 
    // else fail silently
    // TODO: prevent multiple voting by checking for voteeId
    if (voterId !== voteeId && this.phase === 2){
        var votee = this.getPlayerById(voteeId);
        votee.addVote(voterId);
    }
    this.handleGameStateUpdate();
};

Game.prototype.getPlayerById = function(id){
    var matchedPlayer = this.players.filter(function(player){
        if (player.socket.id === id) {
            return true;
        } else {
            return false;
        }
    })[0];
    return matchedPlayer;
};

Game.prototype.removePlayerById = function(id){
    var self = this;
    var indexOfPlayerToRemove;
    for (var i = 0; i < this.players.length; i++){
        if (self.players[i].socket.id === id) { indexOfPlayerToRemove = i; }
    }
    this.players.splice(indexOfPlayerToRemove, 1);
    // player departure requires a new check for whether the game is viable or not
    if (this.checkIfGameCanBeRemoved()){
        this.markGameForRemoval();
    }
};

Game.prototype.judgeGame = function(){
    this.players.sort(function(a, b){
        if (a.voters.length < b.voters.length){
            return 1;
        } else if (a.voters.length > b.voters.length) {
            return -1;
        // tiebreaker: who answered first?
        } else if (a.answer.timestamp > b.answer.timestamp) {
            return 1;
        } else if (a.answer.timestamp < b.answer.timestamp) {
            return -1;
        } else {
            return 0;
        }
    });
    // players may leave the room after the game is complete, but we still need their results around
    // this needs to be a deep copy, not a pointer pass, otherwise it won't work
    this.results = this.players.map(function(player){ return player.marshalPublicObject(); });
    this.results = JSON.parse(JSON.stringify(this.results));
};

module.exports = Game;