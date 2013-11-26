var socket = io.connect('http://localhost:3700');

function statusView(){
	this.render = function(gameData){
		var statusElement = document.getElementById("status");
		var gameState = gameData.state;
		switch (gameState){
			case 0:
				htmlOutput = 'Waiting for players...</div>';
				break;
			case 1:
				htmlOutput = '<div>Game on: enter answer</div>';
				break;
			case 2:
				htmlOutput = '<div>Time to vote.</div>';
				break;
			case 3:
				htmlOutput = '<div>Game finished.</div>';
				break;
			default:
				htmlOutput = 'An invalid game state has been reached.';
		};
		statusElement.innerHTML = htmlOutput;
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
				var answerPrompt = $('#answerPrompt');
				var answerPromptInput = $('#answerPromptInput');
				answerPrompt.submit(function(){
					var inputValue = answerPromptInput.val();
					socket.emit('submitAnswer', {
						answerText: inputValue
					});
					$('input').attr('disabled', true);
					return false;
				});
				break;
			case 2:
				break;
			case 3:
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
		var self = this;
		var outputElement = document.getElementById('timer');
		var gameState = gameData.state;
		var intervalSet = false;
		switch(gameState){
			case 1:
				if (self.timerId === undefined) {
					self.timerId = setInterval(function(){
						var timerText;
						if (gameData.clockStart > new Date()){
							console.log('time is before clockStart');
							var currentWait = Math.ceil((gameData.clockStart - Date.now())/1000);
							timerText = currentWait + ' sec until start'
						} else if ( gameData.clockStart < new Date() && new Date() < gameData.clockEnd ) {
							console.log('time is between clockStart and clockEnd');
							var secondsLeft = Math.ceil((gameData.clockEnd - Date.now())/1000);
							timerText = secondsLeft + ' secs left'
						} else {
							console.log('time is after clockEnd')
							timerText = 'Time\'s up!';
						}
						outputElement.innerHTML = timerText;
						intervalSet = true;
					}, 1000);
				};
				break;
			default:
				intervalSet = false;
				clearInterval(self.timerId);
				htmlOutput = '';
				outputElement.innerHTML = htmlOutput;
		}
	}
};

function playerListView(){
	this.render = function(gameData){
		var gameState = gameData.state;
		var intervalSet = false;
		var playerListElement = $('#playerList');

		switch(gameState){
			case 0:
			case 1:
				htmlOutput = '';
				htmlOutput += '<div>Players</div>';
				gameData.players.forEach(function(player){
					htmlOutput += '<div>' + player.id + '</div>';
				});
				playerListElement.html(htmlOutput);
				break;
			case 2:
				playerListElement.empty();
				gameData.players.forEach(function(player){
					// don't display a voting option for the current player; the server would eat it anyway!
					if (player.id !== socket.socket.sessionid) {
						playerListElement.append('<form id="' + player.id + '">' + player.answer.text + '<input type="submit"></input></form>');
						$('#' + player.id).submit(function(){
							socket.emit('submitVote', {
								voteeId: player.id
							});
							gameData.players.forEach(function(player){
								$('#' + player.id).attr('disabled', true);
							});
							return false;
						});
					};
				});
				break;
			case 3:
				playerListElement.empty();
				var winnerId = gameData.players.filter(function(player){
					return player.winner;
				})[0].id;
				htmlOutput = 'The winner is: ' + winnerId;
				playerListElement.html(htmlOutput);
				break;
			default:
				htmlOutput = 'An invalid game state has been reached.';
				playerListElement.html(htmlOutput);
		};
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
	this.views.push(new statusView());
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