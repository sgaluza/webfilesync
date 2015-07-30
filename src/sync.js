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