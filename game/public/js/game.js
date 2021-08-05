/////////////////
// Phaser Init //
/////////////////

var UIScene = new Phaser.Class({

Extends: Phaser.Scene,
initialize:
function UIScene ()
{
Phaser.Scene.call(this, { key: 'UIScene', active: true });
this.score = 0;
},

create: function ()
{
//  Our Text object to display the Score
var info = this.add.text(10, 10, 'Score: 0', { font: '48px Arial', fill: '#000000' });

//  Grab a reference to the Game Scene
var ourGame = this.scene.get('GameScene');

//  Listen for events from it
ourGame.events.on('addScore', function () {

this.score += 10;

info.setText('Score: ' + this.score);

}, this);
}

});

var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 },
      fps: 60
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};
var game = new Phaser.Game(config);


///////////////////
// Phaser Scenes //
///////////////////

function preload() {
  // pre-load images
  this.load.image('ship', './assets/spaceShips_001.png');
  this.load.image('otherPlayer', './assets/enemyBlack5.png');
  this.load.image('star', './assets/star_gold.png');
  this.load.image('isaacImg', './assets/isaac.png')
}

function create() {
  var self = this;

  ////////////////////
  // Game Variables //
  ////////////////////

  //  TODO: change this to server side and make the client GET it
  //    to prevent cheating

  this.isaac;
  this.target = new Phaser.Math.Vector2();

  // isaac data (speed, hp, etc...)
  this.isaacData = new Map();
  this.isaacData.speed = 200;
  this.isaacData.movementTolerance = this.isaacData.speed / 50;
  this.isaacData.hp = 100;
  this.isaacData.mana = 100;

  this.otherPlayers = [];


  //////////////////////
  // Phaser Variables //
  //////////////////////

  this.debug;
  this.cursors = this.input.keyboard.createCursorKeys();
  this.otherPlayers = this.physics.add.group();


  //////////////////////
  // Socket.io Config //
  //////////////////////
  this.socket = io();

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.socket.on('setIsaacMovement', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.isaacRot);
        otherPlayer.setPosition(playerInfo.isaacX, playerInfo.isaacY);
      }
    });
  });

  //////////////////////////////
  // Click to Move Code (1/2) //
  //////////////////////////////

  //isaac = this.physics.add.image(100, 300, 'isaacImg');
  this.debug = this.add.graphics();

  this.input.on('pointerdown', function (pointer) {
    this.target.x = pointer.x;
    this.target.y = pointer.y;

    // send the data to the server
    this.socket.emit('tryIsaacMovement',
    {
      sourceX: this.isaac.x,
      sourceY: this.isaac.y,
      destX: this.target.x,
      destY: this.target.y,
      rotation: this.isaac.rotation
    });

    this.physics.moveToObject(this.isaac, this.target, this.isaacData.speed);

    this.debug.clear().lineStyle(1, 0x00ff00);
    this.debug.lineBetween(0, this.target.y, 800, this.target.y);
    this.debug.lineBetween(this.target.x, 0, this.target.x, 600);
  }, this);
}

function update() {
  //////////////////////////////
  // Click to Move Code (2/2) //
  //////////////////////////////

  if (this.isaac)
  {
    var distance = Phaser.Math.Distance.Between(this.isaac.x, this.isaac.y, this.target.x, this.target.y);
    if (this.isaac.body.speed > 0)
    {
      //  distance tolerance, i.e. how close the source can get to the target
      //  before it is considered as being there. The faster it moves, the more tolerance is required.
      if (distance < this.isaacData.movementTolerance)
      {
        this.isaac.body.reset(this.target.x, this.target.y);
      }
    }

    // emit isaac movement
    var x = this.isaac.x;
    var y = this.isaac.y;
    var r = this.isaac.rotation;

    // if isaac has a new position...
    if (this.isaac.oldPosition && (x !== this.isaac.oldPosition.x || y !== this.isaac.oldPosition.y || r !== this.isaac.oldPosition.rotation))
    {

    }

  // save old position data
    this.isaac.oldPosition =
    {
      x: this.isaac.x,
      y: this.isaac.y,
      rotation: this.isaac.rotation
    };
  }
}


//////////////////////
// Custom Functions //
//////////////////////

/*
function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'isaacImg').setOrigin(0.5, 0.5);
  if (playerInfo.team === 'blue') {
    self.ship.setTint(0x0000ff);
  } else {
    self.ship.setTint(0xff0000);
  }
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
}
*/

function addPlayer(self, playerInfo)
{
  self.isaac = self.physics.add.image(playerInfo.isaacX, playerInfo.isaacY, 'isaacImg').setOrigin(0.5, 0.5);
}

function addOtherPlayers(self, playerInfo)
{
  const otherPlayer = self.add.sprite(playerInfo.isaacX, playerInfo.isaacY, 'isaacImg').setOrigin(0.5, 0.5);
  if (playerInfo.team === 'blue')
  {
    otherPlayer.setTint(0x0000ff);
  }
  else
  {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}
