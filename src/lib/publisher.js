import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import chokidar from 'chokidar'

import Datastore from './nedb-promises'
import getLogger from './log'



const dbpath = 'db/pub/';

export default class Publisher {
    constructor(name, rootPath, key) {
        this._log = getLogger(`pub-${name}`);
        this._name = name;
        this._path = rootPath;
        this._callbacks = [];
        this._key = key;
    }

    async init() {
        this._db = new Datastore({ filename: dbpath + this._name, autoload: true });
        this._revision = await this._db.qCount({})

        chokidar.watch(this._path, { persistent: true }).on('all', async (e, p) => {
            var relativePath = path.relative(this._path, p);
            this._log.info('File change spotted: ' + e + ' path:' + relativePath);
            if (e == 'add') {
                await this._addFile(relativePath);
            }
        });
    }

    get key() {
        return this._key;
    }

    get path(){
        return this._path;
    }

    async _addFile(relativePath) {
        relativePath = relativePath.replace(/\\/gi, '/');
        if (relativePath[0] !== '/') relativePath = '/' + relativePath;

        const docs = await this._db.qFind({ path: relativePath })
        if (!docs.length) {
            this._log.info(`Added file: ${relativePath}. current rev: ${this._revision}`);
            this._revision++;

            var hash = crypto.createHash('sha256')
                .update(relativePath)
                .update(new Date().toString())
                .digest("hex");

            var doc = { _id: this._revision, path: relativePath, op: 'add', date: new Date(), hash: hash };
            await this._db.qInsert(doc);
            doc.folder = this._name;
            await this.publish(doc);
        }
    }

    async _syncFolderWithDB() {
        var promises = [];

        var checkFiles = function (p) {
            var files = fs.readdirSync(path.normalize(this._path + '/' + p));
            _(files).forEach(function (f) {
                var fullPath = path.normalize(this._path + '/' + p + '/' + f);
                var relativePath = path.normalize(p + '/' + f);
                var stats = fs.statSync(fullPath);

                if (stats.isDirectory()) {
                    checkFiles(relativePath);
                }
                else {
                    promises.push(this._addFile(relativePath));
                }
            }).value();
        }
        checkFiles('')
        return q.all(promises);
    }

    async showDb() {
        this._log.info("Database content: ");
        const files = await this._db.qExec(this._db.find({}).sort({ name: 1 }));
        for (const f of files) {
            this._log.info(f);
        }
    }

    async fileDeleted(hash){
        var doc = { _id: ++this._revision, op: 'del', date: new Date(), hash: hash };
        await this._db.qInsert(doc);
        await this._db.qUpdate({hash: hash}, {deleted: 1}, {multiple: true});
        doc.folder = this._name;
        await this.publish(doc);
    }

    async getDelta(startRevision) {
        const data = await this._db.qExec(this._db.find({ _id: { $gt: startRevision }, deleted: {$ne: 1} }).sort({ _id: 1 }));
        for(const d of data){
            d.folder = this._name;
        }
        return data;
    }

    async getRecordByHash(hash) {
        return await this._db.qExec(this._db.find({ hash: hash }).sort({ rev: -1 }).limit(1));
    }

    async dropDb() {
        this._log.info("Drop Database");
        fs.unlinkSync(dbpath + this._name);
        await this._init();
        await this._syncFolderWithDB();
    }

    get name() {
        return this._name;
    }


    sub(cb) {
        this._callbacks.push(cb);
    }

    publish(doc) {
        for (const cb of this._callbacks) {
            cb(doc);
        }
    }
}

