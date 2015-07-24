# Install libsodium

Download and unpack a tarball of [libsodium](https://download.libsodium.org/libsodium/releases/)

For v1.0.0 this would be :
```
tar xvfz libsodium-1.0.0.tar.gz
cd libsodium-1.0.0 && ./configure --prefix=/usr && make && sudo make install && cd ..
```
### Additional OS X only steps

Set environment variable `LIBRARY_PATH` to where `libsodium.a` resides :

One way to do this is from a terminal in your home directory update your .profile file.

If it does not exist you may need to create it you can do this by :
```
touch .bash_profile
```
The above assumes you are using a bash shell for other shells this file maybe different for example `.profile`

Edit your profile file with your favourite editor, for example :
```
vim .bash_profile
```

Add the path to where `libsodium.a` typically lives `export LIBRARY_PATH=/usr/local/lib` 

Now save your changes and restart your terminal, to see if your change has worked use :
```
echo $LIBRARY_PATH
```

You should now be good to go





