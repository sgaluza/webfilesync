var log = require('./lib/log')
    , config = require('./config')
    , Publisher = require('./lib/publisher')
    , Subscriber = require('./lib/subscriber')
    , _ = require('lodash');


var port = config.get('port');
var key = config.get('key');

var publishers = [];

_(config.get('publish')).forEach(function(p){
    publishers.push(new Publisher(p.name, p.path, port, key, log));
}).value();

process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    if (chunk != null) {
        if(chunk == 'db\n') {
            console.log('showing dbs:');
            _(publishers).forEach(function (p) {
                p.showDb();
            }).value();
        }
        else if(chunk == 'drop\n'){
            _(publishers).forEach(function (p) {
                p.dropDb();
            }).value();
        }
    }
});

var WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({ port: port });
console.log('started server on port: ' + port);
wss.on('connection', function(ws){
    var authorized = false;
    var source = null;
    ws.on('message', function(message){
        console.log('message: ' + message);
        message = JSON.parse(message);



        if(message.type == 'auth'){
            if(message.key == key){
                console.log('authorized client');
                authorized = true;
            }
            else{
                console.log('wrong key from client');
                ws.close('wrong key');
            }
        }
    })
});

_(config.get('subscribe')).forEach(function(s){
    console.log('subscribing to: ' + s.address);
    var WebSocket = require('ws');
    var ws = new WebSocket(s.address);
    ws.on('open', function(){
        console.log('opened connection');
        ws.send(JSON.stringify({
            type: 'auth',
            key: s.key
        }))
    })
}).value();