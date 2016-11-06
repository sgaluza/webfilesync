import route from 'koa-route';
import Publisher from '../lib/publisher';
import config from '../config';
import getLogger from '../lib/log'

const confPub = config.get('publish');
const publishers = {};
const log = getLogger('PUBS-ROUTER');

if (confPub) {
  for (const name in confPub) {
    publishers[name] = new Publisher(name, confPub[name].path, confPub[name].key);
  }
}

export default () => {
  return route
    .all('/', function* (next) {
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
              this.websocket.send(JSON.stringify(await p.getDelta(message.folders[p.name].rev)));
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