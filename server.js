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

// Refresh available status of users
setInterval(
	function(){
		var query = connection.query("UPDATE users SET available=0 WHERE DATE_ADD(lastConnection,INTERVAL 5 MINUTE)<NOW();", function(err, rows){
			if (err) {  
				console.log(err.message);
			}
		});
		console.log('Updated status available.');
	}, 50*1000);

app.post('/register', function(req, res) {
	var user  = req.body;
	user.available = 0;
	user.active = 0;
	if (user.type != 2) {
		user.matricule = 0;
	}

	var mailTest = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var cinTest = /^\d{8}?$/
	if (!mailTest.test(user.email)) {
		var resp = new Object();
		resp.status = 0;
		resp.message = 'Incorrect mail.';
		res.end(JSON.stringify(resp));
		return;
	}
	
	if (!cinTest.test(user.cin)) {
		var resp = new Object();
		resp.status = 0;
		resp.message = 'Incorrect C.I.N.';
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
			
			res.end(JSON.stringify(resp));
		} 
	});
});

app.post('/login', function(req, res) {
	var user  = req.body;
	var query = connection.query('SELECT *, COUNT(*) AS Colsum FROM users WHERE email=? and password=?', [user.email, user.password], function(err, rows){
		if (err) {  
			console.log(err.message);
		} else {
			var resp = new Object();
			var found = rows[0].Colsum != 0;
			delete rows[0].Colsum;
			delete rows[0].password;
			
			if (found == true) {
				if (rows[0].active == 0) {
					resp.status = 0;
					resp.color = 'red';
					resp.message = 'Your account is not active.';
				} else {
					resp.status = 1;
					resp.color = 'green';
					resp.user = rows[0];
					resp.message = 'Welcome.';
					
					// Update lastConnection
					connection.query("UPDATE users SET lastConnection=NOW(), available=1 WHERE id="  + rows[0].id + ";", function(err, rows){
						if (err) {  
							console.log(err.message);
						}
					});
					res.end(JSON.stringify(resp));					
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

app.post('/setOnline', function(req, res) {
	var user  = req.body;
	// Update lastConnection
	connection.query("UPDATE users SET lastConnection=NOW(), available=1 WHERE id="  + user.id + ";", function(err, rows){
		if (err) {  
			console.log(err.message);
		}
	});
});

app.post('/addCompaign', function(req, res) {
	var compaign  = req.body;
	compaign.active = 1;
	var query = connection.query('INSERT INTO compaigns SET ?', compaign, function(err,rows){
		if(err) 
			console.log(err.message);
		var resp = new Object();
		resp.status = 1;
		resp.message = 'Added successfully';
		res.end(JSON.stringify(resp));
	});
});

app.post('/joinCompaign', function(req, res) {
	var join  = req.body;
	var query = connection.query('INSERT INTO user_compaign SET ?', join, function(err,rows){
		if(err) 
			console.log(err.message);
		var resp = new Object();
		resp.status = 1;
		resp.message = 'User join successfully';
		res.end(JSON.stringify(resp));
	});
});

app.get('/getCompaigns', function(req, res) {
	var query = connection.query('SELECT * FROM compaigns WHERE active=1', function(err, rows){
		if (err) {  
			console.log(err.message);
		} else {
			var resp = new Object();
			resp = rows;	
			res.end(JSON.stringify(resp));
		} 
	});
});

app.post('/getCompaignsById', function(req, res) {
	var user_id  = req.body.user_id;
	var q = "SELECT *\
			 FROM compaigns\
			 INNER JOIN user_compaign\
			 ON compaigns.id=user_compaign.compaign_id\
			 WHERE active=1\
			 AND user_compaign.user_id = " + user_id + "\
			 AND compaigns.end > NOW();";
	
	var query = connection.query(q, function(err,rows){
		if(err) 
			console.log(err.message);
		var resp = new Object();
		resp = rows;
		res.end(JSON.stringify(resp));
	});
});

app.post('/editCompaign', function(req, res) {
	var compaign  = req.body;
	var query = connection.query('UPDATE compaigns SET ? WHERE id=?', [compaign, compaign.id], function(err,rows){
		if(err) 
			console.log(err.message);
		var resp = new Object();
		resp.status = 1;
		resp.message = 'Modification successful.';
		res.end(JSON.stringify(resp));
	});
});

app.post('/deleteCompaign', function(req, res) {
	var compaign  = req.body;
	var query = connection.query('UPDATE compaigns SET active=0 WHERE id=?', compaign.id, function(err,rows){
		if(err) 
			console.log(err.message);
		var resp = new Object();
		resp.status = 1;
		resp.message = 'Delete successfully';
		res.end(JSON.stringify(resp));
	});
});

app.post('/getUsers', function(req, res) {
	var user_id = req.body.user_id;
	var compaign_id  = req.body.compaign_id;
	var q = "SELECT *\
			 FROM users\
			 INNER JOIN user_compaign\
			 ON users.id=user_compaign.user_id\
			 WHERE compaign_id = " + compaign_id + ";";
	
	var query = connection.query(q, function(err, rows){
		if (err) {  
			console.log(err.message);
		} else {
			var resp = new Object();
			resp = rows;
			for (i in resp) {
				if (resp[i].id == user_id) {
					resp.splice(i, 1);
				}
			}
			res.end(JSON.stringify(resp));
		} 
	});
});

app.post('/getUsersById', function(req, res) {
	var user_id = req.body.user_id;
	var compaign_id  = req.body.compaign_id;
	var q = "SELECT *, user_join.room_id\
			 FROM users\
			 INNER JOIN user_join\
			 ON users.id=user_join.user2_id\
			 WHERE user_join.compaign_id = " + compaign_id + " AND\
				   user_join.user1_id = " + user_id + ";";
	
	var resp = new Object();
	var query = connection.query(q, function(err,rows){
		if(err) {
			resp.status = 0;
			resp.message = err.message;
			console.log(err.message);
		} else {
			resp = rows;
		}
		res.end(JSON.stringify(resp));
	});
});

app.post('/addUser', function(req, res) {
	var join  = req.body;	
	var query = connection.query('INSERT INTO user_join SET ?', join, function(err,rows){
		if(err) {
			console.log(err.message);
		} else {
			var a = join.user1_id;
			join.user1_id = join.user2_id;
			join.user2_id = a;
			connection.query('INSERT INTO user_join SET ?', join, function(err,rows){
				if(err) {
					console.log(err.message);
				} else {
					console.log(JSON.stringify(join));
					var resp = new Object();
					resp.status = 1;
					resp.message = 'User added successfully';
					res.end(JSON.stringify(resp));
				}
			});
		}
	});
});
