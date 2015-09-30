# Install libsodium for Windows

[libsodium](https://github.com/jedisct1/libsodium) is a native dependency of [sodiumoxide](https://github.com/dnaq/sodiumoxide).

Download the appropriate version (32-bit or 64-bit) [prebuilt libsodium static library](https://github.com/maidsafe/QA/tree/master/Dependencies/Windows).

N.B. The path of the folder where libsodium.a will live cannot contain any spaces.

Set environment variable `SODIUM_LIB_DIR` to the folder containing libsodium.a:

```batch
setx SODIUM_LIB_DIR <path-to-libsodium.a-dir>
```

Start a new command-prompt to continue.
