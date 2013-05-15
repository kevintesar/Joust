var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");

var world;

var enemies = [];
var player;

var SCALE = 30;
var score = 0;

var keys = [];

var player_sprite = new Image();
    player_sprite.src = "images/player1.png";

var trash = [];

$(function() {
    init();
    requestAnimFrame(update);

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    // disable vertical scrolling from arrows :)
    document.onkeydown=function(){return event.keyCode!=38 && event.keyCode!=40}
})

function init() {
    world = new b2World(
        new b2Vec2(0, 10),    //gravity
        false                 //allow sleep
    );

    // var fixDef = new b2FixtureDef;
    // fixDef.density = 1.0;
    // fixDef.friction = 1;
    // fixDef.restitution = 0.2;

    var bodyDef = new b2BodyDef;

    createGround();
    createPlatforms();
    
    createPlayer();
    createEnemies();
    
    setUpDebug();
};

function update() {
    world.Step(
        1 / 60,   //frame-rate
        10,       //velocity iterations
        10        //position iterations
    );
    world.DrawDebugData();
    world.ClearForces();
    
    renderPlayer();
    handleInteractions();
    checkBoundries(player);
    makeEnemiesFly();
    detectCollisons();

    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    //ctx.fillStyle = "rgb(0, 0, 0)";
    //ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    requestAnimFrame(update);

    destroyObjects();

    updateScore();

    checkStatus();

};

// CREATE GROUND
// ======================================================
function createGround() { 
    var groundBody = new b2BodyDef;
    var groundFix = new b2FixtureDef;

    groundBody.type = b2Body.b2_staticBody;
    groundBody.position.x = canvas.width / 2 / SCALE;
    groundBody.position.y = canvas.height / SCALE;

    groundFix.shape = new b2PolygonShape;
    groundFix.shape.SetAsBox((canvas.width / SCALE) / 2, (10/SCALE) / 2);
    groundFix.userData = 'ground';

    world.CreateBody(groundBody).CreateFixture(groundFix);
}

// CREATE PLATFORMS
// ======================================================
function createPlatforms() {
    var platformBody = new b2BodyDef;
    var platformFix = new b2FixtureDef;
    
    platformBody.type = b2Body.b2_staticBody;

    for(var i = 0; i < 6; i++) {
        if(i % 2 === 0) {
            platformBody.position.x = 100 / SCALE;
        } else {
            platformBody.position.x = (canvas.width / SCALE) - (100 / SCALE);
        }
        platformBody.position.y = (i * 50 / SCALE) + 100 / SCALE;

        platformFix.shape = new b2PolygonShape;
        platformFix.shape.SetAsBox((150 / SCALE) / 2, (10/SCALE) / 2);
        platformFix.userData = 'platform';

        world.CreateBody(platformBody).CreateFixture(platformFix);
    }
}

// CREATE PLAYER
// ======================================================
function createPlayer() {
    var playerBody = new b2BodyDef;
    var playerFix = new b2FixtureDef;

    playerBody.type = b2Body.b2_dynamicBody;
    playerBody.position.x = canvas.width / 2 / SCALE;
    playerBody.position.y = (canvas.height / SCALE) - (20 / SCALE);
    playerBody.fixedRotation = true;

    playerFix.shape = new b2PolygonShape;
    playerFix.shape.SetAsBox(10 / SCALE, 15 / SCALE)
    playerFix.userData = 'player';
    playerFix.density = 1.0;
    playerFix.friction = 5;
    playerFix.restitution = .5;

    player = world.CreateBody(playerBody).CreateFixture(playerFix);
}


// CREATE ENEMIES
// ======================================================
function createEnemies() {
    for(var i = 0; i < 6; i++) {
        var enemyBody = new b2BodyDef;
        var enemyFix = new b2FixtureDef;

        enemyBody.type = b2Body.b2_dynamicBody;
        enemyBody.position.x = Math.random() * 25;
        enemyBody.position.y = Math.random() * 25
        
        enemyFix.shape = new b2PolygonShape;
        enemyFix.shape.SetAsBox(10 / SCALE, 10 / SCALE)
        enemyFix.userData = 'enemy' + i;

        enemy = world.CreateBody(enemyBody).CreateFixture(enemyFix);
        enemies.push(enemy)
    }
}

function handleKeyDown(evt){
    keys[evt.keyCode] = true;
}
function handleKeyUp(evt){
    keys[evt.keyCode] = false;
}

