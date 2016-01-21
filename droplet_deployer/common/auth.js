/*jshint camelcase: false */
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Provides API related to auth validation
 * Cleanup of cloned repos
 * @constructor
 */
var AuthManager = function() {
  var async = require('async');
  var exec = require('child_process').exec;
  var config = require('../config.json');
  var CLONED_REPO_NAME = 'qa_repo';
  var TOKEN_KEY = 'digitalOceanToken';
  var PASSWORD_KEY = 'dropletUserPassword';

  var userName;
  var credentials = {};

  var getGitUser = function(callback) {
    exec('git config --global user.name', function(err, stdout) {
      if (err) {
        callback(err);
        return;
      }
      userName = stdout.trim().replace(/[\W_]+/g, '-');
      return userName ? callback(null) : callback('git config --global user.name is not configured');
    });
  };

  var cloneRepo = function(callback) {
    exec('git clone ' + config.auth_repo + ' ' + config.workspace + '/' +
      CLONED_REPO_NAME + ' --depth 1', function(err) {
      if (err) {
        callback(err);
        return;
      }
      credentials = require('../' + config.workspace + '/' + CLONED_REPO_NAME + '/credentials');
      callback(null);
    });
  };

  var deleteRepo = function(callback) {
    var path = require('path');
    require('./utils').deleteFolderRecursive(path.resolve(config.workspace + '/' + CLONED_REPO_NAME));
    callback(null);
  };

  this.init = function(callback) {
    async.waterfall([
      deleteRepo,
      getGitUser,
      cloneRepo,
      deleteRepo
    ], callback);
  };

  this.getUserName = function() {
    return userName;
  };

  this.getDigitalOceanToken = function() {
    return (config.hasOwnProperty(TOKEN_KEY) ? config : credentials)[TOKEN_KEY];
  };

  this.getDopletUserPassword = function() {
    return (credentials.hasOwnProperty(PASSWORD_KEY) ? credentials : config)[PASSWORD_KEY];
  };

  return this;
};

exports = module.exports = new AuthManager();
