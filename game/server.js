/////////////////////////////
// Constants and Variables //
/////////////////////////////

// frameworks + middleware
const port = 8081;
const fqdn = "http://localhost:";
const uri = "/";
const url = fqdn + port + uri;
const express = require('express');
const app = express();
const http = require('http')
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// game constants + variables
var players = {};


//////////////////////
// Middleware Setup //
//////////////////////

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});


//////////////////////
// Socket.io Config //
//////////////////////

// on Socket.io connection
io.on('connection', function (socket) {
  console.log('a user connected');
  // create a new player and add it to our players object
  players[socket.id] = {
    isaacRot: 0,
    isaacX: Math.floor(Math.random() * 700) + 50,
    isaacY: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
  };
  // send the players object to the new player
  socket.emit('currentPlayers', players);
  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  /////////////////////////
  // Socket.io Functions //
  /////////////////////////

  /*
  Function: "disconnect"
  Run upon socket disconnect (i.e. player left game)
  */
  socket.on('disconnect', (function () {
    console.log('user disconnected');

    // remove this player from our players object
    delete players[socket.id];
    // disconnect the socket
    socket.disconnect(true)
  }));


  /*
  Function: "tryIsaacMovement"
  Run when a player tries to move their isaac
  */
  socket.on('tryIsaacMovement', function(movementData) {
    // TODO: add logic to make sure that if the player is
    //    slowed/rooted/stunned/etc they can't actually move

    players[socket.id].isaacX = movementData.x;
    players[socket.id].isaacY = movementData.y;
    players[socket.id].isaacRot = movementData.rotation;

    // send the move order to all players
    socket.broadcast.emit('setIsaacMovement', movementData)
  });

});


///////////////////
// Server listen //
///////////////////

server.listen(8081, function () {
  console.log(`Listening: ${url}`);
});
