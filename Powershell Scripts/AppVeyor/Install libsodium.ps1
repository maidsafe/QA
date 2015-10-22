Start-FileDownload "https://github.com/maidsafe/QA/raw/master/Dependencies/Windows/$env:platform/libsodium.a";
$env:SODIUM_LIB_DIR = Resolve-Path .
