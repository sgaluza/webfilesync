require('mkdirp')('logs');
var log = require('./lib/log')
    , config = require('./config')
    , Publisher = require('./lib/publisher')
    , Subscriber = require('./lib/subscriber')
    , _ = require('lodash')
    , send = require('send')
    , http = require('http')
    , util = require('util')
    , q = require('q');


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
                            var deferred = q.defer();
                            send(request, request.url, {root: pub.path})
                                .on('stream',function(){
                                    log.info('Sending started: ' + doc.path);
                                })
                                .on('error', function(error){
                                    log.error('Sending failed: ' + util.inspect(error));
                                    deferred.reject(error)
                                })
                                .on('end', function(){
                                    log.info('Sending completed: ' + doc.path);
                                    deferred.resolve();
                                })
                                .pipe(response);
                            return deferred.promise;
                        }
                    })
                    .catch(function(error){
                        log.error('Error during sending file: ' + util.inspect(error));
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
                    sources = message.sources;
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

            ws.pingssent = 0;

            var sendPing = function() {
                if (ws.pingssent >= 2)   // how many missed pings you will tolerate before assuming connection broken.
                {
                    log.error(skey + ' Ping/Pong failed:(. Reconnecting...');
                    ws.close();
                }
                else
                {
                    log.info(skey + ': ping...');
                    ws.ping();
                    ws.pingssent++;
                }
                setTimeout(sendPing, 60*1000);
            };

               //  75 seconds between pings

            ws.on("pong", function() {    // we received a pong from the client.
                log.info(skey + ': pong!');
                ws.pingssent = 0;    // reset ping counter.
            });

            ws.on('open', function () {
                log.info(skey + ' C: subscribing to: ' + s.address);
                s.sub.getRevision().then(function (rev) {

                    log.info(skey + ' send revision: ' + rev)
                    ws.send(JSON.stringify({
                        type: 'auth',
                        key: s.key,
                        sources: _.keys(s.folders),
                        rev: rev
                    }))
                })
                sendPing();
            });
            ws.on('error', function (err) {
                log.error(skey + ' error: ' + err + '. Connecting in 5 secs...')
                setTimeout(function(){initSub(s);}, 5000);

            });
            ws.on('close', function(){
                log.info(skey + ' closed! Connecting in 5 secs...');
                setTimeout(function(){initSub(s);}, 5000)
            })
            ws.on('message', function (message) {
                var m = JSON.parse(message);
                if (!Array.isArray(m))
                    m = [m];

                _(m).forEach(function (m) {
                    s.sub.update(m);
                }).value();

            });

        }

        initSub(s);
    });
}

