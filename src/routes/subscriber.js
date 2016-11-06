import {Subscriber} from '../lib/subscriber';
import config from '../config';
import WebSocket from 'ws';
import getLogger from '../lib/log'

const confSub = config.get('subscribe');
const log = getLogger();

async function initSub(name){
  const subscriber = new Subscriber(name, confSub[name].address, confSub[name].folders);
    const ws = new WebSocket(s.address);

    ws.on('open', async () => {
      log[name].info(`C: subscribing to: ${subscriber.address}`);
      const rev = await subscriber.getRevision();
      log[name].info(`${name} sent revision: ${rev}`)
      ws.send(JSON.stringify({
        type: 'auth',
        key: s.key,
        folders: Object.keys(s.folders).map(async (f) => { return { folder: f, rev: await subscriber.getRevision(f) } })
      }))
    });

    ws.on('error', async (err) => {
      log[name].error(`error: ${err}. Connecting in 5 secs...`)
      setTimeout(async () => { await initSub(s); }, 5000);
    });
    ws.on('close',async  () => {
      log[name].info(`closed! Connecting in 5 secs...`);
      setTimeout(async () => { await initSub(s); }, 5000)
    });
    ws.on('message', (message) => {
      const m = JSON.parse(message);
      if (!Array.isArray(m))
        m = [m];

      for(const m of m){
        subscriber.update(m);
      }
    });
}

export default async () => {
  for (const name in confSub) {
    await initSub(name);
  }
}