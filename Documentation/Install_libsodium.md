# Install libsodium

`libsodium` is a native dependency for [sodiumxoide](https://github.com/dnaq/sodiumoxide). Install sodium by following the instructions [here](http://doc.libsodium.org/installation/index.html).

**For Windows:**

Download [prebuilt libsodium library](https://download.libsodium.org/libsodium/releases/libsodium-1.0.3-mingw.tar.gz)

Extract `libsodium.a` for x86/x64 from the corresponding folder in the archive to your local filesystem

Add this local path to `%SODIUM_LIB_DIR%` (`setx SODIUM_LIB_DIR <path-to-extracted-libsodium.a-dir>`).
Restarting the command-prompt maybe necessary after this.

**For OS X / Linux:**

Download, unpack the tarball of [libsodium](https://download.libsodium.org/libsodium/releases/) and [install](https://download.libsodium.org/doc/installation/index.html)

Set environment variable `SODIUM_LIB_DIR` to where `libsodium.a` resides :

One way to do this is from a terminal, for example if you downloaded the tarball and extracted it in your $HOME directory:
```
export SODIUM_LIB_DIR=$HOME/libsodium-1.0.3/lib
```
Or update your OS / shell specific .profile config file, such as `~/.bashrc`, `~/.bash_profile` if you are using bash
If you wish to do this system wide on Ubuntu for example you can update `/etc/environment`

For example edit your profile file with your favourite editor, for example :
```
vim .bash_profile
```

Add the path to where `libsodium.a` typically lives `export SODIUM_LIB_DIR=<path-to-libsodium.a-dir>` 

Now save your changes and restart your terminal, to see if your change has worked use :
```
echo $SODIUM_LIB_DIR
```

You should now be good to go

