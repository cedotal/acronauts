// set up express

var express = require("express");
var app = express();

// set up jade templating

app.set('views', __dirname + '/templates');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);
app.get('/', function(req, res){
	res.render("page");
});

// set up static file server

app.use(express.static(__dirname + '/public'));

// set up game config

var gameConfig = {
	promptLength: 5,
	clockLength: 30,
	gameStartDelay: 5,
	maximumPlayers: 2,
	minimumPlayers: 2
};

var gameIdCounter = 0;

var currentGames = [];

// set up utility functions

function randomLetter(){
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz";
    return possible.charAt(Math.floor(Math.random() * possible.length));;
};

function generatePrompt(length){
	var prompt = '';
	for (var i = 0; i < length; i++){
		prompt += randomLetter();
	}
	return prompt;
};

// set up Lobby class

function Lobby(io){
	var self = this;
	// lobby needs the io object so it can pass it to the new games it creates
	this.io = io;
	this.io.sockets.on('connection', function(socket){
		var player = new Player(socket);
		// every time a connection is made, add that player to an open game
		self.addPlayerToOpenGame(player);
	});
	this.currentGames = [];
	setInterval(function(){
		self.purgeEndedGames();
	});
};

Lobby.prototype.addGame = function(game){
	this.currentGames.push(game);
};

Lobby.prototype.purgeEndedGames = function(){
	this.currentGames = this.currentGames.filter(function(currentGame){
		if (currentGame.phase === 4){
			return false
		} else {
			return true;
		};
	});
};

Lobby.prototype.addPlayerToOpenGame = function(player){
	var self = this;
	var playerAssigned = false;
	for (var i = 0; i < self.currentGames.length ; i++){
		var currentGame = self.currentGames[i];
		if (currentGame.phase === 0 && currentGame.players.length < gameConfig.maximumPlayers){
			currentGame.addPlayer(player);
			playerAssigned = true;
			return self.currentGames[i];
		};
	};
	// if we made it this far, the player was not assigned to any open games, so we have to create a new one
	var newGame = new Game(this.io);
	newGame.addPlayer(player);
	this.addGame(newGame);
	return this.currentGames[this.currentGames.length - 1];
};

// set up Game class

function Game(io){
	var self = this;
	this.io = io;
	this.id = gameIdCounter;
	gameIdCounter++;
	this.players = [];
	this.phase = 0;
	this.promptLength = gameConfig.promptLength;
	this.minimumPlayers = gameConfig.minimumPlayers;
	setInterval(function(){
		self.tick();
	}, 500);
};

Game.prototype.tick = function(){
	console.log('ticking with this.phase: %s', this.phase);
	var self = this;
	switch(this.phase){
		case 0:
			if(this.checkIfGameCanBegin() === true){
				this.begin();
			};
			break;
		case 1:
			if(this.checkIfAnsweringIsComplete() === true){
				this.endAnswering();
			};
			break;
		case 2:
			if(this.checkIfVotingIsComplete() === true){
				this.endVoting();
			};
			break;
		case 3:
			if(this.checkIfGameCanBeRemoved === true){
				this.markGameForRemoval();
			};
			break;
	};
	io.sockets.in(this.id).emit('gameState', this.marshalPublicObject());
};

Game.prototype.marshalPublicObject = function(){
	var self = this;
	var publicObject = {};
	var publicAttrs = [
		'phase',
		'promptLength',
		'minimumPlayers',
		'id',
		'clockStart',
		'clockEnd'
	];
	publicAttrs.forEach(function(attr){
		publicObject[attr] = self[attr];
	});
	publicObject.players = this.players.map(function(player){
		return player.marshalPublicObject();
	});
	return publicObject;
};

// functions that check whether the game phase can be advanced

Game.prototype.checkIfGameCanBegin = function(){
	if (this.players.length >= this.minimumPlayers) {
		return true;
	} else {
		return false;
	};
};

