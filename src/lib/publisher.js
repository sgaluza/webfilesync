var fs = require('fs')
    , path = require('path')
    , Datastore = require('./nedb-promises')
    , _ = require('lodash')
    , q = require('q')
    , chokidar = require('chokidar')
    , dbpath = 'db/pub/'
    , crypto = require('crypto');

var Publisher = function(name, rootPath, port, log){
    var self = this;
    this._name = name;
    this._path = rootPath;
    this._log = log;
    this._callbacks = [];
    this._init()
        .then(function(){
            chokidar.watch(self._path, {persistent: true}).on('all', function(e, p){
                var relativePath = path.relative(self._path, p);
                if(e == 'add'){
                    return self._addFile(relativePath);
                }
                return q();
            })
        });
}

Publisher.prototype._init = function(){
    var self = this;
    this._db = new Datastore({filename: dbpath + this._name, autoload: true});
    return this._db.qCount({})
        .then(function(count){
            self._revision = count;
            return q();
        });

}

Publisher.prototype._syncFolderWithDB = function(){
    var self = this;
    var promises = [];

    var checkFiles = function(p){
        var files = fs.readdirSync(path.normalize(self._path + '/' + p));
        _(files).forEach(function(f){
            var fullPath = path.normalize(self._path + '/' + p + '/' + f);
            var relativePath = path.normalize(p + '/' + f);
            var stats = fs.statSync(fullPath);

            if(stats.isDirectory()){
                checkFiles(relativePath);
            }
            else{
                promises.push(self._addFile(relativePath));
            }
        }).value();
    }
    checkFiles('')
    return q.all(promises);
}

Publisher.prototype._addFile = function(relativePath){
    relativePath = relativePath.replace(/\\/gi, '/');
    if(relativePath[0] !== '/') relativePath = '/' + relativePath;

    var self = this;
    return this._db.qFind({path: relativePath})
        .then(function(docs){
            if(docs.length === 0){
                console.log('Added file: ' + relativePath + '. current rev: ' + (++self._revision));
                var hash = crypto.createHash('sha256')
                    .update(relativePath)
                    .update(new Date().toString())
                    .digest("hex");
                var doc = {_id: self._revision, path: relativePath, op: 'add', date: new Date(), hash: hash};
                self._db.qInsert(doc)
                    .then(function(){
                        self.publish(doc);
                        return q();
                    })
            }
            return q();
        });
}


Publisher.prototype.showDb = function(){
    console.log(this._name + " Database content: ");
    this._db.qExec(this._db.find({}).sort({name: 1}))
        .then(function(files){
            _(files).forEach(function(f){
                console.log(f);
            }).value();
        })
}

Publisher.prototype.getDelta = function(startRevision){
    return this._db.qExec(this._db.find({_id: {$gt: startRevision}}).sort({_id: 1}));
}

Publisher.prototype.getRecordByHash = function(hash){
    return this._db.qExec(this._db.find({hash: hash}).sort({rev: -1}).limit(1));
}

Publisher.prototype.dropDb = function(){
    var self = this;
    console.log(this._name + " Drop Database");
    fs.unlinkSync(dbpath + this._name);
    this._init().then(function(){
        return self._syncFolderWithDB();
    });
}

Publisher.prototype.sub = function(cb){
    this._callbacks.push(cb);
}

Publisher.prototype.publish = function(doc){
    var self = this;
    _(this._callbacks).forEach(function(cb){
        cb(doc);
    }).value();
}

module.exports = Publisher;