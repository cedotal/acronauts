
var socket = io.connect('http://localhost:3700');

function outputView(){
	this.render = function(gameData){
		var outputElement = document.getElementById("output");
		var gameState = gameData.state;
		switch (gameState){
			case 0:
				htmlOutput = 'Waiting for game (' + gameData.id + ') to begin</div>';
				break;
			case 1:
				htmlOutput = '<div>The game (' + gameData.id + ') is now in the answering stage.</div>';
				break;
			case 2:
				htmlOutput = '<div>The game (' + gameData.id + ') is now in the voting stage</div>';
				break;
			case 3:
			var winningPlayer = gameData.players.filter(function(player){
				return player.winner;
			})[0];
				htmlOutput = '<div>The game (' + gameData.id + ') has concluded. The winning answer is: ' + winningPlayer.answer.text + '</div>';
				break;
			default:
				htmlOutput = 'An invalid game state has been reached.';
		};
		outputElement.innerHTML = htmlOutput;
	};
};

function inputView(){
	this.render = function(gameData){
		var outputElement = document.getElementById('input');
		var gameState = gameData.state;
		var htmlOutput = '';
		switch (gameState){
			case 0:
				outputElement.innerHTML = htmlOutput;
				break;
			case 1:
				htmlOutput += '<div>Type in your backronym:<form id="answerPrompt"><input id="answerPromptInput" type="text"></input><input type="submit"></input></form></div>';
				outputElement.innerHTML = htmlOutput;
				var answerPrompt = document.getElementById('answerPrompt');
				var answerPromptInput = document.getElementById('answerPromptInput');
				answerPrompt.onsubmit = function(){
					var inputValue = answerPromptInput.value;
					socket.emit('submitAnswer', {
						answerText: inputValue
					});
					answerPrompt.disabled = 'disabled';
					return false;
				};
				break;
			case 2:
				htmlOutput = '<div>Vote for the backronym you think is best:</div>';
				outputElement.innerHTML = htmlOutput;
				gameData.players.forEach(function(player){
					// don't display a voting options for the current player; the server would eat it anyway!
					if (player.id !== socket.socket.sessionid) {
						htmlOutput += '<div><form id="' + player.id + '">' + player.answer.text + '<input type="submit"></input></form></div>';
					};
				});
				outputElement.innerHTML = htmlOutput;
				gameData.players.forEach(function(player){
					document.getElementById(player.id).onsubmit = function(){
						socket.emit('submitVote', {
							voteeId: player.id
						});
						return false;
					};
				});
				break;
			case 3:
				outputElement.innerHTML = htmlOutput;
				break;
			default:
				htmlOutput = 'An invalid game state has been reached.';
				outputElement.innerHTML = htmlOutput;
		};
	}
};

function timerView(){
	this.render = function(gameData){
		console.log('rendering timerView');
		var outputElement = document.getElementById('timer');
		var gameState = gameData.state;
		var timerId;
		var intervalSet = false;
		switch(gameState){
			case 1:
				if (!intervalSet) {
					console.log('setting animation interval for timer');
					timerId = setInterval(function(){
						var timerText;
						if (gameData.clockStart > new Date()){
							console.log('time is before clockStart');
							var currentWait = Math.ceil((gameData.clockStart - Date.now())/1000);
							timerText = 'Game will start in ' + currentWait + ' seconds...'
						} else if ( gameData.clockStart < new Date() && new Date() < gameData.clockEnd ) {
							console.log('time is between clockStart and clockEnd');
							var secondsLeft = Math.ceil((gameData.clockEnd - Date.now())/1000);
							timerText = 'You have ' + secondsLeft + ' seconds left'
						} else {
							console.log('time is after clockEnd')
							timerText = 'Time is up!';
						}
						outputElement.innerHTML = timerText;
						intervalSet = true;
					}, 1000);
				};
				break;
			default:
				console.log('default timer switch branch');
				intervalSet = false;
				console.log('unsetting the following interval: %s', timerId);
				clearInterval(timerId);
				htmlOutput = '';
				outputElement.innerHTML = htmlOutput;
		}
	}
};

function playerListView(){
	this.render = function(gameData){
		var playerListElement = document.getElementById('playerList');
		htmlOutput = '';
		htmlOutput += '<div>Players: ' + gameData.players.length + '</div>';
		gameData.players.forEach(function(player){
			htmlOutput += '<div>' + player.id + '</div>';
		});
		playerListElement.innerHTML = htmlOutput;
	};
};


function promptView(){
	this.render = function(gameData){
		var promptElement = document.getElementById('prompt');
		var htmlOutput = '';
		if (gameData.prompt !== undefined){
			htmlOutput += gameData.prompt;
		} else {
			var dummyPrompt = '';
			for (var i = 0; i < gameData.promptLength; i++){
				htmlOutput += '_';
			};
		};
		promptElement.innerHTML = htmlOutput;
	};
};

function GameViewController(){
	var self = this;
	this.views = [];
	this.views.push(new outputView());
	this.views.push(new inputView());
	this.views.push(new timerView());
	this.views.push(new playerListView());
	this.views.push(new promptView());
	socket.on('gameState', function(data){
		console.log('gameState recieved: %j', data);
		self.views.forEach(function(view){
			view.render(data);
		});
	});
};

var controller = new GameViewController();