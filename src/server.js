import Koa from 'koa';
import {filesRouter, wsRouter, initPublishers} from './routes/publisher';
import subscribe from './routes/subscriber';
import websokify from 'koa-websocket';
import config from './config'
import process from 'process';
import getLogger from './lib/log'
import convert from 'koa-convert';

const log = getLogger('ROOT');
const app = websokify(new Koa());

app.ws.use(wsRouter());

app.use(convert(filesRouter()));

app.listen(config.get('port'), async () => {
    log.info('listening at port %d', config.get('port'));
    try {
        await initPublishers();
    }
    catch (err) {
        log.error('PUBLISHERS INIT ERROR: ');
        log.error(err);
        process.exit();
    }
    subscribe();
});

app.on('error', (err) => {
    log.error('APP ERROR:');
    log.error(err)
    //process.exit();
});