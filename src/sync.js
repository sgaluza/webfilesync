require('mkdirp')('logs');
const log = require('./lib/log')
    , config = require('./config')
    , Publisher = require('./lib/publisher')
    , Subscriber = require('./lib/subscriber')
    , send = require('send')
    , http = require('http')
    , util = require('util');


process.stdin.on('readable', function() {
    const chunk = process.stdin.read();
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



const port = config.has('port') ? config.get('port') : -1;
const key = config.has('key') ? config.get('key') : null;
const publishers = config.has('publish') ? config.get('publish') : null;

if(publishers) {
    for(const pk in publishers){
        const p = publishers[pk];
        p.pub = new Publisher(pk, p.path, port, log); 
    }

    const staticServer = http.createServer(function(request, response){
        const m = /^\/(\S+)\/(\S+)$/ig.exec(request.url);
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
    })}



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
                    log[skey].error('Ping/Pong failed:(. Reconnecting...');
                    ws.close();
                }
                else
                {
                    //log.info(skey + ': ping...');
                    ws.ping(null, null, true);
                    ws.pingssent++;
                    setTimeout(sendPing, 60*1000);
                }
            };

               //  75 seconds between pings

            ws.on("pong", function() {    // we received a pong from the client.
                //log.info(skey + ': pong!');
                ws.pingssent = 0;    // reset ping counter.
            });

            ws.on('open', function () {
                log[skey].info('C: subscribing to: ' + s.address);
                s.sub.getRevision().then(function (rev) {

                    log[skey].info(skey + ' send revision: ' + rev)
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
                log[skey].error('error: ' + err + '. Connecting in 5 secs...')
                setTimeout(function(){initSub(s);}, 5000);

            });
            ws.on('close', function(){
                log[skey].info('closed! Connecting in 5 secs...');
                setTimeout(function(){initSub(s);}, 5000)
            });
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

