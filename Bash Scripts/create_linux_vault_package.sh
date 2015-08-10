#!/bin/bash

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

function help {
  echo "
This invokes the 'create_package.sh' script in the SAFE Vault project which
builds the linux packages.  It then copies them to the apt server.

You should either invoke this script from the root of the safe_vault repo, or
pass a single arg to this script which is the absolute path to the safe_vault
repo.

You must be able to ssh to the apt server without the need for a password.

Example usage:
    ./${0##*/} \"/home/me/SuperProject/SAFE Vault\"
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
CreatePackageScript="$VaultRoot/installer/linux/scripts/create_packages.sh"

# Check the repo path contains the expected script
if [[ "$#" -gt 1 || ! -x "$CreatePackageScript" ]]; then
  help
fi

# Invoke the script and scp the resulting packages
"$CreatePackageScript"
ssh apt.maidsafe.net 'mkdir -p ~/systemd/ && mkdir -p ~/SysV-style/'
scp "$VaultRoot"/packages/linux/safe_vault_*.tar apt.maidsafe.net:~/
scp "$VaultRoot"/packages/linux/systemd/safe* apt.maidsafe.net:~/systemd/
scp "$VaultRoot"/packages/linux/SysV-style/safe* apt.maidsafe.net:~/SysV-style/
