#!/bin/bash

if [[ $# != 1 || "$1" == "-h" || "$1" == "--help" ]]; then
	echo "
This executes a single command on each of the seed VMs.
You should pass a single arg to this script which will be the command
to execute.  It can't require user-input on the remote machine.

Example usage:
    ./execute_command_on_all_seeds.sh \"ls -laG\"
"
    exit 0;
fi

for peer in 1 2 3 4 5 6; do
    # Show commands as they execute
    set -x
    ssh seed-$peer.maidsafe.net "$1"
    set +x
done
