#!/bin/bash
set -e
wget https://github.com/jedisct1/libsodium/releases/download/1.0.3/libsodium-1.0.3.tar.gz
tar xvfz libsodium-1.0.3.tar.gz
cd libsodium-1.0.3
./configure --prefix=/usr --enable-shared=no
CORES=$(nproc)
make check -j$CORES
sudo make install
