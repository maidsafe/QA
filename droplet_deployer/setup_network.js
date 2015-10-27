exports = module.exports = function(args) {
  var fs = require('fs');
  var os = require('os');
  var fse = require('fs-extra');
  var scpClient = require('scp2');
  var async = require('async');
  var exec = require('child_process').exec;
  var utils = require('./common/utils');
  var config = require('./config.json');
  var auth = require('./common/auth');
  var SSH = require('simple-ssh');
  var digitalOcean = require('./common/digitalocean').Api(auth.getDigitalOceanToken(), config.testMode);

  var ADVANCED_ARG = 'advanced';
  var TMUX_CMDS_KEY = 'tmuxCommands';

  var selectedLibraryKey;
  var selectedLibraryRepoName;
  var libraryConfig;
  var binaryPath;
  var binaryName;
  var buildPath;
  var networkSize;
  var seedNodeSize;
  var dropletRegions;
  var createdDroplets;
  var connectionType;
  var beaconPort;
  var listeningPort;

  var BINARY_EXT = {
    'windows_nt': '.exe',
    'linux': ''
  }[os.type().toLowerCase()];

  var clone = function(callback) {
    console.log('Cloning Repository - ' + selectedLibraryRepoName);
    exec('git clone ' + libraryConfig.url + ' ' +
          buildPath + ' --depth 1', function(err) {
      callback(err);
    });
  };

  var build = function(callback) {
    var buildCommand = 'cargo build';
    if (libraryConfig.hasOwnProperty('example')) {
      buildCommand += ' --example ' + libraryConfig['example'];
    }
    buildCommand += ' --release';
    console.log('Building Repository - ' + selectedLibraryRepoName);
    exec('cd ' + buildPath + ' && ' + buildCommand, function(err) {
      callback(err);
    });
  };

  var stripBinary = function(callback) {
    exec('strip -s ' + binaryPath + binaryName, function(err) {
      callback(err);
    });
  };

  var getNetworkSize = function(callback) {
    utils.postQuestion('Please enter the size of the network between ' +
      config.minNetworkSize + '-' + config.maxNetworkSize, function(size) {
      size = parseInt(size);
      if(isNaN(size) || size < config.minNetworkSize || size > config.maxNetworkSize) {
        console.log('Invalid input');
        getNetworkSize(callback);
      } else {
        networkSize = size;
        callback(null);
      }
    });
  };

  var getSeedNodeSize = function(callback) {
    utils.postQuestion('Please enter the size of the seed nodes between ' +
      config.minSeedNodeSize + '-' + config.maxSeedNodeSize, function(size) {
      size = parseInt(size);
      if(isNaN(size) || size < config.minSeedNodeSize || size > config.maxSeedNodeSize) {
        console.log('Invalid input');
        getSeedNodeSize(callback);
      } else {
        seedNodeSize = size;
        callback(null);
      }
    });
  };

  var getNetworkType = function(callback) {
    //utils.postQuestion('Please select the type of network \n1. Spread \n2. Concentrated', function(type) {
    //  type = parseInt(type);
    //  if(isNaN(type) || type < 0 || type > 2) {
    //    console.log('Invalid input');
    //    getNetworkType(callback);
    //  } else {
    //    callback(null, type === 1);
    //  }
    //});
    // TODO Passing hard coded false for indicating concentrated network - to be enhanced
    callback(null, false);
  };

  var getDropletRegions = function(callback) {
    digitalOcean.getAvaliableRegions(config.dropletSize, function(err, availableRegions) {
      if (err) {
        callback(err);
        return;
      }
      dropletRegions = availableRegions;
      callback(null);
    });
  };

  var validateUniqueNetwork = function(callback) {
    digitalOcean.getDropletList(function(err, list) {
      if (err) {
        callback(err);
        return;
      }
      var userName = auth.getUserName();
      var pattern = userName + '-' + selectedLibraryKey;
      for (var i in list) {
        if (list[i].name.indexOf(pattern) === 0) {
          callback('User: ' + userName + ' has an existing network for ' + selectedLibraryKey +
                   '.\nPlease clear existing network with the Drop Network option.\n\n');
          return;
        }
      }
      callback(null);
    });
  };

  var selectDropletRegion = function(spreadNetwork, callback) {
    if (config.hasOwnProperty('imageRegion') && config.imageRegion) {
      callback(null, [config.imageRegion]);
    } else {
      callback("imageRegion not specified in config");
    }
    // TODO - To be enhanced
    /*if (spreadNetwork) {
      callback(null, dropletRegions);
      return;
    }
    var question = 'Please select a region';
    for (var i in dropletRegions) {
      question += ('\n' + (parseInt(i)+1) + ' ' + dropletRegions[i]);
    }
    utils.postQuestion(question, function(value) {
      var index = parseInt(value);
      if (isNaN(index) || index < 1 || index > dropletRegions.length) {
        selectDropletRegion(spreadNetwork, callback);
      } else {
        callback(null, [dropletRegions[index - 1]]);
      }
    });*/
  };

  var createDroplets = function(selectedRegions, callback) {
    var name;
    var region;
    var TempFunc = function(name, region, size, image, keys) {
      this.run = function(cb) {
		console.log("Creating droplet -", name);  
        digitalOcean.createDroplet(name, region, size, image, keys, cb);
      };
      return this.run;
    };
    var requests = [];
    console.log("Creating droplets...");
    for (var i = 0; i < networkSize; i++) {
      region = selectedRegions[i % selectedRegions.length];
      name = auth.getUserName() + '-' + selectedLibraryKey + '-TN-' + region + '-' + (i+1);
      requests.push(new TempFunc(name, region, config.dropletSize, config.imageId, config.sshKeys));
    }
    async.series(requests, callback);
  };

  var isAllDropletsActive = function(list) {
    var initialised;
    for (var i in list) {
      initialised = list[i].status === 'active';
      if (!initialised) {
        break;
      }
    }
    return initialised;
  };

  var getDroplets = function(idList, callback) {
    var TempFunc = function(id) {
      this.run = function(cb) {
        digitalOcean.getDroplet(id, cb);
      };
      return this.run;
    };

    var getDropletInfo = function() {
      var requests = [];
      for (var i in idList) {
        requests.push(new TempFunc(idList[i]));
      }
      async.series(requests, function(err, droplets) {
        if (err) {
          callback(err);
          return;
        }
        createdDroplets = droplets;
        if (createdDroplets.length === 0) {
          callback('Droplets could not be created');
        } else if (!isAllDropletsActive(createdDroplets)) {
          console.log('Droplets are not initialised yet.. Will check again in some time');
          getDroplets(idList, callback);
        } else {
          callback(null);
        }
      });
    };
    console.log('Waiting for droplets to initialise');
    setTimeout(getDropletInfo, 1 * 60 * 1000);
  };

  var getConnectionType = function(callback) {
    utils.postQuestion('Please select the Connection type for generating the config file \n' +
    '1. Tcp & Utp (Both) \n2. Tcp \n3. Utp', function(type) {
      type = parseInt(type);
      if(isNaN(type) || type < 0 || type > 3) {
        console.log('Invalid input');
        getConnectionType(callback);
      } else {
        connectionType = type;
        callback(null);
      }
    });
  };

  var getBeaconPort = function(callback) {
    if (!args.hasOwnProperty(ADVANCED_ARG)) {
      callback(null);
      return;
    }
    utils.postQuestion('Please enter the Beacon port (Default:' + config.beaconPort + ')', function(port) {
      if (port !== '') {
        port = parseInt(port);
        if (isNaN(port)) {
          console.log('Invalid input');
          getBeaconPort(callback);
          return;
        }
      }
      beaconPort = port ? port : config.beaconPort;
      callback(null);
    }, true);
  };

  var getListeningPort = function(callback) {
    if (!args.hasOwnProperty(ADVANCED_ARG)) {
      callback(null);
      return;
    }
    utils.postQuestion('Please enter the listening port (Default:' + config.listeningPort + ')', function(port) {
      if (port !== '') {
        port = parseInt(port);
        if (isNaN(port)) {
          console.log('Invalid input');
          getListeningPort(callback);
          return;
        }
      }
      listeningPort = port ? port : config.listeningPort;
      callback(null);
    }, true);
  };

  var generateEndPoints = function(stdListeningPort) {
    var endPoints = [];
    var ip;
    for (var i = 0; i < seedNodeSize; i++) {
      ip = createdDroplets[i].networks.v4[0].ip_address;
      if (connectionType != 3) {
        endPoints.push({
          protocol: 'tcp',
          address: ip + ':' + stdListeningPort
        });
      }
      if (connectionType != 2) {
        endPoints.push({
          protocol: 'utp',
          address: ip + ':' + stdListeningPort
        });
      }
    }
    return endPoints;
  };

  var generateReporterConfigFiles = function(callback) {
    var configFile;
    configFile = require('./reporter_config_template.json');
    var reporterEndpoints = [];
    var reporterListeningPort = listeningPort | config.listeningPort;
    for (var i in createdDroplets) {
      reporterEndpoints.push(createdDroplets[i].networks.v4[0].ip_address + ':' + reporterListeningPort);
    }

    utils.deleteFolderRecursive(config.outFolder);
    fs.mkdirSync(config.outFolder);
    fs.mkdirSync(config.outFolder + '/scp');

    for (var j in reporterEndpoints) {
      var currentIP = reporterEndpoints[j].split(':')[0];
      configFile['msg_to_send'] = 'Message from ' + currentIP;
      configFile['listening_port'] = reporterListeningPort;
      configFile['ips'] = reporterEndpoints;
      configFile['output_report_path'] = '/home/qa/reporter_log_' + currentIP + '.json';
      fs.mkdirSync(config.outFolder + '/scp/' + currentIP);
      fs.writeFileSync(config.outFolder + '/scp/' + currentIP + '/reporter.json', JSON.stringify(configFile, null, 2));
    }
    callback(null);
  };

  var generateStdConfigFile = function(callback) {
    var configFile;
    configFile = require('./std_config_template.json');
    var stdListeningPort = listeningPort | config.listeningPort;
    if (connectionType != 3) {
      configFile['tcp_listening_port'] = stdListeningPort;
    }
    if (connectionType != 2) {
      configFile['utp_listening_port'] = stdListeningPort;
    }
    configFile['beacon_port'] = beaconPort | config.beaconPort;
    configFile['hard_coded_contacts'] = generateEndPoints(stdListeningPort);
    utils.deleteFolderRecursive(config.outFolder);
    fs.mkdirSync(config.outFolder);
    fs.mkdirSync(config.outFolder + '/scp');
    var prefix = libraryConfig.hasOwnProperty('example') ? libraryConfig['example'] : selectedLibraryRepoName;
    fs.writeFileSync(config.outFolder + '/scp/' + prefix + '.crust.config', JSON.stringify(configFile, null, 2));
    callback(null);
  };

  var generateIPListFile = function(callback) {
    var spaceDelimittedFile = '';
    for (var i in createdDroplets) {
      spaceDelimittedFile += spaceDelimittedFile ? ' ' : '';
      spaceDelimittedFile += createdDroplets[i].networks.v4[0].ip_address;
    }
    fs.writeFileSync(config.outFolder + '/' + config.outputIPListFile, spaceDelimittedFile);
    callback(null);
  };

  var generateTeamocilSettingsFiles = function(callback) {
    if (!libraryConfig.hasOwnProperty(TMUX_CMDS_KEY)) {
      return callback('Missing tmuxCommands in config.json');
    }
    var buff = fs.readFileSync('./teamocil_template.yml');
    var generatedFile = buff.toString();
    var commands = libraryConfig[TMUX_CMDS_KEY];
    for (var i in commands) {
      generatedFile += '\n        - ' + commands[i];
    }
    if (binaryName === 'reporter') {
      for (var j in createdDroplets) {
        fs.writeFileSync(config.outFolder + '/scp/' + createdDroplets[j].networks.v4[0].ip_address + '/settings.yml',
                         generatedFile);
      }
    } else {
      fs.writeFileSync(config.outFolder + '/scp/settings.yml', generatedFile);
    }
    callback(null);
  };

  var copyBinary = function(callback) {
    if (binaryName === 'reporter') {
      for (var i in createdDroplets) {
        fse.copySync(binaryPath + binaryName,
                     config.outFolder + '/scp/' + createdDroplets[i].networks.v4[0].ip_address  + "/" + binaryName);
      }
      callback(null);
    } else {
      fse.copy(binaryPath + binaryName, config.outFolder + '/scp/' + binaryName, function (err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null);
      });
    }
  };

  var transferFiles = function(callback) {
    if (config.testMode) {
      console.log('Skipping SCP in test mode');
      callback(null);
      return;
    }
    var TransferFiles = function(ip, sourcePath, destPath) {
      this.run = function(cb) {
        console.log("Transferring files to :: " + ip);
        scpClient.scp(sourcePath, {
          host: ip,
          username: config.dropletUser,
          password: auth.getDopletUserPassword(),
          path: destPath,
          readyTimeout: 99999
        }, cb);
      };

      return this.run;
    };
    var requests = [];
    for (var i in createdDroplets) {
      var ip = createdDroplets[i].networks.v4[0].ip_address;
      var scpPathSuffix = ((binaryName === 'reporter') ? ip + '/' : '');

      // Config Files and Binary
      var sourcePath = config.outFolder + '/scp/' + scpPathSuffix;
      var destPath = config.remotePathToTransferFiles;
      requests.push(new TransferFiles(ip, sourcePath, destPath));
    }
    try {
      async.series(requests, function(err) {
        if (!err) {
          console.log('SCP Transfer completed successfully.\n')
          return callback(null);
        }

        console.log("SCP Transfer failed.");
        callback(err);
      });
    } catch (e) {
      console.log("SCP Transfer failed. " + e);
      callback(e);
    }
  };

  var executeRemoteCommands = function(callback) {
    var Handler = function(ssh, cmd) {
      this.run = function(cb) {
        console.log("Executing tmux commands on :: " + ssh.host);
        ssh.exec(cmd, {
          exit: function() {
            console.log('tmux setup completed on :: ' + ssh.host);
            return cb(null);
          },
          err: function(stderr) {
            console.log(stderr);
            return cb(stderr);
          },
          out: console.log.bind(console)
        }).start();
      };
      return this.run;
    };
    var requests = [];
    var ssh;
    for (var i in createdDroplets) {
      ssh = new SSH({
        host: createdDroplets[i].networks.v4[0].ip_address,
        user: config.dropletUser,
        pass: auth.getDopletUserPassword(),
        timeout: 99999
      });
      requests.push(
        new Handler(ssh, 'tmux new-session -d \"mv ~/settings.yml ~/.teamocil/;. ~/.bash_profile;teamocil settings\"'));
    }
    async.series(requests, function(err) {
      if (!err) {
        console.log('SSH execution completed successfully.');
        return callback(null);
      }

      console.log("Tmux command execution failed.");
      callback(err);
    });
  };

  var printResult = function(callback) {
    console.log('\n');
    for (var i in createdDroplets) {
      console.log(createdDroplets[i].name +
      '\nssh -o StrictHostKeyChecking=no -t ' + config.dropletUser + '@' + createdDroplets[i].networks.v4[0].ip_address +
      ' \"tmux attach\"');
    }
    callback(null);
  };

  var buildLibrary = function(option) {
    var libraries = [];
    var waterfallTasks = [];
    for (var key in config.libraries) {
      libraries.push(key);
    }
    selectedLibraryKey = libraries[option - 1];
    var temp = config.libraries[selectedLibraryKey].url.split('/');
    selectedLibraryRepoName = temp[temp.length - 1].split('.')[0];
    libraryConfig = config.libraries[selectedLibraryKey];
    binaryName = (libraryConfig.hasOwnProperty('example') ? libraryConfig['example'] : selectedLibraryRepoName) +
      BINARY_EXT;
    binaryPath = config.workspace + '/' + selectedLibraryRepoName + '/target/release/' +
      (libraryConfig.hasOwnProperty('example') ? 'examples' : '') + '/';
    buildPath = config.workspace + '/' + selectedLibraryRepoName;

    waterfallTasks.push(
      validateUniqueNetwork,
      getDropletRegions,
      clone,
      build,
      stripBinary,
      getNetworkSize
    );

    if (binaryName !== 'reporter') {
      waterfallTasks.push(
        getSeedNodeSize,
        getConnectionType,
        getBeaconPort
      );
    }

    waterfallTasks.push(
      getListeningPort,
      getNetworkType,
      selectDropletRegion,
      createDroplets,
      getDroplets
    );

    if (binaryName !== 'reporter') {
      waterfallTasks.push(
        generateStdConfigFile
      );
    } else {
      waterfallTasks.push(
        generateReporterConfigFiles
      );
    }

    waterfallTasks.push(
      generateIPListFile,
      generateTeamocilSettingsFiles,
      copyBinary,
      transferFiles,
      executeRemoteCommands,
      printResult
    );


    async.waterfall(waterfallTasks, function(err) {
      if (err) {
        console.error(err);
        return;
      }
      console.log('\nDone - Output folder located at ->' + config.outFolder + '\n');
    });
  };

  var onSetupOptionSelected = function(option) {
    var keys = [];
    option = parseInt(option);
    var optionNotValid = function() {
      console.log("Invalid option selected");
      showSetupOptions();
    };
    for (var key in config.libraries) {
      keys.push(key);
    }
    if (isNaN(option) || option < 0 || option > keys.length) {
      optionNotValid();
    } else {
      buildLibrary(option);
    }
  };

  var showSetupOptions = function() {
    var libOptions = "\n--------- \n";
    var i = 1;
    var isExample;
    for (var key in config.libraries) {
      isExample = config.libraries[key].hasOwnProperty('example');
      libOptions +=  (i + '. ' + key.replace(/-.*/g, "") + ' ' + (isExample ? 'Example' : 'Binary')
        + ' - ' + (isExample ? config.libraries[key]['example'] : config.libraries[key]['binary']) + '\n');
      i++;
    }

    utils.postQuestion('Please choose the entry for which the network is to be set up: ' + libOptions, onSetupOptionSelected);
  };

  showSetupOptions();
};

