#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

cd $TRAVIS_BUILD_DIR

if [[ $TRAVIS_RUST_VERSION = nightly ]]; then
  # Don't make a Clippy failure result in overall failure for now
  cargo test --no-run --features clippy || true
  if [ ! -z "$Features" ]; then
    cargo test --no-run --features clippy $Features || true
  fi
else
  if [ ! -z "$Features" ]; then
    WithFeatures=" --features $Features"
  fi
  cargo build --release --verbose $WithFeatures
  cargo test --release $WithFeatures
fi
