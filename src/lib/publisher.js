import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

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

    async getDelta(startRevision) {
        return await this._db.qExec(this._db.find({ _id: { $gt: startRevision } }).sort({ _id: 1 }));
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

