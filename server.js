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
	clockLength: 5,
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

function Lobby(){
	var self = this;
	this.currentGames = [];
	setInterval(function(){
		self.purgeEndedGames();
	}, 20000);
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
	var newGame = new Game();
	newGame.addPlayer(player);
	this.addGame(newGame);
	return this.currentGames[this.currentGames.length - 1];
};

// set up Game class

function Game(){
	this.id = gameIdCounter;
	gameIdCounter++;
	this.players = [];
	this.phase = 0;
	this.promptLength = gameConfig.promptLength;
	this.minimumPlayers = gameConfig.minimumPlayers;
	this.emissionTimerIds = [];
};

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

Game.prototype.addPlayer = function(player){
	if (this.phase === 0){
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

Game.prototype.getNumberOfPlayers = function(){
	return this.players.length;
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
	this.results = this.players;
};

// set up Player class

function Player(id){
	this.id = id;
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


// set up socket.io listener and events

var port = 3700;

var io = require('socket.io').listen(app.listen(port));

var lobby = new Lobby();

io.sockets.on('connection', function(socket){
	// every time a connection is made, add that player to the game...
	var player = new Player(socket.id);
	var game = lobby.addPlayerToOpenGame(player);

	// ...assign that player's socket to a room for that game
	var room = game.id;
	socket.join(room);

	// ...and, if we have enough players, start the game...
	if (game.getNumberOfPlayers() >= gameConfig.minimumPlayers){
		game.begin();
	};

	var emissionId = setInterval(function(){
		console.log('***emitting game state at %s', new Date());
		io.sockets.in(room).emit('gameState', game);
	}, 1000);

	game.emissionTimerIds.push(emissionId);

	// whenever a player submits an answer, add it
	socket.on('submitAnswer', function(data){
		game.submitAnswer(socket.id, data.answerText);
	});

	// whenever a player submits a vote, add it
	socket.on('submitVote', function(data){
		game.submitVote(socket.id, data.voteeId);
	});

	// whenever a player disconnects, remove them from the game and broadcast the new game state
	socket.on('disconnect', function(){
		game.removePlayerById(socket.id);
	});
});