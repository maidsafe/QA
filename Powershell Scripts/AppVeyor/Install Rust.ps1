# Determine the appropriate arch to install
if ($env:PLATFORM -eq "x86") {
    $arch = "i686"
} else {
    $arch = "x86_64"
}

if ($env:RUST_VERSION -eq "stable") {
    $rust_version = "1.4.0"
} else {
    $rust_version = $env:RUST_VERSION
}

$rust_install = "rust-$rust_version-$arch-pc-windows-gnu.msi"

# Download Rust installer
if ($env:RUST_VERSION -eq "nightly") {
    Start-FileDownload "http://static.rust-lang.org/dist/2015-11-01/$rust_install" -FileName $rust_install
} else {
    Start-FileDownload "https://static.rust-lang.org/dist/$rust_install" -FileName $rust_install
}

# Install Rust
Start-Process -FilePath msiexec -ArgumentList /i, $rust_install, /quiet, INSTALLDIR="C:\Rust" -Wait

# Add Rust to path
$env:Path = "C:\Rust\bin;" + $env:Path

"Rust version:"
""
rustc -vV
""
""

"Cargo version:"
""
cargo -V
""
""
