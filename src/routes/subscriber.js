import Subscriber from '../lib/subscriber';
import config from '../config';
import WebSocket from ws;

const confSub = config.get('subscribe');

async function initSub(name){
  const subscriber = new Subscriber(name, confPub[name].address, confPub[name].folders);
    const ws = new WebSocket(s.address);

    ws.on('open', function () {
      // log[skey].info('C: subscribing to: ' + s.address);
      const rev = await subscriber.getRevision();
      // log[skey].info(skey + ' send revision: ' + rev)
      ws.send(JSON.stringify({
        type: 'auth',
        key: s.key,
        folders: s.folders.keys().map(f => { return { folder: f, rev: await subscriber.getRevision(f) } })
      }))
    });

    ws.on('error', (err) => {
      //log[skey].error('error: ' + err + '. Connecting in 5 secs...')
      setTimeout(function () { await initSub(s); }, 5000);
    });
    ws.on('close', () => {
      //log[skey].info('closed! Connecting in 5 secs...');
      setTimeout(() => { await initSub(s); }, 5000)
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