Game.prototype.checkIfAnsweringIsComplete = function(){
	var totalAnswers = 0;
	this.players.forEach(function(player){
		if (player.answer.text !== undefined && player.answer.text !== ''){
			totalAnswers += 1;
		};
	});
	// answering is complete if either everyone has answered, or we're past the end of the clock
	if (totalAnswers >= this.players.length || Date.now() >= this.clockEnd) {
		return true;
	} else {
		return false;
	};
};

Game.prototype.checkIfVotingIsComplete = function(){
	var totalVotes = 0;
	this.players.forEach(function(player){
		totalVotes += player.voters.length;
	});
	if (totalVotes >= this.players.length) {
		return true;
	} else {
		return false;
	};
};

Game.prototype.checkIfGameCanBeRemoved = function(){
	if (this.players.length === 0) {
		return true;
	} else {
		return false;
	};
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
	};
};

Game.prototype.endAnswering = function(){
	if (this.phase === 1){
		this.phase = 2;
	};
};

Game.prototype.endVoting = function(){
	if (this.phase === 2){
		this.phase = 3;
		this.judgeGame();
	};
};

Game.prototype.markGameForRemoval = function(){
	if (this.phase === 3){
		this.phase = 4;
	};
};

Game.prototype.addPlayer = function(player){
	var self = this;
	if (this.phase === 0){
		player.socket.join(this.id);
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
	};
};

Game.prototype.validateAnswer = function(answer, prompt){
	if (answer === undefined || prompt === undefined) {
		return false;
	} else {
		answer = answer.toLowerCase().split(' ').filter(function(segment){ return segment !== '';});
		prompt = prompt.toLowerCase();
		if (answer.length !== prompt.length){ return false };
		for (var i = 0; i < answer.length; i++){
			if (answer[i][0] !== prompt[i]){ return false };
		};
		return true;
	};
};

Game.prototype.submitAnswer = function(playerId, answerText){
	// submission only goes through if:
	// 1. it matches the prompt
	// 2. the game is in the proper phase
	// else fail silently
	// note that, as long as it's still phase 1, the server implementation allows players to change their answers!
	if (this.validateAnswer(answerText, this.prompt) && this.phase === 1){
		var player = this.getPlayerById(playerId);
		player.setAnswer(answerText);
	};
};

Game.prototype.submitVote = function(voterId, voteeId){
	// submission only goes through if:
	// 1. the game is in the proper phase
	// 2. a player is not voting for themselves 
	// else fail silently
	if (voterId !== voteeId && this.phase === 2){
		var votee = this.getPlayerById(voteeId);
		votee.addVote(voterId);
	};
};

Game.prototype.getPlayerById = function(id){
	var matchedPlayer = this.players.filter(function(player){
		if (player.id === id) {
			return true;
		} else {
			return false;
		};
	})[0];
	return matchedPlayer;
};

Game.prototype.removePlayerById = function(id){
	this.players = this.players.filter(function(player){
		if (player.id === id) {
			return false;
		} else {
			return true;
		}
	});
};

Game.prototype.judgeGame = function(){
	this.players.sort(function(a, b){
		if (a.voters.length < b.voters.length){
			return 1;
		} else if (a.voters.length > b.voters.length) {
			return -1;
		// tiebreaker: who answered first?
		} else if (a.answer.timestamp > b.answer.timestamp) {
			return 1
		} else if (a.answer.timestamp < b.answer.timestamp) {
			return -1
		} else {
			return 0;
		};
	});
	// players may leave the room after the game is complete, but we still need their results around
	// TODO: needs to be a deep copy, not a pointer pass, otherwise it won't work
	this.results = this.players;
};

// set up Player class

function Player(socket){
	this.socket = socket;
	this.voters = [];
	this.answer = {};
};

Player.prototype.addVote = function(votingPlayerId){
	this.voters.push(votingPlayerId);
};

Player.prototype.setAnswer = function(answerText){
	this.answer = {
		text: answerText,
		timestamp: Date.now()
	};
};

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


// set up socket.io listener and events

var port = 3700;

var io = require('socket.io').listen(app.listen(port));

var lobby = new Lobby(io);