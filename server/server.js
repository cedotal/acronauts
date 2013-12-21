// set up express

console.log(process.env.NODE_ENV);

var express = require('express');
var app = express();

// set up jade templating
app.set('views', __dirname + '/../templates');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);
app.get('/', function(req, res){
	res.render('page');
});

// special rule so that we can have the client recieve different config files
// based on the environment
// TODO: make this actually send dynamic data
app.use(function(req, res, next){
    if (req.url === '/js/config.js'){
        var response = 'define([], function(){ return { "host": "testhost" }});';
        res.send(response);
    } else {
        next();
    }
});

// set up static file server
app.use(express.static(__dirname + '/../public'));

var Lobby = require('./models/Lobby');

// set up socket.io listener and events
var port = 3700;

var io = require('socket.io').listen(app.listen(port), { log: true });

var lobby = new Lobby(io);