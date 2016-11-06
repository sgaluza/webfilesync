import Koa from 'koa';
import {router, initPublishers} from './routes/publisher';
import subscribe from './routes/subscriber';
import websokify from 'koa-websocket';
import config from './config'
import process from 'process';
import getLogger from './lib/log'
import convert from 'koa-convert';

const log = getLogger('ROOT');
const app = websokify(new Koa());

app.ws.use(router());
app.listen(config.get('port'), async () => {
    log.info('listening at port %d', config.get('port'));
    try {
        console.log('publishing...');
        await initPublishers();
    }
    catch (err) {
        log.error('PUBLISHERS INIT ERROR: ');
        log.error(err);
        process.exit();
    }
    try {
        console.log('subscribing...');
        await subscribe();
    }
    catch (err) {
        log.error('SUBSCRIBERS ERROR: ');
        log.error(err);
        process.exit();
    }


            

});

app.on('error', () => {
    log.error('APP ERROR:');
    log.error(err)
    process.exit();
});