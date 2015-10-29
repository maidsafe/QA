#!/bin/bash

IpList=ip_list

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  echo "
This runs an scp command across each of the entered IPs.  The remote IPs should
be a space-separated list in a file called \"$IpList\" in the current working
directory (i.e. where you run this script from - not necessarily the folder
containing this script).

Replace \"scp\" with this script and use the term \"REMOTE\" to represent the \"qa\"
user on the remote endpoint.

To avoid having to confirm each IP's identity, you can pass the args:
    -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no

Example usage:
Copy the dir \"foo\" from local to remote IP's \"bar\" dir
    ./${0##*/} -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -r foo REMOTE:/some/remote/dir/bar

Copy the file \"log*.txt\" from remote IP to local folder
    ./${0##*/} REMOTE:log*.txt /some/local/dir


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
regex='(.*)REMOTE:(.*)'
for peer in $IPs; do
  command="scp"
  for var in "$@"; do
    while [[ $var =~ $regex ]]; do
      var="${BASH_REMATCH[1]}qa@$peer:${BASH_REMATCH[2]}"
    done
    command="$command $var"
  done
  # Show commands as they execute
  set -x
  $command
  set +x
done
