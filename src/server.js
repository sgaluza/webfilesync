import Koa from 'koa';
import {routes as publisherRoutes} from './routes/publisher';
import websokify from 'koa-websocket'; 
const app = websokify(Koa());

app.use(publisherRoutes());

app.listen(config.get('port'), function () {
    console.log('listening at port %d', config.get('port'));
});