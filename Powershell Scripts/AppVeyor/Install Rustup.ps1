# Determine the appropriate arch to install
if ($env:PLATFORM -eq "x86") {
    $env:Path = "C:\msys64\mingw32\bin;C:\msys64\usr\bin;" + $env:Path
    $arch = "i686"
} else {
    $env:Path = "C:\msys64\mingw64\bin;C:\msys64\usr\bin;" + $env:Path
    $arch = "x86_64"
}

# Install gcc if required
bash -lc "pacman -S --noconfirm --needed mingw-w64-$arch-gcc"

# Download Rust installer
$url = "https://static.rust-lang.org/rustup/dist/$arch-pc-windows-gnu/rustup-init.exe"
$installer = $env:TEMP + "\rustup-init.exe"
(New-Object System.Net.WebClient).DownloadFile($url, $installer)

# Run installer
$installer = $installer.Replace("\", "/")
bash -lc "$installer -y --default-host $arch-pc-windows-gnu"

# Add rustup to path
$env:Path = $env:USERPROFILE + "\.cargo\bin;" + $env:Path

# Install nightly
rustup update nightly

"Rust version:"
""
rustc -vV
if (!$?) {
    exit 99
}
""
""

"Cargo version:"
""
cargo -V
if (!$?) {
    exit 99
}
""
""
