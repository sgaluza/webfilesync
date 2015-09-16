require('mkdirp')('logs');
var log = require('./lib/log')
    , config = require('./config')
    , Publisher = require('./lib/publisher')
    , Subscriber = require('./lib/subscriber')
    , _ = require('lodash')
    , send = require('send')
    , http = require('http');


process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    if (chunk != null) {
        chunk = chunk.toString().replace(/\s+/gi, '');
        if(chunk == 'db') {
            log.info('showing dbs:');
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



var port = config.has('port') ? config.get('port') : -1;
var key = config.has('key') ? config.get('key') : null;
var publishers = config.has('publish') ? config.get('publish') : null;

if(publishers) {
    _.keys(publishers).forEach(function (p) {
        publishers[p].pub = new Publisher(p, publishers[p].path, port, log);
    });

    var staticServer = http.createServer(function(request, response){
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
                            send(request, request.url, {root: pub.path}).pipe(response)
                        }
                    });
            }
        }
    }).listen(port, function(){

        var WebSocketServer = require('ws').Server
            , wss = new WebSocketServer({ server: staticServer });
        wss.on('connection', function(ws){
            log.info('started server on port: ' + port);
            var authorized = false;
            var sources = null;
            var pubs = null;
            ws.on('message', function(message){
                log.info('S: message: ' + message);
                message = JSON.parse(message);

                if(message.type == 'auth'){
                    if(message.key == key){
                        log.info('S: authorized client: ' + message.sources);
                        authorized = true;
                        pubs = _.keys(publishers).filter(function(p){
                            return _(message.sources).find(function(s){return p == s });
                        }).forEach(function(p){
                            publishers[p].pub.getDelta(message.rev).then(function(data){
                                _(data).forEach(function(d){
                                    d.source = p;
                                }).value();
                                ws.send(JSON.stringify(data));
                            })
                            publishers[p].pub.sub(function(doc){
                                doc.source = p;
                                ws.send(JSON.stringify(doc));
                            })
                        });
                    }
                    else{
                        log.info('S: wrong key from client');
                        ws.close('wrong key');
                    }
                }
            })
        });

    });
}



var subscribers = config.has('subscribe') ?  config.get('subscribe') : null;
if(subscribers){
    _.keys(subscribers).forEach(function(skey){
        var s = subscribers[skey];

        var initSub = function(s) {
            s.sub = new Subscriber(skey, s.address, s.folders);
            var WebSocket = require('ws');
            var ws = new WebSocket(s.address);
            ws.on('open', function () {
                log.info('C: subscribing to: ' + s.address);
                s.sub.getRevision().then(function (rev) {

                    log.info('send revision: ' + rev)
                    ws.send(JSON.stringify({
                        type: 'auth',
                        key: s.key,
                        sources: _.keys(s.folders),
                        rev: rev
                    }))
                })

            });
            ws.on('error', function (err) {
                log.error('error: ' + err + '. Connecting in 5 secs...')
                setTimeout(function(){initSub(s);}, 5000);

            });
            ws.on('close', function(){
                log.info('closed! Connecting in 5 secs...');
                setTimeout(function(){initSub(s);}, 5000)
            })
            ws.on('message', function (message) {
                var m = JSON.parse(message);
                if (!Array.isArray(m))
                    m = [m];

                _(m).forEach(function (m) {
                    s.sub.update(m);
                }).value();

            })
        }

        initSub(s);
    });
}

