#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

# Set the elfutils version if it isn't already set
if [ -z "$ElfUtilsVersion" ]; then
  ElfUtilsVersion=0.164
fi

cd $HOME

# Check to see if elfutils dir has been retrieved from cache
ElfUtilsInstallPath=$HOME/elfutils-$ElfUtilsVersion
Cores=$((hash nproc 2>/dev/null && nproc) || (hash sysctl 2>/dev/null && sysctl -n hw.ncpu) || echo 1)
if [ ! -d "$ElfUtilsInstallPath/lib" ]; then
  # If not, build and install it
  mkdir -p temp
  cd temp
  wget https://fedorahosted.org/releases/e/l/elfutils/$ElfUtilsVersion/elfutils-$ElfUtilsVersion.tar.bz2
  tar jxf elfutils-$ElfUtilsVersion.tar.bz2
  cd elfutils-$ElfUtilsVersion
  ./configure --prefix=$ElfUtilsInstallPath
  make check -j$Cores
  make install
else
  echo "Using cached elfutils directory."
fi
export LD_LIBRARY_PATH=$ElfUtilsInstallPath/lib:$LD_LIBRARY_PATH

cd $HOME

# Build and install kcov (which is fast and not versioned, so there's little point in caching it)
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
