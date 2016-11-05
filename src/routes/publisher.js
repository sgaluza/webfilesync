import Router from 'koa-router';
import Publisher from '../lib/publisher';
import config from '../config';

const confPub = config.get('publish');
const publishers = {};
if(confPub){
  for(const name in confPub){
    publishers[name] = new Publisher(name, confPub[name].path, confPub[name].key);   
  }
}

const router = new Router();
router
  .get('/', async (ctx) => {

    ctx.websocket.on('message', async (message) => {
      log.info('S: message: ' + message);
      message = JSON.parse(message);
      if (message.type == 'auth') {
        const authorizedPubs = publishers.keys()
        // filter publishers by requested folders
          .filter(p => {
            return message.folders.keys().indexOf(p) != -1;
          })
          .map(p => publishers[p])
        // filter publishers with correct keys provided in the message
          .filter(p => p.key == message.folders[p.name].key);

        for(const p of authorizedPubs){

          ctx.websocket.send(JSON.stringify(await p.getDelta(message.folders[p.name].rev)));
          p.sub(doc => {
            doc.folder = p.name;
            ctx.websocket.send(JSON.stringify(doc))
          })
        }
      }
    })
  });
