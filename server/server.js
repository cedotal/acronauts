// set up express

var express = require('express');
var app = express();

// set up jade templating
app.set('views', __dirname + '/../templates');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);
app.get('/', function(req, res){
	res.render('page');
});

// set up static file server
app.use(express.static(__dirname + '/../public'));

// set up game config
var gameConfig = {
	promptLength: 5, // the number of characters in an acronauts prompt
	clockLength: 60, // the amount of time players have to answer the prompt
	gameStartDelay: 5, // the minimum amount of time players should have
	idealGameWait: 15, // the maximum amount of time that players will ideally wait for additional players to be added on top of minPlayers 
	maxPlayers: 8, // the most players we should have in a game
	minPlayers: 3, // the fewest players we should have in a game
	ignoredCharacters: ['\'', '\"'], // characters that will always be ignored if part of an answer
	optionallyIgnoredWords: ['a', 'an', 'the'] // words that can be either counted or not counted as part of an answer
};

// get our utility function for generating the prompts
var gameUtils = require('./gameUtils');
var generatePrompt = gameUtils.generatePrompt;
var validateAnswer = gameUtils.validateAnswer;

// set up Player class
function Player(socket){
	this.socket = socket;
	this.voters = [];
	this.answer = {};
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
		'voters'
	];
	publicAttrs.forEach(function(attr){
		publicObject[attr] = self[attr];
	});
	publicObject.id = self.socket.id;
	return publicObject;
};

// set up Game class
function Game(io, gameId){
	var self = this;
	this.io = io;
	this.id = gameId;
	this.players = [];
	this.phase = 0;
	this.promptLength = gameConfig.promptLength;
	this.minPlayers = gameConfig.minPlayers;
	this.maxPlayers = gameConfig.maxPlayers;
	this.ignoredCharacters = gameConfig.ignoredCharacters;
	this.optionallyIgnoredWords = gameConfig.optionallyIgnoredWords;
	this.idealStartTime = Date.now() + (gameConfig.idealGameWait * 1000);
	setInterval(function(){
		self.tick();
	}, 500);
}

Game.prototype.tick = function(){
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
		this.prompt = generatePrompt(gameConfig.promptLength);
		this.clockStart = Date.now() + gameConfig.gameStartDelay * 1000;
		this.clockEnd = Date.now() + (gameConfig.gameStartDelay + gameConfig.clockLength) * 1000;
		this.phase = 1;
		var answeringEndTimestamp = self.clockEnd - Date.now();
		setTimeout(function(){
			self.endAnswering();
		}, answeringEndTimestamp);
	}
};

Game.prototype.endAnswering = function(){
	if (this.phase === 1){
		this.phase = 2;
	}
};

Game.prototype.endVoting = function(){
	if (this.phase === 2){
		this.phase = 3;
		this.judgeGame();
	}
};

Game.prototype.markGameForRemoval = function(){
	if (this.phase === 3){
		this.phase = 4;
	}
};

Game.prototype.addPlayer = function(player){
	console.log('adding player %s to game %s', player.socket.id, this.id);
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
};

Game.prototype.submitAnswer = function(playerId, answerText){
	// submission only goes through if:
	// 1. it matches the prompt
	// 2. the game is in the proper phase
	// else fail silently
	// note that, as long as it's still phase 1, the server implementation allows players to change their answers!
	if (validateAnswer(answerText, this.prompt, this.ignoredCharacters, this.optionallyIgnoredWords) && this.phase === 1){
		var player = this.getPlayerById(playerId);
		player.setAnswer(answerText);
	}
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

// set up Lobby class
function Lobby(io){
	var self = this;
	// hacky, but it works!
	this.gameIdCounter = 0;
	this.currentGames = [];
	// lobby needs the io object so it can pass it to the new games it creates; io is handled at the game object level
	this.io = io;
	// every time a connection is made, add that player to an open game
	this.io.sockets.on('connection', function(socket){
		var player = new Player(socket);
		self.addPlayerToOpenGame(player);
	});
	setInterval(function(){
		self.purgeEndedGames();
	}, 5000);
}

Lobby.prototype.addGame = function(game){
	this.currentGames.push(game);
};

Lobby.prototype.purgeEndedGames = function(){
	this.currentGames = this.currentGames.filter(function(currentGame){
		if (currentGame.phase === 4 && currentGame.players.length === 0){
			return false;
		} else {
			return true;
		}
	});
};

Lobby.prototype.addPlayerToOpenGame = function(player){
	var self = this;
	var playerAssigned = false;
	for (var i = 0; i < self.currentGames.length ; i++){
		var currentGame = self.currentGames[i];
		if (currentGame.phase === 0 && currentGame.players.length < gameConfig.maxPlayers){
			currentGame.addPlayer(player);
			playerAssigned = true;
			console.log('adding player to previously-existing game with id %s', currentGame.id);
			return self.currentGames[i];
		}
	}
	// if we made it this far, the player was not assigned to any open games, so we have to create a new one
	var newGame = new Game(this.io, this.gameIdCounter);
	this.gameIdCounter++;
	newGame.addPlayer(player);
	this.addGame(newGame);
	console.log('adding player to new game with id %s', newGame.id);
	return this.currentGames[this.currentGames.length - 1];
};

// set up socket.io listener and events
var port = 3700;

var io = require('socket.io').listen(app.listen(port), { log: true });

var lobby = new Lobby(io);