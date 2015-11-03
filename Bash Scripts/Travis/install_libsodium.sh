#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

# Set the libsodium version to 1.0.6 if it isn't already set
if [ -z "$LibSodiumVersion" ]; then
  LibSodiumVersion=1.0.6
fi

# Check to see if libsodium dir has been retrieved from cache
if [ ! -d "$HOME/libsodium/$LibSodiumVersion/lib" ]; then
  # If not, build and install it
  rm -rf "$HOME/libsodium"
  mkdir temp
  cd temp
  wget https://github.com/jedisct1/libsodium/releases/download/$LibSodiumVersion/libsodium-$LibSodiumVersion.tar.gz
  tar xfz libsodium-$LibSodiumVersion.tar.gz
  cd libsodium-$LibSodiumVersion
  ./configure --prefix=$HOME/libsodium/$LibSodiumVersion --enable-shared=no --disable-pie
  Cores=$((hash nproc 2>/dev/null && nproc) || (hash sysctl 2>/dev/null && sysctl -n hw.ncpu) || echo 1)
  make check -j$Cores
  make install
  cd ../..
else
  echo "Using cached libsodium directory (version $LibSodiumVersion)";
fi

export PKG_CONFIG_PATH=$HOME/libsodium/$LibSodiumVersion/lib/pkgconfig:$PKG_CONFIG_PATH
