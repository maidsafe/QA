exports = module.exports = function() {
  var async = require('async');
  var utils = require('./common/utils');
  var nodeUtil = require('util');
  var config = require('./config.json');
  var auth = require('./common/auth');
  var SshClient = require('ssh2').Client;
  var digitalOcean = require('./common/digitalocean').Api(auth.getDigitalOceanToken(), config.testMode);

  var selectedLibraryKey;
  var droplets = [];
  var nonChurnNodeBounds = {
    lowerBound: 0,
    upperBound: 0
  };
  var stageOptions = {
    NORMAL : "Regular Churn",
    MERGES : "Get to Network Size < 50% Nodes",
    SPLITS : "Get to Network Size == 100% Nodes"
  };
  var stages = [
    stageOptions.SPLITS,
    stageOptions.NORMAL,
    stageOptions.MERGES,
    stageOptions.NORMAL
  ];
  var churnFrequency = 0;
  var churnIntensity = 0;
  var grepIsNodeStarted = '(pgrep safe_vault || pgrep key_value_store)';
  var grepIsNodeConnected = grepIsNodeStarted + ' && grep \"Routing Table size:\" ~/Node.log';
  var nodesStartedCount = 0;
  var nodesStoppedCount = 0;

  var executeCommandOnDroplet = function(droplet, cmd, callback) {
    var Handler = function(sshOptions) {
      this.run = function(cb) {
        var conn = new SshClient();
        var errorMessage = 'SSH Execution Failed for: ' + sshOptions.host;
        conn.on('ready', function() {
          conn.exec(cmd, function(err, stream) {
            if (err) {
              return cb(errorMessage);
            }
            stream.on('close', function(code) {
              conn.end();
              return cb(code === 0 ? null : errorMessage);
            });
          });
        }).on('error', function() {
          return cb(errorMessage);
        }).connect(sshOptions);
      };
      return this.run;
    };
    var sshOptions = {
      host: droplet.networks.v4[0].ip_address,
      username: config.dropletUser,
      password: auth.getDropletUserPassword(),
      readyTimeout: 99999
    };
    new Handler(sshOptions, cmd)(function(err) {
      if (!err) {
        return callback(null);
      }
      return callback(err);
    });
  };

  var getDroplets = function(callback) {
    digitalOcean.getDropletList(function(err, list) {
      if (err) {
        callback(err);
        return;
      }
      var userName = auth.getUserName();
      var pattern = userName + '-' + selectedLibraryKey;
      for (var i in list) {
        if (list[i].name.indexOf(pattern) === 0) {
          droplets.push(list[i]);
        }
      }
      if (droplets.length === 0) {
        var msg = 'No droplets found for user %s for the selected library %s. Setup a network and try again';
        return callback(nodeUtil.format(msg, auth.getUserName(), selectedLibraryKey));
      }
      callback();
    });
  };

  var getNonChurnNodes = function(callback) {
    var invalidRange = function() {
      console.log('Enter a valid input');
      getNonChurnNodes();
    };
    var onUserInput = function(range) {
      if (!range) {
        return invalidRange();
      }
      range = range.split('-');
      if (range.length !== 2) {
        return invalidRange();
      }
      for (var i in range) {
        if (range[i]) {
          if (isNaN(range[i])) {
            return invalidRange();
          }
          range[i] = parseInt(range[i]);
          if (!(range[i] > 0 && range[i] <= droplets.length)) {
            return invalidRange();
          }
        }
      }
      nonChurnNodeBounds.lowerBound = range[0];
      nonChurnNodeBounds.upperBound = range[1];
      callback();
    };
    utils.postQuestion('Enter the non-churn nodes range between 1-' + droplets.length, onUserInput);
  };

  var getChurnFrequency = function(callback) {
    var onUserInput = function(frequency) {
      if (isNaN(frequency)) {
        console.log('Enter a valid number');
        return getChurnFrequency();
      }
      churnFrequency = frequency * 1000;
      callback();
    };
    utils.postQuestion('Enter the churn interval in seconds', onUserInput);
  };

  var getChurnIntensity = function(callback) {
    var onUserInput = function(intensity) {
      if (isNaN(intensity)) {
        console.log('Enter a valid number');
        return getChurnIntensity();
      }
      churnIntensity = intensity;
      callback();
    };
    utils.postQuestion('Enter the churn intensity', onUserInput);
  };

  var getRandomIndexes = function(maxIndex) {
    var indexes = [];
    while (indexes.length < churnIntensity) {
      var index = Math.floor(Math.random() * maxIndex);
      if(indexes.indexOf(index) > -1) {
        continue;
      }
      indexes[indexes.length] = index;
    }
    return indexes;
  };

  var IsNodeStateValid = function(droplet, isConnected) {
    this.run = function(callback) {
      executeCommandOnDroplet(droplet, isConnected ? grepIsNodeConnected : grepIsNodeStarted, function(err) {
        return callback(null, !err);
      });
    };
    return this.run;
  };

  var calculateNetworkState = function (droplets, isConnected, callback) {
    var tasks = [];
    for (var i in droplets) {
      if (droplets[i]) {
        tasks.push(new IsNodeStateValid(droplets[i], isConnected));
      }
    }

    async.parallelLimit(tasks, 20, function(err, res) {
      if (err) {
        throw err;
      }
      var count = 0;
      /*jshint forin: false */
      for (var i in res) {
        /*jshint forin: true */
        if (res[ i ]) {
          count++;
        }
      }
      return callback(count);
    });
  };

  var ToggleNode = function (droplet, stageOption) {
    var getNodeIndexFromName = function(name) {
      return name.split(/[- ]+/).pop();
    };

    var startNode = function(cb) {
      var cmd = 'tmux new-session -d \". ~/.bash_profile;teamocil settings\"';
      var nodeIndex = getNodeIndexFromName(droplet.name);
      executeCommandOnDroplet(droplet, cmd, function(err) {
        if (err) {
          console.log('Failed to start: Node %s - %s', nodeIndex, droplet.networks.v4[0].ip_address);
          throw err;
        }

        nodesStartedCount++;
        console.log('Started: Node %s ', nodeIndex);
        return cb(null);
      });
    };

    var stopNode = function(cb) {
      var cmd = config.tmuxKillAllSessions + '; mv ~/Node.log Node_`date +%Y_%m_%d_%H-%M-%S`.log || true' ;
      var nodeIndex = getNodeIndexFromName(droplet.name);
      executeCommandOnDroplet(droplet, cmd, function(killErr) {
        if (killErr) {
          console.log('Failed to stop: Node %s - %s', nodeIndex, droplet.networks.v4[0].ip_address);
          throw killErr;
        }

        nodesStoppedCount++;
        console.log('Stopped: Node %s', nodeIndex);
        return cb(null);
      });
    };

    this.run = function(callback) {
      executeCommandOnDroplet(droplet, grepIsNodeConnected, function (isNodeConnectedErr) {
        if (isNodeConnectedErr) {
          return executeCommandOnDroplet(droplet, grepIsNodeStarted, function (isNodeStartedErr) {
            if (isNodeStartedErr && stageOption != stageOptions.MERGES) {
              return startNode(callback);
            } else if (isNodeStartedErr) {
              console.log('Ignore - Node %s - already stopped', getNodeIndexFromName(droplet.name));
            } else if (stageOption == stageOptions.NORMAL) {
              console.log('Ignore - Node %s - waiting to connect', getNodeIndexFromName(droplet.name));
            } else if (stageOption == stageOptions.MERGES) {
              return stopNode(callback);
            }

            return callback(null);
          });
        } else if (stageOption != stageOptions.SPLITS) {
          return stopNode(callback);
        }

        return callback(null);
      });
    };
    return this.run;
  };

  var RunNormalChurn = function (dropletsToChurn, count) {
    this.run = function(callback) {
      console.log('Churn Iteration: %s', count);
      var indexes = getRandomIndexes(dropletsToChurn.length);
      var tasks = [];
      indexes.forEach(function (index) {
        tasks.push(new ToggleNode(dropletsToChurn[index], stageOptions.NORMAL));
      });

      async.parallelLimit(tasks, 20, function() {
        return setTimeout(callback, churnFrequency);
      });
    };
    return this.run;
  };

  var RunMergeChurn = function (dropletsToChurn, callback) {
    var indexes = getRandomIndexes(dropletsToChurn.length);
    var tasks = [];
    indexes.forEach(function (index) {
      tasks.push(new ToggleNode(dropletsToChurn[index], stageOptions.MERGES));
    });

    async.parallelLimit(tasks, 20, function() {
      return setTimeout(callback, churnFrequency);
    });
  };

  var RunStartAllNodes = function (dropletsToChurn, callback) {
    var tasks = [];
    dropletsToChurn.forEach(function (droplet) {
      tasks.push(new ToggleNode(droplet, stageOptions.SPLITS));
    });

    async.parallelLimit(tasks, 20, function() {
      return callback(null);
    });
  };

  var startChurning = function() {
    var currentStage = -1;
    var dropletsToChurn = droplets.slice(0, nonChurnNodeBounds.lowerBound - 1).concat(droplets.slice(nonChurnNodeBounds.upperBound));

    var nextStage = function() {
      if (currentStage != -1) {
        console.log('Stage Completed: %s\nTotal Churn Events: %s\t\tStarted: %s\tStopped: %s',
          stages[ currentStage ], nodesStartedCount + nodesStoppedCount, nodesStartedCount, nodesStoppedCount);
      }
      currentStage = (currentStage == stages.length - 1) ? 0 : currentStage + 1;
      console.log('\nStarting Stage: ' + stages[currentStage]);
    };

    var normalChurn = function(callback) {
      var steps = 20; // TODO user input maybe
      var tasks = [];
      for (var i = 0; i < steps; ++i) {
        tasks.push(new RunNormalChurn(dropletsToChurn, i + 1));
      }

      async.series(tasks, function() {
        callback(null);
      });
    };

    var churn = function() {
      if (stages[currentStage] == stageOptions.SPLITS) {
        return calculateNetworkState(droplets, true, function (connectedNodesCount) {
          console.log('Connected Nodes: %s', connectedNodesCount);
          if (connectedNodesCount == droplets.length) {
            nextStage();
            return setTimeout(churn, churnFrequency);
          }

          new RunStartAllNodes(droplets, function () {
            var splitCycleTimeout = 75;
            console.log('Waiting %s seconds...', splitCycleTimeout);
            return setTimeout(churn, splitCycleTimeout * 1000);
          });
        });
      }

      if (stages[currentStage] == stageOptions.MERGES) {
        return calculateNetworkState(droplets, false, function (startedNodesCount) {
          console.log('Running Nodes: %s', startedNodesCount);
          if (startedNodesCount < droplets.length / 2) {
            nextStage();
            return setTimeout(churn, churnFrequency);
          }

          new RunMergeChurn(dropletsToChurn, churn);
        });
      }

      // Normal Churn
      normalChurn(function() {
        nextStage();
        churn();
      });
    };

    // Startup condition
    if (currentStage == -1) {
      calculateNetworkState(droplets, true, function (connectedNodesCount) {
        console.log('Current Network Size: %s', connectedNodesCount);
        nextStage();
        churn();
      });
    }
  };

  var prepare = function(selectedOption) {
    var i = 0;
    /*jshint forin: false */
    for (var key in config.libraries) {
      /*jshint forin: true */
      i++;
      if (i === selectedOption) {
        selectedLibraryKey = key;
        break;
      }
    }
    var waterfallTasks = [];
    waterfallTasks.push(
      getDroplets,
      getNonChurnNodes,
      getChurnFrequency,
      getChurnIntensity
    );

    async.waterfall(waterfallTasks, function(err) {
      if (err) {
        return console.error(err);
      }
      startChurning();
    });
  };

  var onOptionSelected = function(option) {
    var keys = [];
    option = parseInt(option);
    var optionNotValid = function() {
      console.log('Invalid option selected');
      showOptions();
    };
    for (var key in config.libraries) {
      if (key) {
        keys.push(key);
      }
    }
    if (isNaN(option) || option < 0 || option > keys.length) {
      optionNotValid();
    } else {
      prepare(option);
    }
  };

  var showOptions = function() {
    var libOptions = '\n--------- \n';
    var i = 1;
    var isExample;
    for (var key in config.libraries) {
      if (config.libraries[key]) {
        isExample = config.libraries[key].hasOwnProperty('example');
        libOptions += (i + '. ' + key.replace(/-.*/g, '') + ' ' + (isExample ? 'Example' : 'Binary') +
        ' - ' + (isExample ? config.libraries[key].example : config.libraries[key].binary) + '\n');
        i++;
      }
    }

    utils.postQuestion('Please choose the entry for which the network will be churned: ' +
      libOptions, onOptionSelected);
  };

  showOptions();
};
