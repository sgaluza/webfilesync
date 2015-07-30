var q = require('q')
    , Datastore = require('nedb');

Datastore.prototype.qInsert = function(doc){
    var deferred = q.defer();
    this.insert(doc, function(err, newDoc){
        if(err){
            deferred.reject(err);
        }
        else{
            deferred.resolve();
        }
    })
    return deferred.promise;
}

Datastore.prototype.qFind = function(doc){
    var deferred = q.defer();
    this.find(doc, function(err, cursor){
        if(err){
            deferred.reject(err);
        }
        else{
            deferred.resolve(cursor);
        }
    })
    return deferred.promise;
}

Datastore.prototype.qCount = function(doc){
    var deferred = q.defer();
    this.count(doc, function(err, count){
        if(err){
            deferred.reject(err);
        }
        else{
            deferred.resolve(count);
        }
    })
    return deferred.promise;
}


Datastore.prototype.qExec = function(cursor){
    var deferred = q.defer();
    cursor.exec(function(err, cursor){
        if(err){
            deferred.reject(err);
        }
        else{
            deferred.resolve(cursor);
        }
    })
    return deferred.promise;
}

module.exports = Datastore;
