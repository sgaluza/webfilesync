import http from 'http'
import path from 'path'
import util from 'util'
import fs from 'fs'
import getLogger from './log'
import Datastore from './nedb-promises'

const dbpath = 'db/sub/';
const log = getLogger();

export class Subscriber{
    constructor (name, address, folders){
        this._name = name;
        for(const f of folders){
            f.path = f.path.replace(/\\/ig, '/');
        }
        this._folders = folders;
        this._updates = [];
        this._address = address;
        this._working = false;
        for(const f of folder){
            this._db[f] = new Datastore({filename: dbpath + this._name + `/${f}`, autoload: true});
        }
        
    }    

    update(doc){
        this._updates.push(doc);
        log[this._name].info(`update: ${util.inspect(doc)}`);
        this._checkUpdates();
    }

    _checkUpdates(){
        if(this._updates.length > 0 && !this._working) {
            this._working = true;
            const up = this._updates.shift();
            if (up.op == 'add') {
                const folder = this._folders[up.folder];
                log[this._name].info(up.folder, folder);
                if (folder) {
                    var fullPath = path.normalize(folder.path + '/' + up.path);
                    require('mkdirp').sync(path.dirname(fullPath));
                    log[this._name].info(`saving: ${fullPath}`);

                    var file = fs.createWriteStream(fullPath);
                    var url = this._address + '/' + up.folder + '/' + up.hash;
                    log[this._name].info(`url -> ${fullPath}`);

                    var errorOccured = false;

                    var request = http.get(url, (response) => {
                        response.pipe(file);
                        response.on('error', (err) => {
                            log[this._name].error(`response emitter error: ${err}`);
                            this._updates.unshift(up);
                            this._working = false;
                        })
                        response.on('end', async (err) => {
                            if(errorOccured && !err) err = errorOccured;
                            if(err){
                                log[this._name].error(`response error: ${err}`);
                                this._updates.unshift(up);
                                this._working = false;
                                return;
                            }
                            log[this._name].info(`Saved file: ${fullPath}`);
                            await this._db[up.folder].qInsert(up);
                            this._working = false;
                            this._checkUpdates();
                        })
                    }).on('error', (err) => {
                        errorOccured = err;
                        log[this._name].error(`http get error: ${err}`);
                        this._updates.unshift(up);
                        this._working = false;
                    });
                }
            }
        }
    }

    async getRevision(folder){
        const res = await this._db[folder].find({}).sort({_id: -1}).limit(1);
        return res.length > 0 ? res[0]._id : 0;
    }
} 