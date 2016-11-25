#!/bin/bash

IpList=ip_list

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  echo "
This tries to scp /home/qa/Node.log from each of the entered IPs.  The remote
IPs should be a space-separated list in a file called \"$IpList\" in the current
working directory (i.e. where you run this script from - not necessarily the
folder containing this script).

The logfiles will each be renamed to include the nodes' index numbers, e.g.
Node 1's logfile will be renamed from Node.log to Node001.log.  The files will
be copied to the current working directory.

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
Count=1
for Peer in $IPs; do
  printf -v Command "scp -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no qa@$Peer:~/Node.log Node%03d.log" $Count
  # Show commands as they execute
  set -x
  $Command
  set +x
  ((++Count))
done
