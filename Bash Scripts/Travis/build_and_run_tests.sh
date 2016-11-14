#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

cd $TRAVIS_BUILD_DIR

RUST_BACKTRACE=1
export RUST_BACKTRACE

if [[ $TRAVIS_RUST_VERSION = nightly ]]; then
  # To ignore this failure, set `allow_failures` in build matrix for nightly builds
  cargo test --no-run --features clippy
  for Feature in $Features; do
    cargo test --no-run --features "clippy $Feature"
  done
else
  # Run the tests for each feature
  for Feature in $Features; do
    cargo build --release --verbose --features $Feature
    cargo test --release --features $Feature
  done
  if [ -z "$Features" ]; then
    # There are no features, so run the default test suite
    cargo build --release --verbose
    cargo test --release
  elif [[ $TRAVIS_OS_NAME = linux ]]; then
    # We currently don't run the default tests if there are any features
    cargo test --release --verbose --no-run
  fi
fi
