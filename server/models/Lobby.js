var Player = require('./Player');
var Game = require('./Game');
var gameConfig = require('../gameConfig');

// set up Lobby class
var Lobby = function(io){
    var self = this;
    // hacky, but it works!
    this.gameIdCounter = 0;
    this.players = [];
    this.games = [];
    // lobby needs the io object so it can pass it to the new games it creates;
    // sending gameState is handled at the game object level
    this.io = io;
    // every time a login is made, add that player to an open game
    this.io.sockets.on('connection', function(socket){
        socket.on('login', function(options){
            var player = new Player(socket, options);
            self.addPlayer(player);
            socket.on('leaveGame', function(){
                // when a player voluntarily leaves a game, put then back in the lobby
                var game = self.getGameByContainedPlayerId(player.socket.id);
                var playerPointer = game.getPlayerById(player.socket.id);
                // it's possible for another async function to have removed the player in the
                // middle of this function
                if (playerPointer !== undefined){
                    game.flushListenersByPlayerId(player.socket.id);
                    game.removePlayerById(player.socket.id);
                    playerPointer.flushGameData();
                    self.addPlayer(playerPointer);
                    self.autoAssignPlayersToGames();
                }
            });
            socket.on('disconnect', function(){
                var game = self.getGameByContainedPlayerId(player.socket.id);
                // if a player disconnects, they need to be purged from their current game or the lobby,
                // if they're in the lobby
                game.removePlayerById(player.socket.id);
                self.removePlayerById(player.socket.id);
            });
        });     
    });
    // TODO: setinterval seems like a crappy way to handle this; do something event-based or using
    // timeout instead
    setInterval(function(){
        self.autoAssignPlayersToGames();
        self.purgeEndedGames();
    }, 1000);

    this.addGame = function(game){
        self.games.push(game);
    };

    this.addPlayer = function(player){
        self.players.push(player);
        player.updateLastMovedTimestamp();
    };

    this.purgeEndedGames = function(){
        self.games = self.games.filter(function(game){
            if (game.phase === 4 && game.players.length === 0){
                return false;
            } else {
                return true;
            }
        });
    };

    this.removePlayerById = function(id){
        var indexOfPlayerToRemove;
        for (var i = 0; i < self.players.length; i++){
            if (self.players[i].socket.id === id) { indexOfPlayerToRemove = i; }
        }
        if (indexOfPlayerToRemove !== undefined) {
           self.players.splice(indexOfPlayerToRemove, 1);
        }
    };

    this.getGameByContainedPlayerId = function(id){
        var gameIndex;
        for (var i = 0; i < self.games.length; i++){
            if (self.games[i].getPlayerById !== undefined) {
                gameIndex = i;
            }
        }
        return self.games[gameIndex];
    };

    this.autoAssignPlayersToGames = function(){
        var players = self.players;
        var minPlayers = gameConfig.minPlayers;
        var maxPlayers = gameConfig.maxPlayers;
        var idealGameWait = gameConfig.idealGameWait;
        // first, sort players so the ones the array goes in the order of how long that
        // player has been waiting
        self.players.sort(function(a, b){
            if (a.getLastMovedTimestamp() > b.getLastMovedTimestamp()){
                return 1;
            } else if (a.getLastMovedTimestamp() < b.getLastMovedTimestamp()) {
                return -1;
            } else {
                return 0;
            }
        });
        var newGame;
        // assign players in chunks of maxPlayers, if possible
        while (players.length >= maxPlayers){
            newGame = new Game(self.io, self.gameIdCounter, gameConfig);
            self.gameIdCounter++;
            self.addGame(newGame);
            for (var i=0; i < maxPlayers; i++){
                // move player from lobby to game
                newGame.addPlayer(players[0]);
                self.players.splice(0, 1);
            }
            newGame.allowGameToBegin();
        }
        // now, check to see if any players have been waiting for too long and can be assigned
        // to a game with at least maxPlayers
        var longestPlayerWaitLength = (self.players.length !== 0) ? (Date.now() - self.players[0].getLastMovedTimestamp()) : 0;
        if (longestPlayerWaitLength > (idealGameWait * 1000) && players.length >= minPlayers){
            newGame = new Game(self.io, self.gameIdCounter, gameConfig);
            self.gameIdCounter++;
            self.addGame(newGame);
            while(players.length > 0){
                // move player from lobby to game
                newGame.addPlayer(players[0]);
                self.players.splice(0, 1);
            }
            newGame.allowGameToBegin();
        }
    };

    // Lobby has no public API
    return {};
};

module.exports = Lobby;