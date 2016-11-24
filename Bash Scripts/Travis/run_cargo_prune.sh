#!/bin/bash

cur_ver=`cargo install --list | grep 'prune v' | sed -E 's/.*([0-9]+\.[0-9]+\.[0-9]+).*/\1/g'`

if [ $? -ne 0 ]; then
  # cargo-prune is not installed yet
  cargo install cargo-prune
fi

latest_ver=`curl -s -H "Accept: application/json" -H "Content-Type: application/json" -X GET https://crates.io/api/v1/crates/cargo-prune | sed -E 's/.*"max_version":"([^"]*).*/\1/g'`

if [ "$cur_ver" != "$latest_ver" ]; then
  # Update to latest cargo-prune
  cargo install cargo-prune --force
fi

cargo prune
