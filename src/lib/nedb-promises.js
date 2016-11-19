import DatastoreNedb from 'nedb';

export default class Datastore extends DatastoreNedb {
    qInsert(doc) {
        return new Promise((res, rej) => {
            this.insert(doc, (err, newDoc) => {
                if (err)
                    return rej(err);
                res();
            })
        })
    }

    qUpdate(filter, update, options) {
        return new Promise((res, rej) => {
            this.update(filter, update, options, (err, newDoc) => {
                if (err)
                    return rej(err);
                res();
            })
        })
    }

    qFind(doc) {
        return new Promise((res, rej) => {
            this.find(doc, (err, cursor) => {
                if (err)
                    return rej(err);
                res(cursor);
            })
        });
    }

    qCount(doc) {
        return new Promise((res, rej) => {
            this.count(doc, (err, count) => {
                if (err)
                    rej(err);
                res(count);
            })
        });
    }
    qExec(cursor) {
        return new Promise((res, rej) => {
            cursor.exec((err, cursor) => {
                if (err)
                    rej(err);
                res(cursor);
            })
        })
    }
}

