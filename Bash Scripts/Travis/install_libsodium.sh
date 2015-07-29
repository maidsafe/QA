#!/bin/bash
set -e
wget https://github.com/jedisct1/libsodium/releases/download/1.0.3/libsodium-1.0.3.tar.gz
tar xvfz libsodium-1.0.3.tar.gz
cd libsodium-1.0.3
./configure --prefix=$HOME/libsodium-1.0.3 --enable-shared=no
CORES=$(nproc)
make check -j$CORES
make install
export LIBRARY_PATH=$LIBRARY_PATH:$HOME/libsodium-1.0.3/lib
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$HOME/libsodium-1.0.3/lib
cd ..
