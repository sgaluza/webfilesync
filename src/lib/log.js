import log from 'log4js';
import mkdirp from 'mkdirp'
import config from './../config'


mkdirp('logs');

var subscribers = config.has('subscribe') ? config.get('subscribe') : null;
var publishers = config.has('publish') ? config.get('publish') : null;

var appenders = [
    { type: 'console' },
    { type: 'file', filename: 'logs/logger.log', "maxLogSize": 20480000, 'backups': 20 }
];

if (subscribers) {
    for (const key of Object.keys(subscribers)) {
        appenders.push({
            type: 'file',
            filename: 'logs/' + key + '.log',
            "maxLogSize": 20480000,
            'backups': 20,
            category: key
        });
    }
}
if (publishers) {
    for (const key of Object.keys(publishers)) {
        appenders.push({
            type: 'file',
            filename: 'logs/' + key + '.log',
            "maxLogSize": 20480000,
            'backups': 20,
            category: key
        });
    };
}

log.configure({
    appenders: appenders
});

const logger = log.getLogger();

if (subscribers) {
    for (const key of Object.keys(subscribers)) {
        logger[key] = log.getLogger(key);
    }
}
if (publishers) {
    for (const key of Object.keys(publishers)) {
        logger[key] = log.getLogger(key);
    };
}

export default () => {
    return logger;
}