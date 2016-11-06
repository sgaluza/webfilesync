import { Subscriber } from '../lib/subscriber';
import config from '../config';
import WebSocket from 'ws';
import getLogger from '../lib/log'

const confSub = config.get('subscribe');

async function initSub(name) {
  const log = getLogger(`sub-${name}`);
  const subscriber = new Subscriber(name, confSub[name].address, confSub[name].folders);
  const ws = new WebSocket(subscriber.address);
  ws.on('open', async () => {
    try {
      log.info(`subscribing to: ${subscriber.address}`);
      const data = {
        type: 'auth',
        folders: {}
      }; 
      for(const f of Object.keys(subscriber.folders)){
        const rev = await subscriber.getRevision(f);
        data.folders[f] = {
          key: subscriber.folders[f].key,
          rev: rev
        };
      }
      log.info(data);
      ws.send(JSON.stringify(data));
    }
    catch (err) {
      log.error(`SUB WS ${name} OPEN error...`);
      log.error(err);
    }
  });

  ws.on('error', async (err) => {
    log.error(`SUB WS ${subscriber.name} error. Connecting in 5 secs...`)
    log.error(err);    
    setTimeout(async () => { await initSub(s); }, 5000);
  });
  ws.on('close', async () => {
    log.info(`SUB WS ${subscriber.name} closed! Connecting in 5 secs...`);
    log.error(err);
    setTimeout(async () => { await initSub(s); }, 5000)
  });
  ws.on('message', (message) => {
    let m = JSON.parse(message);
    if (!Array.isArray(m))
      m = [m];

    for (let mes of m) {
      subscriber.update(mes);
    }
  });

}

export default async () => {
  for (const name of Object.keys(confSub)) {
    await initSub(name);
  }
}