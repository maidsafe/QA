#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

# We only need elfutils to run coverage, and this only happens if it's a pull request to 'master'
# and only on the first job number in the Travis matrix.  This should be a Linux run.
if [[ $TRAVIS_OS_NAME = linux ]] && [[ ${TRAVIS_JOB_NUMBER##*.} -eq 1 ]] &&
   [[ $TRAVIS_BRANCH = master ]] && [[ $TRAVIS_PULL_REQUEST = false ]]; then

  # Set the elfutils version if it isn't already set
  if [ -z "$ElfUtilsVersion" ]; then
    ElfUtilsVersion=0.164
  fi

  # Check to see if elfutils dir has been retrieved from cache
  ElfUtilsInstallPath=$HOME/elfutils/$ElfUtilsVersion
  Cores=$((hash nproc 2>/dev/null && nproc) || (hash sysctl 2>/dev/null && sysctl -n hw.ncpu) || echo 1)
  if [ ! -d "$ElfUtilsInstallPath/lib" ]; then
    # If not, build and install it
    cd $HOME
    rm -rf elfutils
    mkdir -p temp
    cd temp
    wget https://fedorahosted.org/releases/e/l/elfutils/$ElfUtilsVersion/elfutils-$ElfUtilsVersion.tar.bz2
    tar jxf elfutils-$ElfUtilsVersion.tar.bz2
    cd elfutils-$ElfUtilsVersion
    ./configure --prefix=$ElfUtilsInstallPath
    make check -j$Cores
    make install
  else
    echo "Using cached elfutils directory (version $ElfUtilsVersion)"
  fi

  export LD_LIBRARY_PATH=$ElfUtilsInstallPath/lib:$LD_LIBRARY_PATH
  export ElfUtilsInstallPath=$ElfUtilsInstallPath

fi
