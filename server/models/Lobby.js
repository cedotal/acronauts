var Player = require('./Player');
var Game = require('./Game');
var gameConfig = require('../gameConfig');

// set up Lobby class
function Lobby(io){
    var self = this;
    // hacky, but it works!
    this.gameIdCounter = 0;
    this.currentGames = [];
    // lobby needs the io object so it can pass it to the new games it creates;
    // sending gameState is handled at the game object level
    this.io = io;
    // every time a login is made, add that player to an open game
    this.io.sockets.on('connection', function(socket){
        socket.on('login', function(options){
            var player = new Player(socket, options);
            self.addPlayerToOpenGame(player);
        });     
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
            return self.currentGames[i];
        }
    }
    // if we made it this far, the player was not assigned to any open games, so we have to create a new one
    var newGame = new Game(this.io, this.gameIdCounter, gameConfig);
    this.gameIdCounter++;
    newGame.addPlayer(player);
    this.addGame(newGame);
    return this.currentGames[this.currentGames.length - 1];
};

module.exports = Lobby;