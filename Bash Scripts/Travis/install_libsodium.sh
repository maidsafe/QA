#!/bin/bash

LibSodiumVersion=1.0.3

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

wget https://github.com/jedisct1/libsodium/releases/download/$LibSodiumVersion/libsodium-$LibSodiumVersion.tar.gz
tar xfz libsodium-$LibSodiumVersion.tar.gz
cd libsodium-$LibSodiumVersion
./configure --prefix=$HOME/libsodium-$LibSodiumVersion --enable-shared=no --disable-pie
Cores=$((hash nproc 2>/dev/null && nproc) || (hash sysctl 2>/dev/null && sysctl -n hw.ncpu) || echo 1)
make check -j$Cores
make install
export PKG_CONFIG_PATH=$HOME/libsodium-$LibSodiumVersion/lib/pkgconfig:$PKG_CONFIG_PATH
cd ..
