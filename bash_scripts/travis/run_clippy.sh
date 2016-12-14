#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

if [[ $TRAVIS_RUST_VERSION = nightly ]]; then
  # Only run clippy on Linux
  if [[ ! $TRAVIS_OS_NAME = linux ]]; then
    exit 0
  fi
  # Use the Rust and Clippy versions as documented in:
  # https://github.com/maidsafe/QA/blob/master/Documentation/Rust%20Style.md
  sh ~/rust-installer/rustup.sh --prefix=~/rust --spec=nightly-2016-11-17 -y --disable-sudo
  rustc --version
  # To ignore this failure, set `allow_failures` in build matrix for nightly builds
  cargo rustc --features clippy -- --test -Zno-trans
  for Feature in $Features; do
    cargo rustc --features "clippy $Feature" -- --test -Zno-trans
  done
fi

# Hide expanded commands while running
set +x
