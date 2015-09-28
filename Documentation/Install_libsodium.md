# Install libsodium

[libsodium](https://github.com/jedisct1/libsodium) is a native dependency of [sodiumoxide](https://github.com/dnaq/sodiumoxide).

### For Windows

Download the appropriate version (32-bit or 64-bit) [prebuilt libsodium static library](https://github.com/maidsafe/QA/tree/master/Dependencies/Windows).

N.B. The path of the folder where libsodium.a will live cannot contain any spaces.

Set environment variable `SODIUM_LIB_DIR` to the folder containing libsodium.a:

```batch
setx SODIUM_LIB_DIR <path-to-libsodium.a-dir>
```

Start a new command-prompt to continue.

### For OS X / Linux

Download, unpack the most recent tarball of [libsodium](https://download.libsodium.org/libsodium/releases/), build the static variant and install to "/usr/local/":

```bash
LibSodiumVersion=1.0.3
mkdir temp
cd temp
wget https://github.com/jedisct1/libsodium/releases/download/$LibSodiumVersion/libsodium-$LibSodiumVersion.tar.gz
tar xfz libsodium-$LibSodiumVersion.tar.gz
cd libsodium-$LibSodiumVersion
./configure --enable-shared=no --disable-pie
Cores=$((hash nproc 2>/dev/null && nproc) || (hash sysctl 2>/dev/null && sysctl -n hw.ncpu) || echo 1)
make check -j$Cores
sudo make install
```

Set environment variable `SODIUM_LIB_DIR` to the folder containing libsodium.a:

```bash
export SODIUM_LIB_DIR=/usr/local/lib
```

You can make this a permanent environment variable by adding this export command to your OS / shell specific .profile config file (e.g. `~/.bashrc`, `~/.bash_profile`).

If you wish to do this system wide on Ubuntu for example you could update `/etc/environment`.
