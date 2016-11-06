import route from 'koa-route';
import Publisher from '../lib/publisher';
import config from '../config';
import getLogger from '../lib/log'

const confPub = config.get('publish');
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

export function router() {
  return route
    .all('/', async function (next) {

      try {
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
              const delta = p.getDelta(message.folders[p.name].rev);
              this.websocket.send(JSON.stringify(delta));
              p.sub(doc => {

                console.log('published')
                
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