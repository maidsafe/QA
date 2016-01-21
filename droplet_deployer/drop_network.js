exports = module.exports = function() {
  var config = require('./config.json');
  var util = require('./common/utils');
  var auth = require('./common/auth');
  var digitalOcean = require('./common/digitalocean').Api(auth.getDigitalOceanToken(), config.testMode);
  var async = require('async');
  var libraryKey;
  var droplets = [];

  var getDropletList = function(callback) {
    digitalOcean.getDropletList(function(err, list) {
      if (err) {
        callback(err);
        return;
      }
      var pattern = auth.getUserName() + '-' + libraryKey;
      for (var i in list) {
        if (list[i].name.indexOf(pattern) === 0) {
          droplets.push(list[i]);
        }
      }
      console.log('Deleting ' + droplets.length + ' droplets...');
      callback(null);
    });
  };

  var deleteDroplets = function(callback) {
    var requests = [];
    var Executor = function(id) {
      this.run = function(cb) {
        digitalOcean.deleteDroplet(id, cb);
      };
      return this.run;
    };

    if (droplets.length === 0) {
      callback('No droplets found');
      return;
    }

    for (var i in droplets) {
      if (droplets[i]) {
        requests.push(new Executor(droplets[i].id));
      }
    }

    async.series(requests, function(err) {
      return err ? callback('Failed to delete some droplet(s)') : callback(null);
    });
  };

  var dropNetwork = function() {
    async.waterfall([
      getDropletList,
      deleteDroplets
    ], function(err) {
      console.log(err ? err : 'Dropped Network - All droplets will be destroyed in few minutes');
    });
  };

  var onLibrarySelected = function(index) {
    index = parseInt(index);
    var keys = [];
    for (var key in config.libraries) {
      if (key) {
        keys.push(key);
      }
    }
    if (isNaN(index) || index < 1 || index > keys.length) {
      console.log('Invalid option');
      showMainMenu();
      return;
    }
    libraryKey = keys[index - 1];
    dropNetwork();
  };

  var showMainMenu = function() {
    var libOptions = '\n--------- \n';
    var i = 1;
    var isExample;
    for (var key in config.libraries) {
      if (config.libraries[key]) {
        isExample = config.libraries[key].hasOwnProperty('example');
        libOptions +=  (i + '. ' + key.replace(/-.*/g, '') + ' ' + (isExample ? 'Example' : 'Binary') +
        ' - ' + (isExample ? config.libraries[key].example : config.libraries[key].binary) + '\n');
        i++;
      }
    }
    util.postQuestion('Select the library to drop the network for:' + libOptions, onLibrarySelected);
  };

  showMainMenu();
};
