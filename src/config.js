var convict = require('convict');

var conf = convict({
    port: "8080",
    key: "change-to-your-key",
    publish:[
        {
            name: "source",
            path: "./lib"
        }
    ],
    subscribe: [{
        name: "main",
        address: "http://127.0.0.1:8080",
        key: "change-to-your-key",
        folders: [
            {
                name: "source",
                path: "../dest/"
            },
            {
                name: "source1",
                path: "../dest/"
            }
        ]
    }]
});

module.exports = conf;
