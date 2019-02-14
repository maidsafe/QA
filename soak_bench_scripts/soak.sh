#!/bin/bash

# Cargo operations, including removing artifcats from previous builds and building the binary needed for the soak testing
# Git pull to ensure code is up to date
# Output to log.log
cargo clean
git pull
cargo update
cargo test --release --features=testing

#remove the build artefact file with same name as integration test we want:
rm target/release/integration_tests-*.d

echo "Starting soak tests..."

#running fromm parsec folder - will need full path
#this command will loop the test forever until it hits an error
loop -q target/release/integration_tests-* | tee /home/maidsafe/Projects/parsec/log.log 2>&1
