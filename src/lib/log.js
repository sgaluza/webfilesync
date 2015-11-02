var log = require('log4js');
var config = require('./config'), _ = require('lodash');
var subscribers = config.has('subscribe') ?  config.get('subscribe') : null;
var publishers = config.has('publish') ? config.get('publish') : null;

var appenders = [
    { type: 'console' },
    { type: 'file', filename: 'logs/logger.log', "maxLogSize": 20480000, 'backups': 20 }
];

if(subscribers)
    _.keys(subscribers).forEach(function(key){
        appenders.push({ type: 'file',
            filename: 'logs/' + key + '.log',
            "maxLogSize": 20480000,
            'backups': 20,
            category: key });
    });
if(publishers)
    _.keys(publishers).forEach(function (key) {
        appenders.push({ type: 'file',
            filename: 'logs/' + key + '.log',
            "maxLogSize": 20480000,
            'backups': 20,
            category: key });
    });


log.configure({
    appenders: appenders
});

var logger = log.getLogger();

if(subscribers)
    _.keys(subscribers).forEach(function(key){
        logger[key] = log.getLogger(key);
    });
if(publishers)
    _.keys(publishers).forEach(function(key){
        logger[key] = log.getLogger(key);
    });

module.exports = logger;