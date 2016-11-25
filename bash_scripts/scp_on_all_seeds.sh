#!/bin/bash

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  echo "
This runs an scp comamnd across each of the seed VMs.

Replace \"scp\" with this script and use the term \"REMOTE\" to represent
the \"qa\" user on the remote endpoint.

Example usage:
Copy the file \"foobar.txt\" from seed VM to local folder
    ./${0##*/} REMOTE:foobar.txt /some/local/dir

Copy the dir \"foo\" from local to seeds' \"bar\" dir
    ./${0##*/} -r foo REMOTE:/some/remote/dir/bar
"
  exit 0;
fi

regex='(.*)REMOTE:(.*)'
# Show commands as they execute
set -x
for peer in 1 2 3 4 5 6; do
  command="scp"
  for var in "$@"; do
    while [[ $var =~ $regex ]]; do
      var="${BASH_REMATCH[1]}qa@seed-$peer.maidsafe.net:${BASH_REMATCH[2]}"
    done
    command="$command $var"
  done
  $command &
done

wait