function handleInteractions(){
    var vel = player.m_body.GetLinearVelocity();

    // up arrow
    if (keys[38]){
        vel.y = -6;   
    }
    // left/right arrows
    if (keys[37]){
        vel.x = -5;
    }
    else if (keys[39]){
        vel.x = 5;
    }
}

function renderPlayer() {
    var player_pos = player.m_body.GetPosition();
    
    ctx.save();
    ctx.translate(player_pos.x * SCALE, player_pos.y * SCALE);
    ctx.rotate(player.m_body.GetAngle());
    ctx.drawImage(player_sprite, -10, -15);
    ctx.restore();
}

function detectCollisons() {
    var listener = new b2ContactListener;

    listener.BeginContact = function(contact) {
        // PLAYER AND GROUND / PLATFORM
        if(contact.m_fixtureA.m_userData === 'player' && contact.m_fixtureB.m_userData === 'ground' || 
            contact.m_fixtureA.m_userData === 'player' && contact.m_fixtureB.m_userData === 'platform') {
            console.log('walking')
        }

        // PLAYER AND ENEMY
        if(contact.m_fixtureA.m_userData === 'player' && contact.m_fixtureB.m_userData.slice(0, 5) === 'enemy') {
            trash.push(contact.m_fixtureB.m_body);
            killEnemy();
        } else if (contact.m_fixtureB.m_userData === 'player' && contact.m_fixtureA.m_userData.slice(0, 5) === 'enemy') {
            trash.push(contact.m_fixtureA.m_body);
            killEnemy();
        }

        //ENEMY AND PLATFORM
        if(contact.m_fixtureA.m_userData === 'platform' && contact.m_fixtureB.m_userData.slice(0, 5) === 'enemy' || 
        contact.m_fixtureB.m_userData === 'platform' && contact.m_fixtureA.m_userData.slice(0, 5) === 'enemy') {

            if (contact.m_fixtureA.m_userData.slice(0, 5) === 'enemy') {
                vel = contact.m_fixtureA.m_body.GetLinearVelocity();
                vel.x = vel.x * -1;

                console.log('hi')
            } else {
                vel = contact.m_fixtureB.m_body.GetLinearVelocity();
                vel.x = vel.x * -1;
                console.log('yo')
            }

        }
    }
    listener.EndContact = function(contact) {
        // PLAYER AND GROUND / PLATFORM
        if(contact.m_fixtureA.m_userData === 'player') {
            console.log('flying')
        }
    }

    listener.PostSolve = function(contact, impulse) {
        // console.log(contact + impulse)
    }

    listener.PreSolve = function(contact, oldManifold) {
        // PreSolve
    }

    this.world.SetContactListener(listener);    

}

function makeEnemiesFly() {
    for(var i = 0; i < enemies.length; i++) {
        var vel = enemies[i].m_body.GetLinearVelocity();
        vel.y = Math.random() * 0;
        vel.x = Math.random() * 5;

        checkBoundries(enemies[i])
    }
}

function checkBoundries(obj) {    
    if (obj.m_body.GetPosition().y > canvas.height / SCALE){
        obj.m_body.SetPosition(new b2Vec2(20,0),0)
        //KILL PLAYER
    }   
    else if (obj.m_body.GetPosition().x > canvas.width / SCALE) {
        obj.m_body.SetPosition(new b2Vec2(0, obj.m_body.GetPosition().y)); 
    }
    else if (obj.m_body.GetPosition().x < 0) {
        obj.m_body.SetPosition(new b2Vec2(canvas.width / SCALE, obj.m_body.GetPosition().y)); 
    }
}

function destroyObjects() {
    for(var i = 0; i < trash.length; i++) {
        world.DestroyBody(trash[i]);
    }
}


function checkStatus() {
    if (enemies.length === 0) {
        showWinScreen();
    }
}

function updateScore() {
    $('#score').html(score);
}

function showWinScreen() {
    console.log('YOu WON')
    resetGame()
}

function resetGame() {
    createEnemies();
}

function killEnemy(x) {
    console.log('hit enemy')
    enemies.pop();
    score +=1;
}

function setUpDebug() {
    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(document.getElementById("game").getContext("2d"));
    debugDraw.SetDrawScale(SCALE);
    debugDraw.SetFillAlpha(.3);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    world.SetDebugDraw(debugDraw);
}







