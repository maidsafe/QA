var Utils = function() {
  var fs = require('fs');

  this.deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file,index){
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
      result = data.toString().trim();

      if (!result & !allowEmpty) {
        // Ask again
        postQuestion(question, callback);
      } else {
        stdin.pause();
        console.log('\n');
        callback(result);
      }
    })
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

  return this;
};

exports = module.exports = Utils();