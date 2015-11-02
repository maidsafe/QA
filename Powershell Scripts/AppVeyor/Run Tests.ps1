# Exit the script if building fails
$ErrorActionPreference = "Stop"

# Prepare test script
$cargo_test = {
    cd $env:APPVEYOR_BUILD_FOLDER

    # Use features if they've been set
    if ($env:Features) {
        $with_features = "--features",$env:Features
    }

    # Use Release flag if required
    if ($env:CONFIGURATION -eq "Release") {
        $release_flag = "--release"
    }

    cargo test $with_features $release_flag -- --nocapture
    $LASTEXITCODE > TestResult.txt
}

# Run the test script
""
"Starting tests."
$job = Start-Job -ScriptBlock $cargo_test

# Set timeout to env var or use default of 10 minutes
$timeout_ms = 600000
if ($env:TimeoutSeconds) {
    $timeout_ms = [Int32]$env:TimeoutSeconds * 1000
}

# Loop until timed out or tests have completed
$ErrorActionPreference = "Continue"
$start_time = Get-Date
$current_time = $start_time
$completed = $false
while ((($current_time - $start_time).TotalMilliseconds -lt $timeout_ms) -and (-not $completed)) {
    $sleep_ms = 100
    Start-Sleep -m $sleep_ms

    # Display test's results so far
    Receive-Job $job

    # Check if the tests have completed
    $running = $job | Where-Object { $_.State -match 'running' }
    if (-not $running) {
        $completed = $true
    }
    $current_time = Get-Date
}

if (-not $completed) {
    # Exit with non-zero value if the test timed out

    # Kill job and retrieve and buffered output
    Get-ChildItem "target\$env:CONFIGURATION" -Filter *.exe | Foreach-Object { Stop-Process -name $_.BaseName *>$null }
    Stop-Job $job
    Receive-Job $job

    $timeout_seconds = $timeout_ms / 1000
    ""
    "Tests ran for longer than $timeout_seconds seconds, so have timed out."
    exit -2
} else {
    # Exit with the return code of the test command
    $test_result = Get-Content TestResult.txt
    exit $test_result
}

