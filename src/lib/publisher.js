var fs = require('fs')
    , log = require('./log')
    , path = require('path')
    , Datastore = require('./nedb-promises')
    , _ = require('lodash')
    , q = require('q')
    , chokidar = require('chokidar')
    , dbpath = 'db/pub/'
    , crypto = require('crypto');

export class Publisher {
    constructor(name, rootPath, key) {
        this._name = name;
        this._path = rootPath;
        this._callbacks = [];
        this._key = key;
    }

    async init(){
        this._db = new Datastore({ filename: dbpath + this._name, autoload: true });
        this._revision = await this._db.qCount({});
        chokidar.watch(this._path, { persistent: true })
            .on('all', async (e, p) => {
                const relativePath = path.relative(self._path, p);
                //log[name].info('File change spotted: ' + e + ' path:' + relativePath);
                if (e == 'add') {
                    await this._addFile(relativePath).done();
                }
            });
    }

    async _addFile (relativePath) {
        relativePath = relativePath.replace(/\\/gi, '/');
        if (relativePath[0] !== '/') relativePath = '/' + relativePath;

        const docs = await this._db.qFind({ path: relativePath })
        if (!docs.length) {
            //log[self._name].info('Added file: ' + relativePath + '. current rev: ' + (++self._revision));
            var hash = crypto.createHash('sha256')
                .update(relativePath)
                .update(new Date().toString())
                .digest("hex");

            var doc = { _id: self._revision, path: relativePath, op: 'add', date: new Date(), hash: hash };
            await this._db.qInsert(doc);
            await this.publish(doc);
        }
    }

    async _syncFolderWithDB() {
        var promises = [];

        var checkFiles = function (p) {
            var files = fs.readdirSync(path.normalize(self._path + '/' + p));
            _(files).forEach(function (f) {
                var fullPath = path.normalize(self._path + '/' + p + '/' + f);
                var relativePath = path.normalize(p + '/' + f);
                var stats = fs.statSync(fullPath);

                if (stats.isDirectory()) {
                    checkFiles(relativePath);
                }
                else {
                    promises.push(self._addFile(relativePath));
                }
            }).value();
        }
        checkFiles('')
        return q.all(promises);
    }

    async showDb() {
        name = this._name;
        //log[this.name].info("Database content: ");
        const files = await this._db.qExec(this._db.find({}).sort({ name: 1 }));
        for(const f of files){
            //log[name].info(f);
        }
    }

    async getDelta(startRevision) {
        return await this._db.qExec(this._db.find({ _id: { $gt: startRevision } }).sort({ _id: 1 }));
    }

    async getRecordByHash(hash) {
        return await this._db.qExec(this._db.find({ hash: hash }).sort({ rev: -1 }).limit(1));
    }

    async dropDb() {
        //log[this._name].info("Drop Database");
        fs.unlinkSync(dbpath + this._name);
        await this._init();
        await this._syncFolderWithDB();
    } 

    get name(){
        return this._name;
    }


    sub(cb) {
        this._callbacks.push(cb);
    }

    publish(doc) {
        for(const cb of this._callbacks){
            cb(doc);
        }
    }
}

