// TODO try to replace with digitalocean.node package from npm

var Api = function(token, testMode) {
  var Vultr = require('vultr');
  var vultr = new Vultr(token);

  if (testMode) {
    throw new Error('Test mode is not supported for Vultr integration');
  }

  this.getAvaliableRegions = function(callback) {
    vultr.regions.list().then(function(list) {
      // TODO display and then grep
      var regList = [];
      for (var region in list) {
        if (region.hasOwnProperty('DCID')) {
          // regList.push(region.DCID + ' - ' + region.name);
          regList.push(region.DCID);
        }
      }
      callback(null, regList);
    });
  };

  this.createDroplet = function(name, region, size, image, sshKeys, callback) {
    vultr.server.create({
      'region': region,
      'plan': 201,
      'os': 164,
      'snapshot': image,
      'enable_ipv6': 'no',
      'label': name,
      'hostname': name,
      'sshkey': sshKeys.join(','),
      'auto_backups': 'no'
    }).then(function(server, err) {
      if (err) {
        console.log(err);
        throw err;
      }
      callback(null, server.SUBID);
    });
  };

  this.getDroplet = function(id, callback) {
    vultr.server.list().then(function(list) {
      for (var server in list) {
        if (list.hasOwnProperty(server)) {
          if (list[server].SUBID === id) {
            var updatedEntry = list[server];
            updatedEntry.id = list[server].SUBID;
            updatedEntry.name = list[server].label;
            /*jshint camelcase: false */
            updatedEntry.networks = {
              v4: [ { ip_address: list[server].main_ip } ]
            };
            /*jshint camelcase: true */
            return callback(null, updatedEntry);
          }
        }
      }
      callback('Not found');
    });
  };

  this.getDropletList = function(callback) {
    vultr.server.list().then(function(list) {
      var updatedList = [];
      for (var server in list) {
        if (list.hasOwnProperty(server)) {
          var updatedEntry = list[server];
          updatedEntry.id = list[server].SUBID;
          updatedEntry.name = list[server].label;
          /*jshint camelcase: false */
          updatedEntry.networks = { v4: [ { ip_address: list[server].main_ip } ] };
          /*jshint camelcase: true */
          updatedList.push(updatedEntry);
        }
      }
      callback(null, updatedList);
    });
  };

  this.deleteDroplet = function(id, callback) {
    vultr.server.destroy(id).then(function() {
      callback(null);
    });
  };

  this.getImage = function(id, callback) {
    this.getAvaliableRegions(function(err, regions) {
      callback(null, { image: { regions: regions } });
    });
  };

  return this;
};

exports.Api = Api;
