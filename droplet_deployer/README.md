# droplet_deployer

## Prerequisite

[Nodejs](https://nodejs.org/en/download/) should be installed.

OSX & Win: Use the installer from the above link.

Linux: `sudo apt-get install nodejs npm && sudo ln -s 'which nodejs' /usr/bin/node`
 
## Setting up instruction

Clone the repository and run 'npm install'.

## Usage

'npm start' - Follow the default flow of the tool as listed [here](/script_flow.md)

## TODO
  At present the droplet list from digitalocean fetches maximum of 500 droplets only.
  Implement proper pagination based on the meta data
