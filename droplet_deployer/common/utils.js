var Utils = function() {
  var fs = require('fs');
  var path = require('path');

  this.deleteFolderRecursive = function(path) {
    if(fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index){
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  };

  this.postQuestion = function (question, callback, allowEmpty) {
    var stdin = process.stdin;
    var stdout = process.stdout;

    stdin.resume();
    stdout.write(question + '\n> ');

    stdin.once('data', function(data) {
      var result = data.toString().trim();

      if (!result && !allowEmpty) {
        // Ask again
        postQuestion(question, callback);
      } else {
        stdin.pause();
        console.log('\n');
        callback(result);
      }
    });
  };

  this.getArguments = function() {
    var options = {};
    var temp;
    process.argv.forEach(function (val) {
      if(val.indexOf('--') === 0) {
        temp = val.split('=');
        options[temp[0].replace(/--/, '')] = temp[1] || '';
      }
    });
    return options;
  };

  this.getValidPath = function(message, callback) {
    var stdin = process.stdin;
    var stdout = process.stdout;

    stdin.resume();
    stdout.write(message + '\n> ');

    stdin.once('data', function(data) {
      var result = path.resolve(data.toString().trim());
      if (fs.existsSync(result) && fs.lstatSync(result).isDirectory()) {
        stdin.pause();
        console.log('\n');
        return callback(result);
      } else {
        stdout.write('Invalid Path\n\n');
        getValidPath(message, callback);
      }
    });
  };

  return this;
};

exports = module.exports = Utils();