# droplet_deployer

Simple nodejs tool to build and deploy SAFE network binaries to DigitalOcean droplets for tests

## Limitation

Linux only (DigitalOcean only supports Linux)

## Prerequisite

[Nodejs](https://nodejs.org/en/download/) should be installed.

Linux:

```
sudo apt-get install nodejs npm
sudo ln -s `which nodejs` /usr/bin/node
```

To build the nodes, libsodium is also required. Follow the instructions
[here](../Documentation/Install%20libsodium%20for%20OS%20X%20or%20Linux.md) to
link it statically.

## Setting up

run `npm install`

## Usage

`npm start` - Follow the default flow of the tool as listed [here](script_flow.md)

## Configs

There is `config.json` file which allows you to tweek somer of the droplet
deployer parameters.

* `dropletSshPrivKeyPath` - full path to the private key used for SSH
  connection. If not specified, username/password authentication will be used.
  Example: "/home/povilas/.ssh/id_rsa"
* `digitalOceanToken` - basically what it says on the tin: use the give token
  for digital ocean API authentication. If this value is not specified, it will
  be retrieved from `auth_repo`.
  Example: "a2e053aea17b84085a794c77005aa0726a418bfc18b4e1550d36abc6d14cacab"

## TODO
  At present the droplet list from digitalocean fetches maximum of 500 droplets only.
  Implement proper pagination based on the meta data
