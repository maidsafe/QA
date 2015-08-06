#!/bin/bash

if [[ $# != 1 || "$1" == "-h" || "$1" == "--help" ]]; then
	echo "
This adds all public keys inside the Public Keys folder of this repository to
the ~/.ssh/authorized_keys file of the remote target.

You should pass a single arg to this script which will be the target user and
hostname for the ssh commands.  You must already be able to ssh to the target
without the need for a password.

Example usage:
    ./add_public_keys.sh peer1@peer_prog.maidsafe.net
"
    exit 0;
fi

IFS=$(echo -en "\n\b")
PublicKeysDir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../Public Keys" && pwd)

for File in $PublicKeysDir/*
do
  echo "Processing \"$File\"..."
  echo "$(echo -en "\n")$(cat $File)" | ssh "$1" 'cat >> .ssh/authorized_keys'
done
