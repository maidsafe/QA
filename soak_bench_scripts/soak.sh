#!/bin/bash

# Cargo operations, including removing artifcats from previous builds and building the binary needed for the soak testing
# Git pull to ensure code is up to date
# Output to log.log
LOGFILE="/home/maidsafe/Projects/parsec/log.log"

cargo clean | tee $LOGFILE
git pull | tee -a $LOGFILE
cargo update | tee -a $LOGFILE
cargo test --release --features=testing | tee -a $LOGFILE

#remove the build artefact file with same name as integration test we want:
rm target/release/integration_tests-*.d

printf "Starting soak tests...\n"

# Running fromm parsec folder - will need full path
# This command will loop the test forever until it hits an error
loop -q target/release/integration_tests-* | tee -a $LOGFILE
