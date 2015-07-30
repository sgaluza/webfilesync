var Subscriber = function(name, address, key, folderName, rootPath){
    this._name = name;
    this._address = address;
    this._key = key;
    this._folderName = folderName;
    this._path = rootPath;

}

Subscriber.prototype.gotFile = function(relativePath, size){

}

Subscriber.prototype.gotFileChunk = function(relativePath, offset, chunkBin){

}

module.exports = Subscriber;