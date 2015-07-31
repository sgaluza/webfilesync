var log = require('./lib/log')
    , config = require('./config')
    , Publisher = require('./lib/publisher')
    , Subscriber = require('./lib/subscriber')
    , _ = require('lodash')
    , static = require( 'node-static' )
    , http = require('http')
    , url = require('url');


var port = config.get('port');
var key = config.get('key');

var publishers = config.get('publish');

_.keys(publishers).forEach(function(p){
    publishers[p].pub = new Publisher(p, publishers[p].path, port, key, log);
    publishers[p].file = new static.Server( publishers[p].path, {
        cache: 3600,
        gzip: true
    } );
});

process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    if (chunk != null) {
        chunk = chunk.toString().replace(/\s+/gi, '');
        if(chunk == 'db') {
            console.log('showing dbs:');
            _.keys(publishers).forEach(function (p) {
                publishers[p].pub.showDb();
            });
        }
        else if(chunk == 'drop'){
            _.keys(publishers).forEach(function (p) {
                publishers[p].pub.dropDb();
            });
        }
    }
});



var staticServer = http.createServer(function(request, response){
    request.addListener('end', function(){
        var m = /^\/(\S+)\/(\S+)$/ig.exec(request.url);
        if(m){
            var pub = publishers[m[1]];
            if(pub){
                var hash = m[2];
                var filePath = pub.pub.getRecordByHash(hash)
                    .then(function(doc) {
                        if(doc.length == 1){
                            doc = doc[0]
                            request.url = doc.path;
                            pub.file.serve( request, response );
                        }
                    });
            }
        }
    }).resume();
}).listen(port, function(){

    var WebSocketServer = require('ws').Server
        , wss = new WebSocketServer({ server: staticServer });
    console.log('started server on port: ' + port);
    wss.on('connection', function(ws){
        var authorized = false;
        var sources = null;
        var pubs = null;
        ws.on('message', function(message){
            console.log('S: message: ' + message);
            message = JSON.parse(message);

            if(message.type == 'auth'){
                if(message.key == key){
                    console.log('S: authorized client');
                    authorized = true;
                    sources = message.sources;
                    pubs = _.keys(publishers).filter(function(p){
                        return _(sources).find(function(s){ return p == s.name });
                    }).forEach(function(p){
                        publishers[p].pub.sub(function(doc){
                            ws.send(JSON.stringify({
                                type: 'op',
                                doc: doc
                            }))
                        })
                    });
                }
                else{
                    console.log('S: wrong key from client');
                    ws.close('wrong key');
                }
            }
        })
    });

});

_(config.get('subscribe')).forEach(function(s){
    console.log('C: subscribing to: ' + s.address);
    var WebSocket = require('ws');
    var ws = new WebSocket(s.address);
    ws.on('open', function(){
        ws.send(JSON.stringify({
            type: 'auth',
            key: s.key,
            sources: _(s.folders).pluck('name').value(),
            rev: 0
        }))
    });
    ws.on('message', function(message){
        console.log('C: message: ' + message);
    })
}).value();

