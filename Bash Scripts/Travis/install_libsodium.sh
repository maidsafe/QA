#!/bin/bash
set -e
wget https://github.com/jedisct1/libsodium/releases/download/1.0.0/libsodium-1.0.0.tar.gz
tar xvfz libsodium-1.0.0.tar.gz
cd libsodium-1.0.0
./configure --prefix=$HOME/libsodium-1.0.0
make check
make install
ln -s libsodium.so.13.2.0 libsodium.so.13
ln -s libsodium.so.13.2.0 libsodium.so
export LIBRARY_PATH=$LIBRARY_PATH:$HOME/libsodium-1.0.0/lib
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$HOME/libsodium-1.0.0/lib
cd ..
