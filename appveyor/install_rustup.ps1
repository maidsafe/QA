# Determine the appropriate arch to install
if ($env:PLATFORM -eq "x86") {
    $env:Path = "C:\msys64\mingw32\bin;C:\msys64\usr\bin;" + $env:Path
    $arch = "i686"
} else {
    $env:Path = "C:\msys64\mingw64\bin;C:\msys64\usr\bin;" + $env:Path
    $arch = "x86_64"
}

# Determine the toolchain to install
if (-not (Test-Path env:RUST_TOOLCHAIN)) {
    $env:RUST_TOOLCHAIN = '1.19.0'
}

# Temporary work around for AppVeyor CI issues (see https://github.com/rust-lang-nursery/rand/commit/bb78689)
$env:RUSTUP_USE_HYPER = 1
$env:CARGO_HTTP_CHECK_REVOKE = false

'Function InvokeInCmd {
  Write-Host "Running $args" -ForegroundColor Yellow
  cmd /c $args ''2>&1''
  if ($LastExitCode -ne 0) {
    exit $LastExitCode
  }
  Write-Host "Completed $args" -ForegroundColor Green
}
Export-ModuleMember -Function InvokeInCmd' | Set-Content -Path .\appveyor_helper.psm1

Import-Module -Name .\appveyor_helper.psm1

# Install gcc if required
InvokeInCmd bash -lc "pacman -S --noconfirm --needed mingw-w64-$arch-gcc"

# Download Rust installer
$url = "https://static.rust-lang.org/rustup/dist/$arch-pc-windows-gnu/rustup-init.exe"
$installer = $env:TEMP + "\rustup-init.exe"
(New-Object System.Net.WebClient).DownloadFile($url, $installer)

# Run installer
$installer = $installer.Replace("\", "/")
InvokeInCmd bash -lc "$installer -y --default-host $arch-pc-windows-gnu --default-toolchain $env:RUST_TOOLCHAIN"

# Add rustup to path
$env:Path = $env:USERPROFILE + "\.cargo\bin;" + $env:Path

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

# Temporary workaround for Curl SSL error (see https://github.com/rust-lang/cargo/issues/4072)
md .cargo -Force > $null
"[http]`r`ncheck-revoke = false" | Out-File ".cargo\config" -Encoding ASCII
