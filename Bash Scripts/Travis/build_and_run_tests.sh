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
  # Don't make a Clippy failure result in overall failure for now
  cargo test --no-run --features clippy || true
  for Feature in $Features; do
    cargo test --no-run --features "clippy $Feature" || true
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
  else
    # We currently don't run the default tests if there are any features
    cargo test --release --verbose --no-run
  fi
fi
