var Player = require('./Player');
var Game = require('./Game');
var gameConfig = require('../gameConfig');

// set up Lobby class
var Lobby = function(io){
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

    this.addGame = function(game){
        self.currentGames.push(game);
    };

    this.purgeEndedGames = function(){
        self.currentGames = self.currentGames.filter(function(currentGame){
            if (currentGame.phase === 4 && currentGame.players.length === 0){
                return false;
            } else {
                return true;
            }
        });
    };

    this.addPlayerToOpenGame = function(player){
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
        var newGame = new Game(self.io, self.gameIdCounter, gameConfig);
        self.gameIdCounter++;
        newGame.addPlayer(player);
        self.addGame(newGame);
        return self.currentGames[self.currentGames.length - 1];
    };

    // Lobby has no public API!
    return {};
};

module.exports = Lobby;