#!/bin/bash

export SODIUM_LIB_DIR=$HOME/libsodium-1.0.8/lib

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

function help {
  echo "
This invokes the 'create_package.sh' script in the SAFE Vault project which
builds the linux packages.  It then copies them to the apt and yum servers.

You should either invoke this script from the root of the safe_vault repo, or
pass a single arg to this script which is the absolute path to the safe_vault
repo.

Ideally, you should be able to ssh to the apt and yum servers without the need
for a password.

Example usage:
    ./${0##*/} \"/home/maidsafe/safe_vault\"
"
  exit 0;
}

# Handle help arg
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  help
fi

# Set path to script in safe_vault repo
if [[ "$#" -eq 1 ]]; then
  VaultRoot="$1"
else
  VaultRoot=$(pwd)
fi
CreatePackageScript="$VaultRoot/installer/linux/create_packages.sh"

# Check the repo path contains the expected script
if [[ "$#" -gt 1 || ! -x "$CreatePackageScript" ]]; then
  help
fi

# Invoke the script and scp the resulting packages
"$CreatePackageScript"
ssh apt-alpha.maidsafe.net 'mkdir -p ~/systemd/ && mkdir -p ~/SysV-style/'
ssh yum-alpha.maidsafe.net 'mkdir -p ~/systemd/ && mkdir -p ~/SysV-style/'
scp "$VaultRoot"/packages/linux/safe_vault_*.tar.gz apt-alpha.maidsafe.net:~/ &
scp "$VaultRoot"/packages/linux/systemd/safe*.deb apt-alpha.maidsafe.net:~/systemd/ &
scp "$VaultRoot"/packages/linux/SysV-style/safe*.deb apt-alpha.maidsafe.net:~/SysV-style/ &
scp "$VaultRoot"/packages/linux/systemd/safe*.rpm yum-alpha.maidsafe.net:~/systemd/ &
scp "$VaultRoot"/packages/linux/SysV-style/safe*.rpm yum-alpha.maidsafe.net:~/SysV-style/ &

wait

