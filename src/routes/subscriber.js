import { Subscriber } from '../lib/subscriber';
import config from '../config';
import WebSocket from 'ws';
import getLogger from '../lib/log'

const confSub = config.has('subscribe') ? config.get('subscribe') : null;

async function initSub(name) {
  const log = getLogger(`sub-${name}`);
  let errorState = false;
  try {
    const subscriber = new Subscriber(name, confSub[name].address, confSub[name].folders);
    const ws = new WebSocket(subscriber.address);

    ws.on('unexpected-response', function (err) {
      console.log('UNEXPECTED RESPONSE');
    });

    ws.on('open', async () => {
      try {
        log.info(`subscribing to: ${subscriber.address}`);
        const data = {
          type: 'auth',
          folders: {}
        };
        for (const f of Object.keys(subscriber.folders)) {
          const rev = await subscriber.getRevision(f);
          data.folders[f] = {
            key: subscriber.folders[f].key,
            rev: rev
          };
        }
        log.info(data);
        ws.send(JSON.stringify(data));
        function ping(){
          if(!errorState){
            ws.ping();
            setTimeout(ping, 10000);
          }
        };
        ping();

      }
      catch (err) {
        log.error(`SUB WS ${name} OPEN error...`);
        log.error(err);
      }
    });

    ws.on('error', (err) => {
      log.error(`SUB WS ${subscriber.name} error. Connecting in 5 secs...`)
      log.error(err);
      if (!errorState)
        setTimeout(() => { initSub(subscriber.name); }, 5000);
      errorState = true;
    });

    ws.on('close', () => {
      log.info(`SUB WS ${subscriber.name} closed! Connecting in 5 secs...`);
      if (!errorState)
        setTimeout(() => { initSub(subscriber.name); }, 5000)
      errorState = true;
    });

    ws.on('message', (message) => {
      try {
        let m = JSON.parse(message);
        if (!Array.isArray(m))
          m = [m];

        for (let mes of m) {
          subscriber.update(mes);
        }
      }
      catch (err) {
        log.error(`SUB WS ${name} message error...`);
        log.error(err);
      }
    });

  }
  catch (err) {
    log.error(`SUB WS ${name} subscribing error...`);
    log.error(err);
  }

}

export default () => {
  if (confSub) {
    for (const name of Object.keys(confSub)) {
      initSub(name);
    }
  }
}