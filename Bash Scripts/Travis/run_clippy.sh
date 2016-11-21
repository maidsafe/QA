#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

cd $TRAVIS_BUILD_DIR

if [[ $TRAVIS_RUST_VERSION = nightly ]]; then
  # Only run clippy on Linux
  if [[ ! $TRAVIS_OS_NAME = linux ]]; then
    exit 0
  fi
  # To ignore this failure, set `allow_failures` in build matrix for nightly builds
  cargo rustc --features clippy -- --test -Zno-trans
  for Feature in $Features; do
    cargo rustc --features "clippy $Feature" -- --test -Zno-trans
  done
fi
