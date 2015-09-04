#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

cargo build --release --verbose
cargo test --release
cargo build --verbose
cargo test
