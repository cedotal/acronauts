requirejs.config({
	paths: {
		jquery: './lib/jquery-2.0.3',
		underscore: './lib/underscore',
		backbone: './lib/backbone',
		config: './config',
		validateAnswer: './utils/validateAnswer',
		clockStateFromGameState: './utils/clockStateFromGameState'
	},
	shim: {
        jquery: {
            exports: '$'
        },
        underscore: {
            exports: '_'
        },
        backbone: {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
    }
});

requirejs([
	'jquery',
	'underscore',
	'config',
	'./views/login/loginView',
	'./views/loading/loadingView',
	'./views/game/StatusView',
	'./views/game/InputView',
	'./views/game/PlayerListView',
	'./views/game/PromptView',
	'./views/game/VotingView',
	'./views/game/ResultsView',
	'./views/game/GameClosedView',
	'./views/game/DocumentTitleView'
	], function(
		$,
		_,
		config,
		loginView,
		loadingView,
		StatusView,
		InputView,
		PlayerListView,
		PromptView,
		VotingView,
		ResultsView,
		GameClosedView,
		DocumentTitleView){

	// container for holding all of our views, so the controllers don't have to access them through window object
	var views = {
		loginView: loginView,
		loadingView: loadingView,
		StatusView: StatusView,
		InputView: InputView,
		PlayerListView: PlayerListView,
		PromptView: PromptView,
		VotingView: VotingView,
		ResultsView: ResultsView,
		GameClosedView: GameClosedView,
		DocumentTitleView: DocumentTitleView
	};

	function ViewController(controllerEl, viewConfig){
		var self = this;
		this.views = [];		
		// clear el
		$(controllerEl).empty();
		viewConfig.forEach(function(view){
			// maintain consistency where view class prototypes are capitalized but instances aren't
			var viewName = view[0].toLowerCase() + view.slice(1);
			// put the skeleton el in the view
			$(controllerEl).append($('<div/>', {id: viewName}));
			// instantiate each view, now that the skeleton is there
			var viewEl = '#' + viewName;
			self.views.push(new views[view]({ el: viewEl }));
		});
	}

	ViewController.prototype.renderViews = function(renderData){
		this.views.forEach(function(view){
			// some views (mainly inputs) need to be able to refuse auto-updates, else they'll
			// eat user input or fail to maintain disabled state
			if (view.autoupdate !== false){
				view.render(renderData);
			}
		});
	};

	function App(el, socket){
		var self = this;
		this.previousGameStateFromServer = { phase: undefined };

		this.viewController = new ViewController(el, [
			'loginView'
		]);

		this.viewController.renderViews();

		// a function to be called when the game state changes and we have to start a completely new
		// controller to handle a completely new set of views
		this.initNewGameViewController = function(gameState){
			switch(gameState.phase){
				case 0:
					self.viewController = new ViewController(el,  [
						'DocumentTitleView',
						'StatusView',
						'PromptView',
						'InputView',
						'PlayerListView'
					]);
					break;
				case 1:
					self.viewController = new ViewController(el,  [
						'DocumentTitleView',
						'StatusView',
						'PromptView',
						'InputView',
						'PlayerListView'
					]);
					// set the timer for 1. input reveal, 2. ticker update
					var timerId = setInterval(function(){
						self.viewController.renderViews(self.previousGameStateFromServer);
					}, 1000);
					break;
				case 2:
					self.viewController = new ViewController(el, [
						'DocumentTitleView',
						'VotingView',
						'PlayerListView'
					]);
					break;
				case 3:
					self.viewController = new ViewController(el,  [
						'DocumentTitleView',
						'ResultsView'
					]);
					break;
				case 4:
					self.viewController = new ViewController(el,  [
						'DocumentTitleView',
						'GameClosedView'
					]);
					break;
			}
		};

		// whenever a new game state comes in, do the following
		socket.on('gameState', function(gameState){
			console.log('recieving gameState: %j', gameState);
			// modify gameState so that the (naive) views know which of the players in the gameState
			// is the client
			var currentPlayer = _.find(gameState.players, function(player){
				return player.id === socket.socket.sessionid;
			});
			currentPlayer.isClient = true;
			// check the previous game phase. if it does not equal the new game phase being passed in,
			// init a new controller in place of the old one
			if (self.previousGameStateFromServer.phase !== gameState.phase){
				self.initNewGameViewController(gameState);
			}

			// render all views in the current controller
			self.viewController.renderViews(gameState);

			// set the new previous game state.
			self.previousGameStateFromServer = gameState;
		});

		Backbone.on('login', function(payload){
			this.viewController = new ViewController(el, [
				'loadingView'
			]);
			this.viewController.renderViews();
			socket.emit('login', payload);

		});

		Backbone.on('submitAnswer', function(payload){
			socket.emit('submitAnswer', payload);
		});

		Backbone.on('submitVote', function(payload){
			socket.emit('submitVote', payload);
		});

		Backbone.on('leaveGame', function(){
			socket.emit('leaveGame');
			this.viewController = new ViewController(el, [
				'loadingView'
			]);
			this.viewController.renderViews();
		});

		Backbone.on('updatePlayerStatus', function(payload){
			socket.emit('updatePlayerStatus', payload);
		});
	}

	// TODO: make this dynamic based on env config
	var host = 'http://' + config.hostname + ':' + config.port;
	var mySocket = io.connect(host);

	var app = new App('#wrapper', mySocket);

});
