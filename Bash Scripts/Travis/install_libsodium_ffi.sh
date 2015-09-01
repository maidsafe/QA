#!/bin/bash
wget https://github.com/jedisct1/libsodium/releases/download/1.0.3/libsodium-1.0.3.tar.gz
tar xvfz libsodium-1.0.3.tar.gz
cd libsodium-1.0.3
./configure --prefix=$HOME/libsodium-1.0.3
make check
make install
export LD_LIBRARY_PATH=/home/travis/libsodium-1.0.3/lib:$LD_LIBRARY_PATH
cd ..
