var http = require('http')
    , fs = require('fs')
    , dbpath = 'db/sub/'
    , Datastore = require('./nedb-promises')
    , path = require('path')
    , _ = require('lodash')
    , util = require('util')
    , log = require('./log')
    ;

var Subscriber = function(name, address, folders){
    this._name = name;
    _(folders).forEach(function(f){
        f.path = f.path.replace(/\\/ig, '/');
    }).value();
    this._folders = folders;
    this._updates = [];
    this._address = address;
    this._working = false;
    this._db = new Datastore({filename: dbpath + this._name, autoload: true});

}

Subscriber.prototype.update = function(doc){
    this._updates.push(doc);
    log[this._name].info('update:' + util.inspect(doc));
    this._checkUpdates();
}

Subscriber.prototype._checkUpdates = function(){
    var self = this;
    if(this._updates.length > 0 && !this._working) {
        this._working = true;
        var up = this._updates.shift();
        if (up.op == 'add') {
            var folder = this._folders[up.source];
            log[self._name].info(up.source, folder);
            if (!_.isUndefined(folder)) {
                var fullPath = path.normalize(folder.path + '/' + up.path);
                require('mkdirp').sync(path.dirname(fullPath));
                log[self._name].info('saving: ' + fullPath);

                var file = fs.createWriteStream(fullPath);
                var url = this._address + '/' + up.source + '/' + up.hash;
                log[self._name].info(url, '->', fullPath);

                var errorOccured = false;

                var request = http.get(url, function(response){
                    response.pipe(file);
                    response.on('error', function(err){
                        log[self._name].error('response emitter error:' + err);
                        self._updates.unshift(up);
                        self._working = false;
                    })
                    response.on('end', function(err){
                        if(errorOccured && !err) err = errorOccured;
                        if(err){
                            log[self._name].error('response error: ' + err);
                            self._updates.unshift(up);
                            self._working = false;
                            return;
                        }
                        log[self._name].info('Saved file:' + fullPath);
                        self._db.qInsert(up).then(function(){
                            self._working = false;
                            self._checkUpdates();
                        })
                    })
                }).on('error', function(err){
                    errorOccured = err;
                    log[self._name].error('http get error:' + err);
                    self._updates.unshift(up);
                    self._working = false;
                });
            }
        }
    }
}

Subscriber.prototype.getRevision = function(){
    return this._db.qExec(this._db.find({}).sort({_id: -1}).limit(1))
        .then(function(res){
            return res.length > 0 ? res[0]._id : 0;
        })
}

module.exports = Subscriber;