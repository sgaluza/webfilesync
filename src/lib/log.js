import log from 'log4js';
import mkdirp from 'mkdirp'
import config from './../config'


mkdirp('logs');

var subscribers = config.has('subscribe') ? config.get('subscribe') : null;
var publishers = config.has('publish') ? config.get('publish') : null;

var appenders = [
    { type: 'dateFile', filename: 'logs/logger.log',  category: 'ROOT' },
    { type: 'dateFile', filename: 'logs/logger.log',  category: 'PUBS-ROUTER' }
];

if (subscribers) {
    for (const key of Object.keys(subscribers)) {
        appenders.push({
            type: 'dateFile',
            filename: `logs/sub-${key}.log`,
            "maxLogSize": 20480000,
            'backups': 20,
            category: `sub-${key}`
        });
    }
}
if (publishers) {
    for (const key of Object.keys(publishers)) {
        appenders.push({
            type: 'dateFile',
            filename: `logs/sub-${key}.log`,
            "maxLogSize": 20480000,
            'backups': 20,
            category: `pub-${key}`
        });
    };
}
appenders.push({ type: 'console' });


log.configure({
    appenders: appenders
});

export default log.getLogger;