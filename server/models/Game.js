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
    // TODO: why on earth all these all set as separate attrs when they're all in the config attr
    this.promptLength = gameConfig.promptLength;
    this.minPlayers = gameConfig.minPlayers;
    this.maxPlayers = gameConfig.maxPlayers;
    this.ignoredCharacters = gameConfig.ignoredCharacters;
    this.optionallyIgnoredWords = gameConfig.optionallyIgnoredWords;
    this.idealStartTime = Date.now() + (gameConfig.idealGameWait * 1000);
    this.gameCanBegin = false;

    // an object where keys are player ids and attrs are objects of the functions a game sets when
    // a player joins
    this.eventFunctions = {};

    this.handleGameStateUpdate = function(){
        switch(self.phase){
            case 0:
                if(self.checkIfGameCanBegin() === true){
                    self.begin();
                }
                break;
            case 1:
                if(self.checkIfAnsweringIsComplete() === true){
                    self.endAnswering();
                }
                break;
            case 2:
                if(self.checkIfVotingIsComplete() === true){
                    self.endVoting();
                }
                break;
            case 3:
                if(self.checkIfGameCanBeRemoved === true){
                    self.markGameForRemoval();
                }
                break;
        }
        self.players.forEach(function(player){
            player.socket.emit('gameState', self.marshalPublicObject());
        });
    };

    // expose this function so the lobby can tell it 'i'm done adding players to you, you can start'
    this.allowGameToBegin = function(){
        self.gameCanBegin = true;
        self.handleGameStateUpdate();
    };

    // create a public version of the game object to send out to the clients. socket.io will automatically
    // strip all attrs that contain functions, but some attrs are not supposed to be public and some will,
    // when serialized, generate circular reference errors
    this.marshalPublicObject = function(){
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
        publicObject.players = self.players.map(function(player){
            return player.marshalPublicObject();
        });
        return publicObject;
    };

    // functions that check whether the game phase can be advanced to the next phase at any given point
    this.checkIfGameCanBegin = function(){
        return self.gameCanBegin;
    };

    this.checkIfAnsweringIsComplete = function(){
        var totalAnswers = 0;
        self.players.forEach(function(player){
            var answer = player.getAnswer();
            if (answer.text !== undefined && answer.text !== ''){
                totalAnswers += 1;
            }
        });
        // answering is complete if either everyone has answered, or we're past the end of the clock
        return totalAnswers >= self.players.length || Date.now() >= self.clockEnd;
    };

    // TODO: if a player leaves before voting, voting could end before everyone left has voted
    this.checkIfVotingIsComplete = function(){
        var totalVotes = 0;
        self.players.forEach(function(player){
            totalVotes += player.getNumberOfVotes();
        });
        return totalVotes >= self.players.length;
    };

    this.checkIfGameCanBeRemoved = function(){
        return self.players.length === 0;
    };


    // functions that advance the game phase. note that none of them contains validity checks; those
    // are called by game.tick() before deciding whether or not to call these
    this.begin = function(){
        if (self.phase === 0){
            var gameConfig = self.gameConfig;
            self.prompt = generatePrompt(gameConfig.promptLength);
            self.clockStart = Date.now() + gameConfig.gameStartDelay * 1000;
            self.clockEnd = Date.now() + (gameConfig.gameStartDelay + gameConfig.clockLength) * 1000;
            self.phase = 1;
            var answeringEndTimer = self.clockEnd - Date.now();
            setTimeout(function(){
                self.endAnswering();
            }, answeringEndTimer);
            self.handleGameStateUpdate();
        }
    };

    this.endAnswering = function(){
        if (self.phase === 1){
            self.phase = 2;
        }
        self.players.forEach(function(player){
            player.setStatus(3);
        });
        self.handleGameStateUpdate();
    };

    this.endVoting = function(){
        if (self.phase === 2){
            self.phase = 3;
            self.judgeGame();
        }
        self.handleGameStateUpdate();
    };

    this.markGameForRemoval = function(){
        if (self.phase === 3){
            self.phase = 4;
        }
    };

    this.addPlayer = function(player){
        if (self.phase === 0){
            self.eventFunctions[player.socket.id] = {
                submitAnswer: function(data){
                    self.submitAnswer(player.socket.id, data.answerText);
                },
                submitVote: function(data){
                    self.submitVote(player.socket.id, data.voteeId);
                },
                updatePlayerStatus: function(data){
                    self.updatePlayerStatus(player.socket.id, data);
                }
            };
            player.socket.on('submitAnswer', self.eventFunctions[player.socket.id].submitAnswer);
            player.socket.on('submitVote', self.eventFunctions[player.socket.id].submitVote);
            player.socket.on('updatePlayerStatus', self.eventFunctions[player.socket.id].updatePlayerStatus);
            
            self.players.push(player);
        }
    };

    // remove the socket events that were set when this game was added to the game
    this.flushListenersByPlayerId = function(playerId){
        var player = self.getPlayerById(playerId);
        for (var attr in self.eventFunctions[playerId]){
            player.socket.removeListener(attr, self.eventFunctions[playerId][attr]);
        }
    };

    this.submitAnswer = function(playerId, answerText){
        // submission only goes through if:
        // 1. it matches the prompt
        // 2. the game is in the proper phase
        // else fail silently
        // note that, as long as it's still phase 1, the server implementation allows players to change their answers!
        var answerValidity = validateAnswer(answerText, self.prompt, {
            ignoredCharacters: self.ignoredCharacters,
            optionallyIgnoredWords: self.optionallyIgnoredWords
        }); 
        if (answerValidity && self.phase === 1){
            var player = self.getPlayerById(playerId);
            player.setAnswer(answerText);
            player.setStatus(2);
        }
        self.handleGameStateUpdate();
    };

    this.submitVote = function(voterId, voteeId){
        // submission only goes through if:
        // 1. the game is in the proper phase
        // 2. a player is not voting for themselves 
        // else fail silently
        // TODO: prevent multiple voting by checking for voteeId
        if (voterId !== voteeId && self.phase === 2){
            var votee = self.getPlayerById(voteeId);
            var voter = self.getPlayerById(voterId);
            votee.addVote(voterId);
            voter.setStatus(4);
        }
        self.handleGameStateUpdate();
    };

    this.getPlayerById = function(id){
        console.log('running getPlayerById for id %s', id);
        console.log('self.players:');
        console.log(self.players.map(function(player){ return player.socket.id; }));
        var matchedPlayer = self.players.filter(function(player){
            if (player.socket.id === id) {
                return true;
            } else {
                return false;
            }
        })[0];
        return matchedPlayer;
    };

    this.removePlayerById = function(id){
        var indexOfPlayerToRemove;
        for (var i = 0; i < self.players.length; i++){
            if (self.players[i].socket.id === id) { indexOfPlayerToRemove = i; }
        }
        if (indexOfPlayerToRemove !== undefined) {
            self.players.splice(indexOfPlayerToRemove, 1);
            // player departure requires a new check for whether the game is viable or not
            if (self.checkIfGameCanBeRemoved()){
                self.markGameForRemoval();
            }
        }
    };

    this.judgeGame = function(){
        self.players.sort(function(a, b){
            if (a.getNumberOfVotes() < b.getNumberOfVotes()){
                return 1;
            } else if (a.getNumberOfVotes() > b.getNumberOfVotes()) {
                return -1;
            // tiebreaker: who answered first?
            } else if (a.getAnswer().timestamp > b.getAnswer().timestamp) {
                return 1;
            } else if (a.getAnswer().timestamp < b.getAnswer().timestamp) {
                return -1;
            } else {
                return 0;
            }
        });
        // players may leave the room after the game is complete, but we still need their results around
        // self needs to be a deep copy, not a pointer pass, otherwise it won't work
        self.results = self.players.map(function(player){ return player.marshalPublicObject(); });
        self.results = JSON.parse(JSON.stringify(self.results));
    };

    // player statuses are:
    // 0: no answer yet
    // 1: partial answer typed in
    // 2: answer submitted
    // 3: no vote yet
    // 4: vote submitted 
    this.updatePlayerStatus = function(playerId, newStatus){
        self.getPlayerById(playerId).setStatus(newStatus);
        self.handleGameStateUpdate();
    };
}

// TODO: change this to only export the attrs that are necessary to have a public api

module.exports = Game;