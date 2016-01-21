/* jshint maxstatements:100 */
/*jshint camelcase: false */
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
exports = module.exports = function(args) {
  var fs = require('fs');
  var os = require('os');
  var path = require('path');
  var fse = require('fs-extra');
  var scpClient = require('scp2');
  var async = require('async');
  var exec = require('child_process').exec;
  var utils = require('./common/utils');
  var config = require('./config.json');
  var auth = require('./common/auth');
  var SshClient = require('ssh2').Client;
  var ProgressBar = require('progress');
  var Table = require('cli-table');
  var digitalOcean = require('./common/digitalocean').Api(auth.getDigitalOceanToken(), config.testMode);

  var ADVANCED_ARG = 'advanced';
  var TMUX_CMDS_KEY = 'tmuxCommands';

  var selectedLibraryKey;
  var selectedLibraryRepoName;
  var libraryConfig;
  var binaryPath;
  var binaryName;
  var buildPath;
  var buildFlags;
  var networkSize;
  var seedNodeSize;
  var dropletRegions;
  var createdDroplets;
  var connectionType;
  var beaconPort;
  var listeningPort;
  var progressBar;

  var BINARY_EXT = {
    'windows_nt': '.exe',
    'linux': ''
  }[os.type().toLowerCase()];

  var getRepositoryLocation = function(callback) {
    var message = 'Please select the source repository location\n---------\n' +
      '1. GitHub master branch\n2. Local repository\n';

    var onRepositoryLocationSelected = function(option) {
      option = parseInt(option);
      var validPathChosen = function(chosenPath) {
        buildPath = chosenPath;
        return callback(null);
      };

      if (option === 1) {
        return callback(null);
      } else if (option === 2) {
        utils.getValidPath('Please enter the path to ' + selectedLibraryRepoName, validPathChosen);
      } else {
        console.log('Invalid option selected');
        getRepositoryLocation(callback);
      }
    };

    utils.postQuestion(message, onRepositoryLocationSelected);
  };

  var getBuildType = function(callback) {
    var message = '\nPlease select the required build type\n1. Debug.\n2. Release.\n';
    var onBuildTypeSelected = function(option) {
      option = parseInt(option);
      if (option === 1) {
        return callback(null);
      } else if (option === 2) {
        buildFlags = ' --release';
        return callback(null);
      } else {
        console.log('Invalid option selected');
        getBuildType(callback);
      }
    };

    utils.postQuestion(message, onBuildTypeSelected);
  };

  var clone = function(callback) {
    if (buildPath) {
      console.log('Skipping Clone Step');
      return callback(null);
    }

    buildPath = config.workspace + '/' + selectedLibraryRepoName;
    utils.deleteFolderRecursive(buildPath);

    console.log('Cloning Repository - ' + selectedLibraryRepoName);
    exec('git clone ' + libraryConfig.url + ' ' +
          buildPath + ' --depth 1', function(err) {
      callback(err);
    });
  };

  var build = function(callback) {
    var targetPath = path.resolve(config.workspace + '/target_' + selectedLibraryRepoName);
    var buildCommand = 'CARGO_TARGET_DIR=' + targetPath + ' cargo build';
    if (libraryConfig.hasOwnProperty('example')) {
      buildCommand += ' --example ' + libraryConfig.example;
    }
    buildCommand += buildFlags ? buildFlags : '';
    console.log('Building Repository - ' + selectedLibraryRepoName);
    exec('cd ' + buildPath + ' && ' + buildCommand, function(err) {
      var buildTypePathSegment = buildFlags ? '/release/' : '/debug/';
      var exampleBinaryPathSegment = libraryConfig.hasOwnProperty('example') ? 'examples/' : '';
      binaryPath = targetPath + buildTypePathSegment + exampleBinaryPathSegment;
      callback(err);
    });
  };

  var stripBinary = function(callback) {
    if (!buildFlags) {
      console.log('Skipping Strip binary Step');
      return callback(null);
    }

    exec('strip -s ' + binaryPath + binaryName, function(err) {
      callback(err);
    });
  };

  var getNetworkSize = function(callback) {
    utils.postQuestion('Please enter the size of the network between ' +
      config.minNetworkSize + '-' + config.maxNetworkSize, function(size) {
      size = parseInt(size);
      if (isNaN(size) || size < config.minNetworkSize || size > config.maxNetworkSize) {
        console.log('Invalid input');
        getNetworkSize(callback);
      } else {
        networkSize = size;
        callback(null);
      }
    });
  };

  var getSeedNodeSize = function(callback) {
    if (binaryName === 'crust_peer') {
      seedNodeSize = networkSize;
      return callback(null);
    }

    utils.postQuestion('Please enter the size of the seed nodes between ' +
      config.minSeedNodeSize + '-' + config.maxSeedNodeSize, function(size) {
      size = parseInt(size);
      if (isNaN(size) || size < config.minSeedNodeSize || size > config.maxSeedNodeSize) {
        console.log('Invalid input');
        getSeedNodeSize(callback);
      } else {
        seedNodeSize = size;
        callback(null);
      }
    });
  };

  var getNetworkType = function(callback) {
    // utils.postQuestion('Please select the type of network \n1. Spread \n2. Concentrated', function(type) {
    //  type = parseInt(type);
    //  if(isNaN(type) || type < 0 || type > 2) {
    //    console.log('Invalid input');
    //    getNetworkType(callback);
    //  } else {
    //    callback(null, type === 1);
    //  }
    // });
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
      callback(null, [ config.imageRegion ]);
    } else {
      callback('imageRegion not specified in config');
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
        console.log('Creating droplet -', name);
        digitalOcean.createDroplet(name, region, size, image, keys, cb);
      };
      return this.run;
    };
    var requests = [];
    console.log('Creating droplets...');
    for (var i = 0; i < networkSize; i++) {
      region = selectedRegions[i % selectedRegions.length];
      name = auth.getUserName() + '-' + selectedLibraryKey + '-TN-' + region + '-' + (i + 1);
      requests.push(new TempFunc(name, region, config.dropletSize, config.imageId, config.sshKeys));
    }
    async.series(requests, callback);
  };

  var getActiveDropletCount = function(list) {
    var initialisedCount = 0;
    var initialised;
    for (var i in list) {
      if (list[i]) {
        initialised = list[i].status === 'active';
        if (initialised) {
          initialisedCount += 1;
        }
      }
    }
    return initialisedCount;
  };

  var getDroplets = function(idList, callback) {
    if (!progressBar) {
      console.log('\n');
      progressBar = new ProgressBar('Initialising droplets [:bar] :current/:total :percent', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: networkSize
      });
      progressBar.tick(0);
    }

    var TempFunc = function(id) {
      this.run = function(cb) {
        digitalOcean.getDroplet(id, cb);
      };
      return this.run;
    };

    var getDropletInfo = function() {
      var requests = [];
      for (var i in idList) {
        if (idList[i]) {
          requests.push(new TempFunc(idList[i]));
        }
      }
      async.parallel(requests, function(err, droplets) {
        if (err) {
          callback(err);
          return;
        }
        createdDroplets = droplets;
        var activeDropletCount = getActiveDropletCount(createdDroplets);
        var newActiveCount = activeDropletCount - progressBar.curr;
        if (newActiveCount > 0) {
          progressBar.tick(newActiveCount);
        }
        if (createdDroplets.length === 0) {
          callback('Droplets could not be created');
        } else if (activeDropletCount < networkSize) {
          getDroplets(idList, callback);
        } else {
          console.log('\n');
          callback(null);
        }
      });
    };
    setTimeout(getDropletInfo, 20 * 1000);
  };

  var getConnectionType = function(callback) {
    utils.postQuestion('Please select the Connection type for generating the config file \n' +
    '1. Tcp & Utp (Both) \n2. Tcp \n3. Utp', function(type) {
      type = parseInt(type);
      if (isNaN(type) || type < 0 || type > 3) {
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
      if (connectionType !== 3) {
        endPoints.push({
          protocol: 'tcp',
          address: ip + ':' + stdListeningPort
        });
      }
      if (connectionType !== 2) {
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
      if (createdDroplets[i]) {
        reporterEndpoints.push(createdDroplets[i].networks.v4[0].ip_address + ':' + reporterListeningPort);
      }
    }

    utils.deleteFolderRecursive(config.outFolder);
    fs.mkdirSync(config.outFolder);
    fs.mkdirSync(config.outFolder + '/scp');

    for (var j in reporterEndpoints) {
      if (reporterEndpoints[j]) {
        var currentIP = reporterEndpoints[j].split(':')[0];
        configFile.msg_to_send = 'Message from ' + currentIP;
        configFile.listening_port = reporterListeningPort;
        configFile.ips = reporterEndpoints;
        configFile.output_report_path = '/home/qa/reporter_log_' + currentIP + '.json';
        fs.mkdirSync(config.outFolder + '/scp/' + currentIP);
        fs.writeFileSync(config.outFolder + '/scp/' + currentIP + '/reporter.json',
            JSON.stringify(configFile, null, 2));
      }
    }
    callback(null);
  };

  var generateStdConfigFile = function(callback) {
    var configFile;
    configFile = require('./std_config_template.json');
    var stdListeningPort = listeningPort | config.listeningPort;
    if (connectionType !== 3) {
      configFile.tcp_listening_port = stdListeningPort;
    }
    if (connectionType !== 2) {
      configFile.utp_listening_port = stdListeningPort;
    }
    configFile.beacon_port = beaconPort | config.beaconPort;
    configFile.hard_coded_contacts = generateEndPoints(stdListeningPort);
    utils.deleteFolderRecursive(config.outFolder);
    fs.mkdirSync(config.outFolder);
    fs.mkdirSync(config.outFolder + '/scp');
    var prefix = libraryConfig.hasOwnProperty('example') ? libraryConfig.example : selectedLibraryRepoName;
    fs.writeFileSync(config.outFolder + '/scp/' + prefix + '.crust.config', JSON.stringify(configFile, null, 2));
    callback(null);
  };

  var generateIPListFile = function(callback) {
    var spaceDelimittedFile = '';
    for (var i in createdDroplets) {
      if (createdDroplets[i]) {
        spaceDelimittedFile += spaceDelimittedFile ? ' ' : '';
        spaceDelimittedFile += createdDroplets[i].networks.v4[0].ip_address;
      }
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
      if (commands[i]) {
        generatedFile += '\n        - ' + commands[i];
      }
    }
    if (binaryName === 'reporter') {
      for (var j in createdDroplets) {
        if (createdDroplets[i]) {
          fs.writeFileSync(config.outFolder + '/scp/' + createdDroplets[j].networks.v4[0].ip_address + '/settings.yml',
              generatedFile);
        }
      }
    } else {
      fs.writeFileSync(config.outFolder + '/scp/settings.yml', generatedFile);
    }
    callback(null);
  };

  var copyBinary = function(callback) {
    if (binaryName === 'reporter') {
      for (var i in createdDroplets) {
        if (createdDroplets[i]) {
          fse.copySync(binaryPath + binaryName,
              config.outFolder + '/scp/' + createdDroplets[i].networks.v4[0].ip_address  + '/' + binaryName);
        }
      }
      callback(null);
    } else {
      fse.copy(binaryPath + binaryName, config.outFolder + '/scp/' + binaryName, function(err) {
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
        console.log('Transferring files to :: ' + ip);
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
      if (createdDroplets[i]) {
        var ip = createdDroplets[i].networks.v4[0].ip_address;
        var scpPathSuffix = ((binaryName === 'reporter') ? ip + '/' : '');

        // Config Files and Binary
        var sourcePath = config.outFolder + '/scp/' + scpPathSuffix;
        var destPath = config.remotePathToTransferFiles;
        requests.push(new TransferFiles(ip, sourcePath, destPath));
      }
    }
    try {
      async.series(requests, function(err) {
        if (!err) {
          console.log('SCP Transfer completed successfully.\n');
          return callback(null);
        }

        console.log('SCP Transfer failed. Error: ' + err);
        return callback(err);
      });
    } catch (e) {
      console.log('SCP Transfer failed. Exception: ' + e);
      return callback(e);
    }
  };

  var executeRemoteCommands = function(callback) {
    var Handler = function(sshOptions, cmd) {
      this.run = function(cb) {
        console.log('Executing ssh commands on :: ' + sshOptions.host);
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
    var requests = [];
    for (var i in createdDroplets) {
      if (createdDroplets[i]) {
        var sshOptions = {
          host: createdDroplets[i].networks.v4[0].ip_address,
          username: config.dropletUser,
          password: auth.getDopletUserPassword(),
          readyTimeout: 99999
        };
        var cmd = 'tmux new-session -d \"mv ~/settings.yml ~/.teamocil/;. ~/.bash_profile;teamocil settings\"';
        requests.push(new Handler(sshOptions, cmd));
      }
    }
    async.series(requests, function(err) {
      if (!err) {
        console.log('SSH execution completed successfully.');
        return callback(null);
      }

      console.log('SSH command execution failed.');
      callback(err);
    });
  };

  var printResult = function(callback) {
    console.log('\n');
    var table = new Table({
      head: [ 'Droplet Name', 'SSH Command' ],
      colWidths: [ 40, 100 ]
    });
    for (var i in createdDroplets) {
      if (createdDroplets[i]) {
        table.push([ createdDroplets[i].name, 'ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -t ' +
        config.dropletUser + '@' + createdDroplets[i].networks.v4[0].ip_address + ' \"tmux attach\"' ]);
      }
    }
    console.log(table.toString());
    callback(null);
  };

  var buildLibrary = function(option) {
    var libraries = [];
    var waterfallTasks = [];
    for (var key in config.libraries) {
      if (key) {
        libraries.push(key);
      }
    }
    selectedLibraryKey = libraries[option - 1];
    var temp = config.libraries[selectedLibraryKey].url.split('/');
    selectedLibraryRepoName = temp[temp.length - 1].split('.')[0];
    libraryConfig = config.libraries[selectedLibraryKey];
    binaryName = (libraryConfig.hasOwnProperty('example') ? libraryConfig.example : selectedLibraryRepoName) +
      BINARY_EXT;

    waterfallTasks.push(
      validateUniqueNetwork,
      getDropletRegions,
      getRepositoryLocation,
      clone,
      getBuildType,
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
      console.log('Invalid option selected');
      showSetupOptions();
    };
    for (var key in config.libraries) {
      if (key) {
        keys.push(key);
      }
    }
    if (isNaN(option) || option < 0 || option > keys.length) {
      optionNotValid();
    } else {
      buildLibrary(option);
    }
  };

  var showSetupOptions = function() {
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

    utils.postQuestion('Please choose the entry for which the network is to be set up: ' +
        libOptions, onSetupOptionSelected);
  };

  showSetupOptions();
};

