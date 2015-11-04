#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

# Build and install kcov (which is fast and not versioned, so there's little point in caching it)
cd $HOME
mkdir -p temp
cd temp
wget https://github.com/SimonKagstrom/kcov/archive/master.tar.gz
tar xzf master.tar.gz
cmake -Bbuild_kcov -Hkcov-master -DCMAKE_INSTALL_PREFIX=$HOME/ -DCMAKE_BUILD_TYPE=Release -DCMAKE_INCLUDE_PATH="$ElfUtilsInstallPath/include" -DCMAKE_LIBRARY_PATH="$ElfUtilsInstallPath/lib"
cd build_kcov
make -j$Cores
make install

# Build the project's tests and run them under kcov
if [ ! -z "$Features" ]; then
  WithFeatures=" --features $Features"
fi
cd $TRAVIS_BUILD_DIR
cargo test --no-run $WithFeatures
ProjectName=${TRAVIS_REPO_SLUG##*/};
$HOME/bin/kcov --coveralls-id=$TRAVIS_JOB_ID --include-path=src target/kcov target/debug/$ProjectName-*
