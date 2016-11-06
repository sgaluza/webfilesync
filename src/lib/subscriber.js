import http from 'http'
import path from 'path'
import util from 'util'
import fs from 'fs'
import getLogger from './log'
import Datastore from './nedb-promises'

const dbpath = 'db/sub/';

export class Subscriber {
    constructor(name, address, folders) {
        this._log = getLogger(`sub-${name}`);
        this._name = name;
        for (const f of Object.keys(folders)) {
            folders[f].path = folders[f].path.replace(/\\/ig, '/');
        }
        this._folders = folders;
        this._updates = [];
        this._address = address;
        this._working = false;
        this._db = {};
        for (const f of Object.keys(folders)) {
            this._db[f] = new Datastore({ filename: dbpath + this._name + `/${f}`, autoload: true });
        }

    }

    get name() {
        return this._name;
    }

    get url() {
        return this._url;
    }

    get folders() {
        return this._folders;
    }

    get address() {
        return this._address;
    }

    update(doc) {
        this._updates.push(doc);
        this._log.info(`update: ${util.inspect(doc)}`);
        this._checkUpdates();
    }

    _checkUpdates() {
        if (this._updates.length > 0 && !this._working) {
            this._working = true;
            const up = this._updates.shift();
            if (up.op == 'add') {
                const folder = this._folders[up.folder];
                if (folder) {
                    const fullPath = path.normalize(folder.path + '/' + up.path);
                    const url = this._address + '/' + up.folder + '/' + up.hash;
                    this._log.info(`SAVING: ${url} -> ${fullPath}`);

                    let errorOccured = false;

                    http.get(url, (response) => {
                        if (response.statusCode == 200) {
                            require('mkdirp').sync(path.dirname(fullPath));
                            var file = fs.createWriteStream(fullPath);
                            response.pipe(file);
                            response.on('error', (err) => {
                                this._log.error(`response emitter error: ${err}`);
                                this._updates.unshift(up);
                                this._working = false;
                            })
                            response.on('end', async (err) => {
                                if (errorOccured && !err) err = errorOccured;
                                if (err) {
                                    this._log.error(`response error: ${err}`);
                                    this._updates.unshift(up);
                                    this._working = false;
                                    return;
                                }
                                this._log.info(`Saved file: ${fullPath}`);
                                await this._db[up.folder].qInsert(up);
                                this._working = false;
                                this._checkUpdates();
                            })
                        }
                        else{
                            this._log.error(`Can't download file: ${url}. Status Code: ${response.statusCode}`);
                            this._working = false;
                            this._checkUpdates();
                        }
                    }).on('error', (err) => {
                        errorOccured = err;
                        this._log.error(`http get error: ${err}`);
                        this._updates.unshift(up);
                        this._working = false;
                    });
                }
            }
        }
    }

    async getRevision(folder) {
        const res = await this._db[folder].qExec(this._db[folder].find({}).sort({ _id: -1 }).limit(1));
        return res.length > 0 ? res[0]._id : 0;
    }
} 