#!/bin/bash
wget https://github.com/jedisct1/libsodium/releases/download/1.0.3/libsodium-1.0.3.tar.gz
tar xvfz libsodium-1.0.3.tar.gz
cd libsodium-1.0.3
./configure --prefix=$HOME/libsodium-1.0.3 --enable-shared=no --disable-pie
make check
make install
export PKG_CONFIG_PATH=$HOME/libsodium-1.0.3/lib/pkgconfig:$PKG_CONFIG_PATH
cd ..
