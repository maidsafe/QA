#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

# We only want to deploy the docs and run coverage if it's a pull request to 'master' and only on
# the first job number in the Travis matrix.  This should be a Linux run.
if [[ ! $TRAVIS_OS_NAME = linux ]] || [[ ${TRAVIS_JOB_NUMBER##*.} -ne 1 ]] ||
   [[ ! $TRAVIS_BRANCH = master ]] || [[ ! $TRAVIS_PULL_REQUEST = false ]]; then
  exit 0
fi

curl -sSL https://github.com/maidsafe/QA/raw/master/Bash%20Scripts/Travis/deploy_docs.sh | bash
curl -sSL https://github.com/maidsafe/QA/raw/master/Bash%20Scripts/Travis/run_coverage.sh | bash
