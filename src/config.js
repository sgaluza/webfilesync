var convict = require('convict');

var conf = convict({
    port: "8080",
    key: "change-to-your-key",
    publish: {
        source: {path: "./lib"}
    },
    subscribe: {
        main: {
            address: "http://127.0.0.1:8080",
            key: "change-to-your-key",
            folders: {
                source: {path: "../dest/"},
                source1: {path: "../dest1/"}
            }
        }
    }
});

module.exports = conf;
