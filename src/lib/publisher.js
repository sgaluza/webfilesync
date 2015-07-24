var Publisher = function(name, path, port, key, log){
    this.name = name;
    this.key = key;
    this.path = path;
    this.port = port;
    this.log = log;
}

module.exports = Publisher;