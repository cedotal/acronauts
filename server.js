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
	promptLength: 1,
	clockLength: 10,
	gameStartDelay: 10,
	maximumPlayers: 3
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
		if (currentGame.state === 4){
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
		if (currentGame.state === 0 && currentGame.players.length < gameConfig.maximumPlayers){
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
	this.state = 0;
	this.promptLength = gameConfig.promptLength;
};

Game.prototype.begin = function(){
	this.prompt = generatePrompt(gameConfig.promptLength);
	this.clockStart = Date.now() + gameConfig.gameStartDelay * 1000;
	this.clockEnd = Date.now() + (gameConfig.gameStartDelay + gameConfig.clockLength) * 1000;
	this.state = 1;
};

Game.prototype.endAnswering = function(){
	this.state = 2;
};

Game.prototype.endVoting = function(){
	this.state = 3;
	var winningPlayerId = this.getWinningPlayerId();
	this.players.forEach(function(player){
		if (player.id === winningPlayerId) {
			player.winner = true;
		} else {
			player.winner = false;
		};
	});
};

Game.prototype.addPlayer = function(player){
	this.players.push(player);
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
	// 2. the game is in the proper state
	// else fail silently
	if (this.validateAnswer(answerText, this.prompt) && this.state === 1){
		var player = this.getPlayerById(playerId);
		player.setAnswer(answerText);
	};
};

Game.prototype.submitVote = function(voterId, voteeId){
	// submission only goes through if:
	// 1. the game is in the proper state
	// 2. a player is not voting for themselves 
	// else fail silently
	console.log('executing submitVote');
	console.log('(voterId !== voteeId): %s', (voterId !== voteeId));
	console.log('(this.state === 2): %s', (this.state === 2));
	if (voterId !== voteeId && this.state === 2){
		var votee = this.getPlayerById(voteeId);
		votee.addVote(voterId);
	};
};

Game.prototype.isAnsweringComplete = function(){
	var complete = true;
	this.players.forEach(function(player){
		if (player.answer.text === undefined){
			complete = false;
		};
	});
	return complete;
};

Game.prototype.isVotingComplete = function(){
	var playerCount = this.players.length;
	var votes = 0;
	this.players.forEach(function(player){
		votes += player.voters.length;
	});
	return votes >= playerCount;
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

Game.prototype.getWinningPlayerId = function(){
	this.players.sort(function(a, b){
		if (a.voters.length > b.voters.length){
			return 1;
		}
		// tiebreaker: who answered first?
		else if (a.answer.timestamp < b.answer.timestamp) {
			return 1;
		} else {
			return -1
		};
	});
	return this.players[this.players.length - 1].id;
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
	if (game.getNumberOfPlayers() >= gameConfig.maximumPlayers){
		game.begin();
	};

	// and broadcast the new game state
	io.sockets.in(room).emit('gameState', game);

	// whenever a player submits an answer, add it
	socket.on('submitAnswer', function(data){
		game.submitAnswer(socket.id, data.answerText);
		if (game.isAnsweringComplete()){
			game.endAnswering();
			io.sockets.in(room).emit('gameState', game);
		};
	});

	// whenever a player submits a vote, add it
	socket.on('submitVote', function(data){
		game.submitVote(socket.id, data.voteeId);
		if (game.isVotingComplete()){
			game.endVoting();
			io.sockets.in(room).emit('gameState', game);
		};
	});

	// whenever a player disconnects, remove them from the game and broadcast the new game state
	socket.on('disconnect', function(){
		game.removePlayerById(socket.id);
		io.sockets.in(room).emit('gameState', game);
	});
});