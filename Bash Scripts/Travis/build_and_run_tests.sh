#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

if [ ! -z "$Features" ]; then
  WithFeatures=" --features $Features"
fi

cd $TRAVIS_BUILD_DIR
cargo build --release --verbose $WithFeatures
cargo test --release $WithFeatures
