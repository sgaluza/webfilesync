var fs = require('fs')
    , path = require('path')
    , Datastore = require('./nedb-promises')
    , _ = require('lodash')
    , q = require('q')
    , chokidar = require('chokidar')
    , util = require('util');

var Publisher = function(name, path, port, key, log){
    this._name = name;
    this._key = key;
    this._path = path;
    this._port = port;
    this._log = log;

    q.all(this._init());
}

Publisher.prototype._init = function(){
    var self = this;
    this._db = new Datastore({filename: 'db/'+this._name, autoload: true});
    this._db.qCount({})
        .then(function(count){
            self._revision = count;
            console.log('revision ' + count);
            return self._syncFolderWithDB();
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
                promises.push(self._db.qFind({path: relativePath})
                    .then(function(docs){
                        if(docs.length === 0){
                            return self._addFile(relativePath);
                        }
                        return q();
                    }));
            }
        }).value();
    }
    checkFiles('/')
    return q.all(promises);
}

Publisher.prototype._addFile = function(relativePath){
    console.log('Added file: ' + relativePath + '. current rev: ' + this._revision);
    return this._db.qInsert({_id: ++this._revision, path: relativePath, added: new Date()})
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

Publisher.prototype.dropDb = function(){
    var self = this;
    console.log(this._name + " Drop Database");
    fs.unlinkSync('db/' + this._name);
    this._init();
}

module.exports = Publisher;