#!/bin/bash

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

cargo build --release --verbose
cargo test --release
