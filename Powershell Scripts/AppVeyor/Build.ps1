. ".\Set Features and Build Type.ps1"

# Exit the script if building fails
$ErrorActionPreference = "Stop"

# Build library and tests
Invoke-Command { cargo test --no-run --verbose $with_features $release_flag } -NoNewScope
