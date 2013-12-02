
var socket = io.connect('http://localhost:3700');

// figure out if an answer is a legal match for a given prompt
var validateAnswer = function(answer, prompt){
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

// accepts a gameState and figures out whether it's currently:
// (0) before the start of the game clock
// (1) after the start of the game clock, but before the end of the game clock
// (2) after the end of the game clock

var clockStateFromGameState = function(gameState){
	var currentTime = new Date().getTime();
	if (currentTime < gameState.clockStart){
		return 0;
	} else if (gameState.clockStart <= currentTime && currentTime <= gameState.clockEnd) {
		return 1;
	} else {
		return 2;
	};
};


// container for holding all of our views, so the controllers don't have to access them through window object
var views = {};

views.statusView = function(el){
	this.render = function(gameState){
		switch (gameState.phase){
			case 0:
				htmlOutput = 'Waiting for players to join...';
				break;
			case 1:
				var clockState = clockStateFromGameState(gameState);
				if (clockState === 0){
					var currentWait = Math.ceil((gameState.clockStart - Date.now())/1000);
					htmlOutput = currentWait + ' sec until start'
				} else if (clockState === 1) {
					var secondsLeft = Math.ceil((gameState.clockEnd - Date.now())/1000);
					htmlOutput = secondsLeft + ' secs left'
				} else if (clockState === 2) {
					htmlOutput = 'Time\'s up!';
				} else {
					console.log('you\'ve done something terribly wrong with clockState');
				};
				$(el).html(htmlOutput);
				break;
			default:
				htmlOutput = 'An invalid game phase has been reached.';
		};
		$(el).html(htmlOutput);
	};
};

views.inputView = function(el){
	var self = this;
	this.render = function(gameState){
		var gamePhase = gameState.phase;
		var htmlOutput = '';
		switch (gamePhase){
			case 0:
				$(el).html(htmlOutput);
				break;
			case 1:
			var clockState = clockStateFromGameState(gameState);
				if (clockState == 1){
					var timeoutValue = gameState.clockStart - new Date().getTime();
					setTimeout(function(){
						htmlOutput += '<div>Type in your backronym:<form id="answerPrompt"><input id="answerPromptInput" type="text"></input><input type="submit"></input></form></div>';
						$(el).html(htmlOutput);
						var answerPrompt = $('#answerPrompt');
						var answerPromptInput = $('#answerPromptInput');
						answerPrompt.submit(function(){
							var inputValue = answerPromptInput.val();
							if (validateAnswer(inputValue, gameState.prompt)){
								socket.emit('submitAnswer', {
									answerText: inputValue
								});
								$('input').attr('disabled', true);
							} else {
								alert('That answer doesn\'t match the acronym given - try again!');
							};
							return false;
						});
					}, timeoutValue);
					// turn off autoupdate so it doesn't eat the reponses
					self.autoupdate = false;
				};
				break;
			default:
				htmlOutput = 'An invalid game phase has been reached.';
				$(el).html(htmlOutput);
		};
	}
};

views.playerListView = function(el){
	this.render = function(gameState){
		var gamePhase = gameState.phase;
		var intervalSet = false;
		var playerListElement = $(el);

		switch(gamePhase){
			case 0:
			case 1:
				htmlOutput = '';
				htmlOutput += '<div>Players</div>';
				gameState.players.forEach(function(player){
					htmlOutput += '<div>' + player.id;
					if (player.id === socket.socket.sessionid){
						htmlOutput += ' (YOU)';
					} ;
					htmlOutput += '</div>';
				});
				playerListElement.html(htmlOutput);
				break;
			default:
				htmlOutput = 'An invalid game phase has been reached.';
				playerListElement.html(htmlOutput);
		};
	};
};


views.promptView = function(el){
	var self = this;
	this.render = function(gameState){
		var gamePhase = gameState.phase;
		switch(gamePhase){
			case 0:
				var htmlOutput = '';
				for (var i = 0; i < gameState.promptLength; i++){
					htmlOutput += '_';
				};
				$(el).html(htmlOutput);
				break;
			case 1:
				var clockState = clockStateFromGameState(gameState);
				var htmlOutput = '';
				if (clockState === 0) {
					for (var i = 0; i < gameState.promptLength; i++){
						htmlOutput += '_';
					};
				} else {
					htmlOutput = gameState.prompt;
				};
				$(el).html(htmlOutput);
				break;
			default:
				console('an invalid game state has been passed to promptView');
		};
	};
};

views.votingView = function(el){
	var self = this;
	this.render = function(gameState){
		gameState.players.forEach(function(player){
			if (player.id !== socket.socket.sessionid) {
				$(el).append('<div>' + player.answer.text + '<button id="' + player.id + '">Vote</button></div>');
				$('#' + player.id).click(function(){
					socket.emit('submitVote', {
						voteeId: player.id
					});
					gameState.players.forEach(function(player){
						$('#' + player.id).attr('disabled', true);
					});
				});
			};
		});
		// turn autoupdate to false so new game states being sent from the server don't reset the diabled attr
		self.autoupdate = false;
	};
};

views.resultsView = function(el){
	this.render = function(gameState){
		var content = '';
		gameState.results.forEach(function(player){
			content += ('<div>' + player.id + ': "' + player.answer.text + '" - ' + player.voters.length + '</div>');
		});
		$(el).html(content);
	};
};

function ViewController(controllerEl, viewConfig){
	var self = this;
	// clear el
	$(controllerEl).empty();		
	viewConfig.forEach(function(view){
		// put the skeleton el in the view
		$(controllerEl).append($('<div/>', {id: view}));
	});
	// instantiate each view, now that the skeleton is there
	this.views = [];
	viewConfig.forEach(function(view){
		var viewEl = '#' + view;
		self.views.push(new views[view](viewEl));
	});
};

ViewController.prototype.renderViews = function(gameState){
	this.views.forEach(function(view){
		// some views (mainly inputs) need to be able to refuse auto-updates, else they'll
		// eat user input or fail to maintain disabled state
		if (view.autoupdate !== false){
			view.render(gameState);
		};
	});
};

function AlertController(){};

AlertController.prototype.handleAlerts = function(gameState){
	var failedToAnswerFlag = false;
	switch(gameState.phase){
		case 2:
			var matchedPlayer = gameState.players.filter(function(player){
				if (player.id === socket.socket.sessionid) {
					return true;
				} else {
					return false;
				};
			})[0];
			if (matchedPlayer.answer.text === undefined && failedToAnswerFlag === false){
				alert('Even though you didn\'t submit an answer in time, you can still vote for your favorite.');
				var failedToAnswerFlag = true;
			};
			break;
	};
};


function MasterController(el){
	var self = this;
	this.previousGameStateFromServer = { phase: undefined };

	// a function to be called when the game state changes and we have to start a completely new
	// controller to handle a completely new set of views
	this.initNewViewController = function(gameState){
		switch(gameState.phase){
			case 0:
				self.viewController = new ViewController(el,  [
					'statusView',
					'promptView',
					'inputView',
					'playerListView'
				]);
				break;
			case 1:
				self.viewController = new ViewController(el,  [
					'statusView',
					'promptView',
					'inputView',
					'playerListView'
				]);
				// set the timer for 1. input reveal, 2. ticker update
				var timerId = setInterval(function(){
					self.viewController.renderViews(self.previousGameStateFromServer);
				}, 1000);
				break;
			case 2:
				self.viewController = new ViewController(el, [
					'votingView'
					]);
				break;
			case 3:
				self.viewController = new ViewController(el,  [
					'resultsView'
				]);
				break;
		};
	};

	this.alertController = new AlertController();

	// whenever a new game state comes in, do the following
	socket.on('gameState', function(gameState){
		console.log('gameState recieved: %j', gameState);
		// 1. check the previous game phase. if it does not equal the new game phase being passed in,
		// init a new one in its place
		if (self.previousGameStateFromServer.phase !== gameState.phase){
			self.initNewViewController(gameState);
		};

		// 2. render all views in the current controller
		self.viewController.renderViews(gameState);

		// 3. throw any necessary alerts
		self.alertController.handleAlerts(gameState);

		// 3. set the new previous game state.
		self.previousGameStateFromServer = gameState;
	});
};

var controller = new MasterController('#wrapper');