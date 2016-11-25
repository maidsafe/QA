#!/bin/bash

IpList=ip_list

if [[ $# != 1 || "$1" == "-h" || "$1" == "--help" ]]; then
  echo "
This executes a single command on each of the entered IPs.  The remote IPs
should be a space-separated list in a file called \"$IpList\" in the current
working directory (i.e. where you run this script from - not necessarily the
folder containing this script).

The command will be executed as the \"qa\" user on the remote machine.

You should pass a single arg to this script which will be the command
to execute.  It can't require user-input on the remote machine.

Example usage:
    ./${0##*/} \"ls -laG\"
"
  exit 0;
fi

if [ ! -f $IpList ]; then
    echo "
This script requires a space-separated list of IPs to exist in a file called
\"$IpList\" in the current working directory.

For further info, run this script with '--help'
"
    exit 1
fi

IPs=`cat $IpList`
for peer in $IPs; do
  # Show commands as they execute
  set -x
  ssh qa@$peer "$1"
  set +x
done
