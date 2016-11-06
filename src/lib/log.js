import log from 'log4js';
import mkdirp from 'mkdirp'
import config from './../config'


mkdirp('logs');

var subscribers = config.has('subscribe') ? config.get('subscribe') : null;
var publishers = config.has('publish') ? config.get('publish') : null;

var appenders = [
    { type: 'console', category: 'ROOT' },
    { type: 'file', filename: 'logs/logger.log', "maxLogSize": 20480000, 'backups': 20, category: 'ROOT' },
    { type: 'console', category: 'PUBS-ROUTER' },
    { type: 'file', filename: 'logs/logger.log', "maxLogSize": 20480000, 'backups': 20, category: 'PUBS-ROUTER' }
];

if (subscribers) {
    for (const key of Object.keys(subscribers)) {
        appenders.push({
            type: 'console',
            category: `sub-${key}`
        })
        appenders.push({
            type: 'file',
            filename: 'logs/' + key + '.log',
            "maxLogSize": 20480000,
            'backups': 20,
            category: `sub-${key}`
        });
    }
}
if (publishers) {
    for (const key of Object.keys(publishers)) {
        appenders.push({
            type: 'console',
            category: `pub-${key}`
        })
        appenders.push({
            type: 'file',
            filename: 'logs/' + key + '.log',
            "maxLogSize": 20480000,
            'backups': 20,
            category: `pub-${key}`
        });
    };
}

log.configure({
    appenders: appenders
});

export default log.getLogger;