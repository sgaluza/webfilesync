var Datastore = require('nedb');

Datastore.prototype.qInsert = (doc) => {
    return new Promise((res, rej) => {
        this.insert(doc, function (err, newDoc) {
            if (err)
                return rej(err);
            res();
        })
    })
}

Datastore.prototype.qFind = (doc) => {
    return new Promise((res, rej) => {
        this.find(doc, function (err, cursor) {
            if (err)
                return rej(err);
            res(cursor);
        })
    });
}

Datastore.prototype.qCount = (doc) => {
    return new Promise((res, rej) => {
        this.count(doc, function (err, count) {
            if (err)
                rej(err);
            res(count);
        })
    });
}


Datastore.prototype.qExec = function (cursor) {
    return new Promise((res, rej) => {
        cursor.exec(function (err, cursor) {
            if (err)
                rej(err);
            res(cursor);
        })
    })
}

module.exports = Datastore;
