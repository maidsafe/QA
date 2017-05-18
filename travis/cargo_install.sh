#!/bin/bash

#This script takes an argument for cargo package name and an optional one for version. It will check for the presence of the same version as specified or the latest if not specified and will install the package if needed.

if [ -z "$1" ]; then
  echo "Missing package name"
  exit 1
fi

pkg_name=$1
alt_pkg_name=${pkg_name/cargo-/}

if [ -z "$2" ]; then
  version=$(curl -s "https://crates.io/api/v1/crates/$pkg_name/versions" |
            python -c "import sys, json; print json.load(sys.stdin)['versions'][0]['num']")
else
  version=$2
fi

if ! (cargo "$pkg_name" --version 2>/dev/null ;
      cargo "$alt_pkg_name" --version 2>/dev/null ;
      "$alt_pkg_name" --version 2>/dev/null) | grep -q "$version"; then
  cargo install "$pkg_name" --vers="$version" --force;
fi
