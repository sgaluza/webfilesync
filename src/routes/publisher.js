import route from 'koa-route';
import path from 'path';
import Publisher from '../lib/publisher';
import config from '../config';
import getLogger from '../lib/log'
import fs from 'fs'

const confPub = config.has('publish') ? config.get('publish') : null;
const publishers = {};
const log = getLogger('PUBS-ROUTER');

export async function initPublishers() {
  if (confPub) {
    for (const name in confPub) {
      const pub = new Publisher(name, confPub[name].path, confPub[name].key);
      await pub.init();
      publishers[name] = pub;
    }
  }
};

export function filesRouter(){
  return route.get('/:folder/:hash',  function* (folder, hash){
    const pub = publishers[folder];
    const [file] = yield pub.getRecordByHash(hash);
    if(file){
      const fullPath = path.join(pub.path, file.path);
      if(fs.existsSync(fullPath)){
        this.body = fs.createReadStream(fullPath);
        return;
      }
      else
        yield pub.fileDeleted(hash);
    }
  })
}

export function wsRouter() {
  return route
    .all('/', async function (next) {

      try {
        this.websocket.on('error', (err) => {
          log.error('ERROR IN WS ROUTER:');
          log.error(err);
        });

        this.websocket.on('message', async (message) => {
          log.info(`message: ${message}`);
          message = JSON.parse(message);
          if (message.type == 'auth') {
            const authorizedPubs = Object.keys(publishers)
              // filter publishers by requested folders
              .filter(p => {
                return Object.keys(message.folders).indexOf(p) != -1;
              })
              .map(p => publishers[p])
              // filter publishers with correct keys provided in the message
              .filter(p => p.key == message.folders[p.name].key);
            for (const p of authorizedPubs) {
              const delta = await p.getDelta(message.folders[p.name].rev);
              this.websocket.send(JSON.stringify(delta));
              p.sub(doc => {
                doc.folder = p.name;
                this.websocket.send(JSON.stringify(doc))
              })
            }
          }
        })
      }
      catch (err) {
        log.error(err);
      }
    });
}