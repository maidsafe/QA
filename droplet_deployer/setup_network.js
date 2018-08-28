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
  var nodeUtil = require('util');
  var config = require('./config.json');
  var auth = require('./common/auth');
  var SshClient = require('ssh2').Client;
  var ProgressBar = require('progress');
  var Table = require('cli-table');
  var cloudProvider =  config.provider === 'vultr' ?
      require('./common/vultr').Api(auth.getVultrToken()) :
      require('./common/digitalocean').Api(auth.getDigitalOceanToken());

  var ADVANCED_ARG = 'advanced';

  var selectedLibraryKey;
  var selectedLibraryRepoName;
  var libraryConfig;
  var binaryPath;
  var binaryName;
  var buildPath;
  var buildFlags;
  var networkSize;
  var seedNodeSize;
  var createdDroplets;
  var listeningPort;
  var progressBar;
  var isUsingExistingDroplets = true;
  var snapshotRegions;
  var isWhitelistedNetwork;
  var networkName;
  var inviteKey;

  var BINARY_EXT = {
    'windows_nt': '.exe',
    'linux': ''
  }[os.type().toLowerCase()];

  var PROVIDER_DETAILS = config.providerDetails[config.provider];

  /**
   * A helper function to construct SSH options given target machine IP and
   * config.
   *
   * @param {string} ip
   * @param {object} config - droplet deployer config that also includes SSH
   *    specific options, e.g. for authentication.
   */
  function makeSSHOptions(ip, config) {
    var opts =  {
      host: ip,
      username: config.dropletUser,
      readyTimeout: 99999
    };

    if ('dropletSshPrivKeyPath' in config) {
      opts.privateKey = fs.readFileSync(config.dropletSshPrivKeyPath);
    } else {
      opts.password = auth.getDropletUserPassword();
    }

    return opts;
  }

  // Helper fn to populate ssh requests to multiple ips
  var generateSSHRequests = function(ips, cmd) {
    var Handler = function(sshOptions) {
      this.run = function(cb) {
        var conn = new SshClient();
        var errorMessage = 'SSH Execution Failed for: ' + sshOptions.host;
        conn.on('ready', function() {
          var self = this;
          self.data = '';
          conn.exec(cmd, function(err, stream) {
            if (err) {
              return cb(errorMessage + '-' + err.message);
            }
            stream.on('data', function(data) {
              self.data += data.toString();
            });
            stream.on('close', function() {
              conn.end();
              return cb(null, self.data);
            });
          });
        }).on('error', function(e) {
          return cb(e);
        }).connect(sshOptions);
      };
      return this.run;
    };
    var requests = [];
    ips.forEach(function(ip) {
      requests.push(new Handler(makeSSHOptions(ip, config)));
    });
    return requests;
  };

  // Helper fn to populate hard_coded_contacts and whitelisted_node_ips for std config file
  var generateEndPoints = function(isSeedNodes, stdListeningPort) {
    var endPoints = [];
    var ip;
    for (var i = 0; i < createdDroplets.length; i++) {
      ip = createdDroplets[i].networks.v4[0].ip_address;
      if (isSeedNodes) {
        endPoints.push(ip + ':' + stdListeningPort);
        if (seedNodeSize === endPoints.length) {
          break;
        }
      } else {
        endPoints.push(ip);
      }
    }
    return endPoints;
  };

  var validateUniqueNetwork = function(callback) {
    cloudProvider.getDropletList(function(err, list) {
      if (err) {
        callback(err);
        return;
      }
      var userName = auth.getUserName();
      var pattern = userName + '-' + selectedLibraryKey;
      var existingDroplets = [];
      for (var i in list) {
        if (list[i].name.indexOf(pattern) === 0) {
          existingDroplets.push(list[i]);
        }
      }
      isUsingExistingDroplets = existingDroplets.length > 0;
      if (!isUsingExistingDroplets) {
        return callback();
      }
      var msg = 'There are %d existing droplets for %s for the selected %s.\n' +
        'Do you want to proceed using the same droplets? (Type Y for yes)';
      utils.postQuestion(nodeUtil.format(msg, existingDroplets.length, userName, selectedLibraryKey),
          function(canStop) {
        if (canStop && canStop.toLowerCase() === 'y') {
          createdDroplets = existingDroplets;
          console.log('Clearing previous network state');
          var dropletIps = utils.getDropletIps(createdDroplets);
          var sshCommand = config.tmuxKillAllSessions + ';';
          sshCommand += 'rm *.log;';
          sshCommand += 'rm log.toml;';
          sshCommand += nodeUtil.format('rm %s* || true', binaryName);
          var requests = generateSSHRequests(dropletIps, sshCommand);
          async.parallelLimit(requests, 20, function(err) {
            if (!err) {
              console.log('Network state cleared successfully.\n');
              networkSize = existingDroplets.length;
              return callback(null);
            }

            console.log('SSH command execution failed.');
            callback(err);
          });
        } else {
          callback('Drop the network to start up a fresh network');
        }
      });
    });
  };

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

  var build = function(callback) {
    var targetPath = path.resolve(config.workspace + '/target_' + selectedLibraryRepoName);
    var rustFlags = config.fastBuild ? 'RUSTFLAGS="-C opt-level=2 -C codegen-units=8"' : '';
    var buildCommand = nodeUtil.format('%s CARGO_TARGET_DIR=%s cargo build', rustFlags, targetPath);
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
    if (isUsingExistingDroplets) {
      return callback();
    }
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
    if (binaryName === 'crust_peer' || binaryName === 'reporter') {
      seedNodeSize = networkSize;
      return callback(null);
    }

    utils.postQuestion('Please enter the size of the seed nodes between ' +
    config.minSeedNodeSize + '-' + networkSize, function(size) {
      size = parseInt(size);
      if (isNaN(size) || size < config.minSeedNodeSize || size > networkSize) {
        console.log('Invalid input');
        getSeedNodeSize(callback);
      } else {
        seedNodeSize = size;
        callback(null);
      }
    });
  };

  var getIsWhitelistedNetwork = function(callback) {
    if (binaryName === 'reporter') {
      return callback(null);
    }

    utils.postQuestion('Is network limited to white-list nodes [Y/n]', function(isWhiteListOnly) {
      isWhiteListOnly = isWhiteListOnly.toLowerCase();
      if (isWhiteListOnly !== 'y' && isWhiteListOnly !== 'n') {
        console.log('Invalid input');
        getIsWhitelistedNetwork(callback);
      } else {
        isWhitelistedNetwork = isWhiteListOnly === 'y';
        callback(null);
      }
    });
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

  var getNetworkName = function(callback) {
    var defaultNetworkName = 'test_network';
    var message = '\nPlease provide the network name to use. (default: ' + defaultNetworkName + ')';
    utils.postQuestion(message, function(name) {
      networkName = name ? name : defaultNetworkName;
      callback(null);
    }, true);
  };

  var getInviteKey = function(callback) {
    var message = '\nPlease provide the vault invite token pub key. (default: null)';
    utils.postQuestion(message, function(key) {
      if (key) {
        inviteKey = JSON.parse(key);
      }
      callback(null);
    }, true);
  };

  var getNetworkType = function(callback) {
    if (isUsingExistingDroplets) {
      return callback(null, true);
    }

    utils.postQuestion('Please select the type of network \n1. Concentrated\n2. Spread', function(type) {
      type = parseInt(type);
      if (!utils.isInt(type) || (type !== 1 && type !== 2)) {
        console.log('Invalid input');
        return getNetworkType(callback);
      }

      callback(null, type === 1);
    });
  };

  var createDroplets = function(isConcentratedNetwork, callback) {
    if (isUsingExistingDroplets) {
      return callback(null, []);
    }

    if (isConcentratedNetwork && snapshotRegions.indexOf(PROVIDER_DETAILS.concentratedRegion) < 0) {
      return callback('Region: %s, not found to create concentrated network.', PROVIDER_DETAILS.concentratedRegion);
    }

    var name;
    var region;
    var TempFunc = function(name, region, size, image, keys) {
      this.run = function(cb) {
        console.log('Creating droplet -', name);
        cloudProvider.createDroplet(name, region, size, image, keys, cb);
      };
      return this.run;
    };

    var requests = [];
    console.log('Creating droplets...');
    for (var i = 0; i < networkSize; i++) {
      region = isConcentratedNetwork ?
                  PROVIDER_DETAILS.concentratedRegion : snapshotRegions[i % snapshotRegions.length];
      name = auth.getUserName() + '-' + selectedLibraryKey + '-TN-' + region + '-' + (i + 1);
      requests.push(new TempFunc(name, region, PROVIDER_DETAILS.size, PROVIDER_DETAILS.snapshotId, config.sshKeys));
    }
    async.series(requests, callback);
  };

  var getActiveDropletCount = function(list) {
    var initialisedCount = 0;
    var initialised;
    for (var i in list) {
      if (list[i]) {
        if (config.provider === 'vultr') {
          initialised = list[ i ].status === 'active' &&
            list[ i ].power_status === 'running' &&
            list[ i ].server_state === 'ok';
        } else {
          initialised = list[ i ].status === 'active';
        }
        if (initialised) {
          initialisedCount += 1;
        }
      }
    }
    return initialisedCount;
  };

  var getDroplets = function(idList, callback) {
    if (isUsingExistingDroplets) {
      return callback();
    }
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

    var getDropletsInfo = function() {
      cloudProvider.getDropletList(function(err, list) {
        if (err) {
          return callback(err);
        }
        var userName = auth.getUserName();
        var pattern = userName + '-' + selectedLibraryKey;
        var selectedDroplets = [];
        for (var i in list) {
          if (list[i].name.indexOf(pattern) === 0) {
            selectedDroplets.push(list[i]);
          }
        }

        var activeDropletCount = getActiveDropletCount(selectedDroplets);
        var newActiveCount = activeDropletCount - progressBar.curr;
        if (newActiveCount > 0) {
          progressBar.tick(newActiveCount);
        }
        if (selectedDroplets.length === 0) {
          return callback('Droplets could not be created');
        } else if (activeDropletCount < networkSize) {
          getDroplets(idList, callback);
        } else {
          console.log('\n');
          createdDroplets = selectedDroplets;
          return callback(null);
        }
      });
    };
    setTimeout(getDropletsInfo, 5 * 1000);
  };

  /**
   * Installs required packages into the droplets.
   */
  function setupDroplets(callback) {
    if (!PROVIDER_DETAILS.freshInstall) {
      return callback();
    }

    var sshCommand = 'sudo apt-get update && ' +
        'sudo apt-get install -y ruby && ' +
        'sudo gem install teamocil && ' +
        'mkdir -p ~/.teamocil &&' +
        'touch ~/.bash_profile';
    let requests = createdDroplets.map(droplet => generateSSHRequests(
      [droplet.networks.v4[0].ip_address], sshCommand)[0]);

    console.log('Installing packages into droplets...');
    async.parallelLimit(requests, 20, err => {
      if (!err) {
        console.log('Packages installed successfully.\n');
        return callback(null);
      }

      return callback(err);
    });
  }

  var SetHostnames = function(callback) {
    if (isUsingExistingDroplets || config.provider !== 'vultr') {
      return callback();
    }

    var requests = [];
    for (var i in createdDroplets) {
      if (createdDroplets[i]) {
        var sshCommand = nodeUtil.format('sudo /sbin/update_hostname %s', createdDroplets[i].name);
        requests.push(generateSSHRequests([ createdDroplets[i].networks.v4[0].ip_address ], sshCommand)[0]);
      }
    }

    console.log('Updating hostnames...');
    async.parallelLimit(requests, 20, function(err) {
      if (!err) {
        console.log('Hostnames updated successfully.\n');
        return callback(null);
      }

      return callback(err);
    });
  };

  var clearOutputFolder = function(callback) {
    utils.deleteFolderRecursive(config.outFolder);
    fs.mkdirSync(config.outFolder);
    fs.mkdirSync(config.outFolder + '/scp');
    callback(null);
  };

  var generateIPListFile = function(callback) {
    var spaceDelimittedFile = '';
    var dropletIps = utils.getDropletIps(createdDroplets);
    dropletIps.forEach(function(ip) {
      spaceDelimittedFile += ip + ' ';
    });
    spaceDelimittedFile = spaceDelimittedFile.slice(0, -1);
    fs.writeFileSync(config.outFolder + '/' + config.outputIPListFile, spaceDelimittedFile);
    callback(null);
  };

  /**
   * @param config {object} - droplet deployer config that also has Crust
   *    specific options. NOTE, that config is a public variable, but
   *    this is my attempt to reduce the use of public variables.
   * @returns {object} Crust config filled with values from droplet deployer
   *    config.
   */
  function genCrustConf(config) {
    var conf = require('./std_config_template.json');
    let listenerPort = listeningPort | config.listeningPort;
    conf.listen_addresses = conf.listen_addresses.map(addr => addr + listenerPort);
    conf.output_encryption_keys = config.crustEncryptionKeysFile;

    conf.hard_coded_contacts = generateEndPoints(true, listenerPort);

    if (isWhitelistedNetwork) {
      conf.whitelisted_node_ips = generateEndPoints();
    } else {
      conf.whitelisted_node_ips = null;
    }
    conf.network_name = networkName;

    return conf;
  }

  function genCrustConfFile(callback) {
    let conf = genCrustConf(config);
    var prefix = libraryConfig.hasOwnProperty('example') ? libraryConfig.example : selectedLibraryRepoName;
    fs.writeFileSync(config.outFolder + '/scp/' + prefix + '.crust.config', JSON.stringify(conf, null, 2));
    callback(null);
  }

  var generateVaultConfigFile = function(callback) {
    var configFile;
    configFile = require('./vault_config_template.json');
    if (inviteKey) {
      configFile.invite_key = inviteKey;
    }
    fs.writeFileSync(config.outFolder + '/scp/safe_vault.vault.config', JSON.stringify(configFile, null, 2));
    callback(null);
  };

  var generateReporterConfigFiles = function(callback) {
    var configFile;
    configFile = require('./reporter_config_template.json');

    for (var i in createdDroplets) {
      if (createdDroplets[i]) {
        var currentIP = createdDroplets[i].networks.v4[0].ip_address;
        configFile.msg_to_send = 'Message from ' + currentIP;
        configFile.output_report_path = '/home/qa/reporter_log_' + currentIP + '.json';
        fs.mkdirSync(config.outFolder + '/scp/' + currentIP);
        fs.writeFileSync(config.outFolder + '/scp/' + currentIP + '/reporter.json',
            JSON.stringify(configFile, null, 2));
        fse.copySync(config.outFolder + '/scp/reporter.crust.config',
            config.outFolder + '/scp/' + currentIP + '/reporter.crust.config');
      }
    }
    callback(null);
  };

  var generateTeamocilSettingsFiles = function(callback) {
    var TMUX_CMD_KEY = 'tmuxCommand';
    if (!libraryConfig.hasOwnProperty(TMUX_CMD_KEY)) {
      return callback('Missing tmuxCommand in config.json');
    }
    var buff = fs.readFileSync('./teamocil_template.yml');
    var generatedFile = buff.toString();
    generatedFile = generatedFile.replace('%TMUX_CMD%', libraryConfig[TMUX_CMD_KEY]);
    if (binaryName === 'reporter') {
      for (var j in createdDroplets) {
        if (createdDroplets[j]) {
          fs.writeFileSync(config.outFolder + '/scp/' + createdDroplets[j].networks.v4[0].ip_address + '/settings.yml',
              generatedFile);
        }
      }
    } else {
      fs.writeFileSync(config.outFolder + '/scp/settings.yml', generatedFile);
    }
    callback(null);
  };

  var generateLogFile = function(callback) {
    fse.copySync('./log_template.toml', config.outFolder + '/scp/log.toml');
    callback(null);
  };

  var copyBinary = function(callback) {
    if (binaryName === 'reporter') {
      for (var i in createdDroplets) {
        if (createdDroplets[i]) {
          fse.copySync(binaryPath + binaryName,
              config.outFolder + '/scp/' + createdDroplets[i].networks.v4[0].ip_address + '/' + binaryName);
        }
      }
      callback(null);
    } else {
      fse.copySync(binaryPath + binaryName, config.outFolder + '/scp/' + binaryName);
      callback(null);
    }
  };

  var transferFiles = function(callback) {
    if (config.testMode) {
      console.log('Skipping SCP in test mode');
      callback(null);
      return;
    }

    console.log('Clearing old files from droplet file host.');
    var pattern = auth.getUserName() + '-' + selectedLibraryKey;
    var sshCommand = nodeUtil.format('rm -rf /var/www/html/%s ;', pattern);
    sshCommand += nodeUtil.format('mkdir /var/www/html/%s', pattern);
    var request = generateSSHRequests([ config.dropletFileHost ], sshCommand);
    async.series(request, function(err) {
      if (err) {
        console.log('Failed clearing up droplet file host.\n');
        return callback(err);
      }

      console.log('Transferring new files');
      var scpOptions = makeSSHOptions(config.dropletFileHost, config);
      scpOptions.path = nodeUtil.format('/var/www/html/%s/', pattern);
      scpClient.scp(config.outFolder + '/scp/', scpOptions, function(err) {
        if (!err) {
          console.log('File transfer completed successfully.\n');
          return callback(null);
        }

        console.log('SCP Transfer failed.');
        return callback(err);
      });
    });
  };

  var startTmuxSession = function(callback) {
    var dropletIps = utils.getDropletIps(createdDroplets);
    var pattern = auth.getUserName() + '-' + selectedLibraryKey;
    var firstNodeOnlyCommand = 'touch ~/IS_FIRST_NODE && ';
    var otherNodeOnlyCommand = 'rm ~/IS_FIRST_NODE; ';
    var normalNodeCommands = nodeUtil.format('wget -r -nH -nd -np -R index.html* http://%s/%s/ && ',
      config.dropletFileHost, pattern);
    normalNodeCommands += nodeUtil.format('chmod +x %s && ', binaryName);
    normalNodeCommands += 'mv ~/settings.yml ~/.teamocil/ && ';
    normalNodeCommands += (config.provider !== 'vultr' ? '. ~/.bash_profile && ' : '');
    normalNodeCommands += 'teamocil settings';
    var tmuxBaseCommand = 'tmux new-session -d \"%s\"';
    var tmuxFirstNodeCommands = nodeUtil.format(tmuxBaseCommand, firstNodeOnlyCommand + normalNodeCommands);
    var tmuxOtherNodeCommands = nodeUtil.format(tmuxBaseCommand, otherNodeOnlyCommand + normalNodeCommands);

    var firstNodeGrepCommand = 'grep \"Started a new network as a seed node\" Node.log';

    var firstNodeIp = dropletIps.splice(0, 1)[0];
    var firstNodeRequest = generateSSHRequests([ firstNodeIp ], tmuxFirstNodeCommands)[0];
    var normalRequests = generateSSHRequests(dropletIps, tmuxOtherNodeCommands);

    var WaitForNodeToStart = function(node, grepCommand) {
      this.run = function(callback) {
        // Suppress waiting for grep messages when running crust examples
        if (selectedLibraryKey.toLowerCase().indexOf('crust') > -1) {
          return callback(null);
        }
        generateSSHRequests([ node ], grepCommand)[0](function(err, data) {
          if (err) {
            return callback(err);
          }
          if (!data) {
            return setTimeout(function() {
              new WaitForNodeToStart(node, grepCommand)(callback);
            }, 10000);
          }
          return callback(null);
        });
      };

      return this.run;
    };

    var onFirstSeedStarted = function(err) {
      if (err) {
        throw 'First seed node failed to start ' + err;
      }

      console.log('Started first Node.');
      console.log('Starting remaining nodes in parallel');
      async.parallelLimit(normalRequests, 20, function(err) {
        if (!err) {
          console.log('All droplet nodes started.\n');
          return callback(null);
        }
        console.log('Failed starting remaining nodes.');
        callback(err);
      });
    };

    console.log('Starting first Node.');
    firstNodeRequest(function(err) {
      if (err) {
        console.log('First seed node failed to start');
        throw err;
      }
      new WaitForNodeToStart(firstNodeIp, firstNodeGrepCommand)(onFirstSeedStarted);
    });
  };

  var printResult = function(callback) {
    console.log('\n');
    var table = new Table({
      head: [ 'Droplet Name', 'SSH Command' ],
      colWidths: [ 40, 105 ]
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

  var getSnapshotRegions = function(callback) {
    var snapshotId = PROVIDER_DETAILS.snapshotId;
    if (!snapshotId) {
      throw 'snapshotId not found in the config file';
    }
    cloudProvider.getImage(snapshotId, function(err, res) {
      if (err) {
        return callback(err);
      }
      snapshotRegions = res.image.regions;
      callback();
    });
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
    binaryName = (libraryConfig.hasOwnProperty('example') ? libraryConfig.example : libraryConfig.binary) + BINARY_EXT;

    waterfallTasks.push(
        getSnapshotRegions,
        validateUniqueNetwork,
        getRepositoryLocation,
        clone,
        getBuildType,
        build,
        stripBinary,
        getNetworkSize,
        getSeedNodeSize,
        getIsWhitelistedNetwork,
        getListeningPort,
        getNetworkName
    );

    if (binaryName === 'safe_vault') {
      waterfallTasks.push(getInviteKey);
    }

    waterfallTasks.push(
        getNetworkType,
        createDroplets,
        getDroplets,
        setupDroplets,
        SetHostnames,
        clearOutputFolder,
        generateIPListFile,
        genCrustConfFile
    );

    if (binaryName === 'safe_vault') {
      waterfallTasks.push(
        generateVaultConfigFile
      );
    } else if (binaryName === 'reporter') {
      waterfallTasks.push(
          generateReporterConfigFiles
      );
    }

    waterfallTasks.push(
        generateTeamocilSettingsFiles,
        generateLogFile,
        copyBinary,
        transferFiles,
        startTmuxSession,
        printResult
    );

    async.waterfall(waterfallTasks, function(err) {
      if (err) {
        console.error(err);
        return;
      }
      console.log('\nDone - Output folder located at -> ' + path.resolve('./' + config.outFolder) + '\n');
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
        libOptions += (i + '. ' + key.replace(/-.*/g, '') + ' ' + (isExample ? 'Example' : 'Binary') +
        ' - ' + (isExample ? config.libraries[key].example : config.libraries[key].binary) + '\n');
        i++;
      }
    }

    utils.postQuestion('Please choose the entry for which the network is to be set up: ' +
    libOptions, onSetupOptionSelected);
  };

  showSetupOptions();
};
