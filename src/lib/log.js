var log = require('log4js');

log.configure({
    appenders: [
        { type: 'console' },
        { type: 'file', filename: 'logs/logger.log', "maxLogSize": 20480000, 'backups': 20 }
    ]
});

module.exports = log.getLogger();