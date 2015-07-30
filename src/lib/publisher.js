var fs = require('fs')
    , path = require('path')
    , Datastore = require('nedb')
    , _ = require('lodash');

var Publisher = function(name, path, port, key, log){
    this._name = name;
    this._key = key;
    this._path = path;
    this._port = port;
    this._log = log;

    this._init();
}

Publisher.prototype._init = function(){
    var self = this;
    this._db = new Datastore({filename: 'db/'+this._name, autoload: true});
    this._db.count({}, function(err, count){
        self._revision = count;
    })
    this._syncFolderWithDB();

}

Publisher.prototype._syncFolderWithDB = function(){
    var self = this;
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
                self._db.find({path: relativePath}, function(err, docs){
                    if(docs.length === 0){
                        self._db.insert({_id: ++self._revision, path: relativePath, added: new Date()})
                    }
                });
            }
        }).value();
    }

    checkFiles('/');
}


Publisher.prototype.showDb = function(){
    console.log(this._name + " Database content: ");
    this._db.find({}).sort({name: 1}).exec(function(err, files){
        _(files).forEach(function(f){
            console.log(f);
        }).value();
    });
}

Publisher.prototype.dropDb = function(){
    var self = this;
    console.log(this._name + " Drop Database");
    fs.unlinkSync('db/' + this._name);
    this._init();
}

module.exports = Publisher;