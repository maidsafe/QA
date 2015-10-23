# Use features if they've been set
if ($env:Features) {
    $with_features = "--features",$env:Features
}

# Use Release flag if required
if ($env:CONFIGURATION -eq "Release") {
    $release_flag = "--release"
}

# Build library and tests
Invoke-Command { cargo test --no-run --verbose $with_features $release_flag } -NoNewScope
