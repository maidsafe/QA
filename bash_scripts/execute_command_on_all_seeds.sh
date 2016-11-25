#!/bin/bash

if [[ $# != 1 || "$1" == "-h" || "$1" == "--help" ]]; then
  echo "
This executes a single command on each of the seed VMs as the \"qa\" user.
You should pass a single arg to this script which will be the command
to execute.  It can't require user-input on the remote machine.

Example usage:
    ./${0##*/} \"ls -laG\"
"
  exit 0;
fi

# Show commands as they execute
set -x

for peer in 1 2 3 4 5 6; do
  ssh qa@seed-$peer.maidsafe.net "$1" &
done

wait
