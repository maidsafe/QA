#!/bin/bash
wget https://github.com/jedisct1/libsodium/releases/download/1.0.0/libsodium-1.0.0.tar.gz
tar xvfz libsodium-1.0.0.tar.gz
cd libsodium-1.0.0
./configure --prefix=$HOME/libsodium-1.0.0
make check
make install
cd ..
