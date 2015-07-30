var Subscriber = function(name, address, key, folderName, rootPath){
    this._name = name;
    this._address = address;
    this._key = key;
    this._folderName = folderName;
    this._path = rootPath;

}

module.exports = Subscriber;