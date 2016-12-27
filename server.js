// Load required modules
var http    = require("http");              // http server core module
var express = require("express");           // web framework external module
var serveStatic = require('serve-static');  // serve static files
var socketIo = require("socket.io");        // web socket external module
var easyrtc = require("./");               // EasyRTC external module
var bodyParser = require('body-parser');
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var mysql      = require('mysql');

var connection = mysql.createConnection({
  host     : '10.1.18.29',
  //host     : 'localhost',
  port     : '3306',
  user     : 'user2NQ',
  password : 'j5mRRh4FnrlTkxhi',
  database : 'sampledb'
});
connection.connect(function(err){
	if(!err) {
		console.log("Database is connected ...");    
	} else {
		console.log("Error connecting database ...");    
	}
});

// Set process name
process.title = "node-easyrtc";

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var app = express();
app.use(serveStatic('static', {'index': ['index.html']}));
app.use(bodyParser.json());

// Start Express http server on port 8080
var webServer = http.createServer(app).listen(server_port);

// Start Socket.io so it attaches itself to Express server
var socketServer = socketIo.listen(webServer, {"log level":1});

easyrtc.setOption("logLevel", "debug");

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", function(socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }

        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});

        console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
    console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, null, function(err, rtcRef) {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);

        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});

//listen on port 8080
webServer.listen(server_port, server_ip_address, function () {
    console.log('listening on ' + server_ip_address + ':' + server_port);
});

app.post('/register', function(req, res) {
	var user  = req.body;
	user.available = 1;
	user.active = 0;
	if (user.type != 2) {
		user.matricule = 0;
	}
	/* ============== */
	var mailTest = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var cinTest = /^\d{8}?$/
	if (!mailTest.test(user.email)) {
		var resp = new Object();
		resp.status = 0;
		resp.message = 'Incorrect mail.';
		console.log(JSON.stringify(resp));
		res.end(JSON.stringify(resp));
		return;
	}
	
	if (!cinTest.test(user.cin)) {
		var resp = new Object();
		resp.status = 0;
		resp.message = 'Incorrect CIN.';
		console.log(JSON.stringify(resp));
		res.end(JSON.stringify(resp));
		return;
	}
	
	var mailNotInUse = 0;
	
	
	var query = connection.query('SELECT COUNT(*) AS namesCount FROM users WHERE email=?', user.email, function(err, rows){
		if (err) {  
			console.log(err.message);
		} else {
			var resp = new Object();
			mailNotInUse = rows[0].namesCount == 0; 
			if (mailNotInUse == true) {
				query = connection.query('INSERT INTO users SET ?', user, function(err,res){
					if(err) 
						throw err;
				});
					
				resp.status = 1;
				resp.message = 'User added successfully.';
			} else {
				var resp = new Object();
				resp.status = 0;
				resp.message = 'Mail used.';
			}
			console.log(JSON.stringify(resp));
			res.end(JSON.stringify(resp));
		} 
	});
});

app.post('/login', function(req, res) {
	var user  = req.body;
	var query = connection.query('SELECT active, COUNT(*) AS Colsum FROM users WHERE email=? and password=?', [user.email, user.password], function(err, rows){
		if (err) {  
			console.log(err.message);
		} else {
			console.log(rows);
			var resp = new Object();
			var found = rows[0].Colsum != 0;

			if (found == true) {
				if (rows[0].active == 0) {
					var resp = new Object();
					resp.status = 0;
					resp.color = 'red';
					resp.message = 'Your account is not active.';
				} else {
					resp.status = 1;
					resp.color = 'green';
					resp.message = 'Welcome.';
				}
			} else {
				var resp = new Object();
				resp.status = 0;
				resp.color = 'red';
				resp.message = 'Incorrect creditential.';
			}
			res.end(JSON.stringify(resp));
		} 
	});
});

