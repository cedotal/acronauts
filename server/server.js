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
	gameStartDelay: 15, // the minimum amount of time players should have
	idealGameWait: 5, // the maximum amount of time that players will ideally wait for additional players to be added on top of minPlayers 
	maxPlayers: 8, // the most players we should have in a game
	minPlayers: 3, // the fewest players we should have in a game
	ignoredCharacters: ['\'', '\"'], // characters that will always be ignored if part of an answer
	optionallyIgnoredWords: ['a', 'an', 'the'] // words that can be either counted or not counted as part of an answer
};

var Player = require('./models/Player');
var Game = require('./models/Game');
var Lobby = require('./models/Lobby');

// set up socket.io listener and events
var port = 3700;

var io = require('socket.io').listen(app.listen(port), { log: true });

var lobby = new Lobby(io);