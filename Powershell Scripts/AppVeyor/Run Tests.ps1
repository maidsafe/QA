. ".\Set Features and Build Type.ps1"

# Exit the script if building fails
$ErrorActionPreference = "Stop"

# Prepare test script
$cargo_test = {
    cd $env:APPVEYOR_BUILD_FOLDER
    . ".\Set Features and Build Type.ps1"
    cargo test $with_features $release_flag
    $LASTEXITCODE > TestResult.txt
}

# Run the test script
""
"Starting tests."
$job = Start-Job -ScriptBlock $cargo_test -Args $with_features

# Set timeout to env var or use default of 10 minutes
$timeout_ms = 600000
if ($env:TimeoutSeconds) {
    $timeout_ms = [Int32]$env:TimeoutSeconds * 1000
}

# Loop until timed out or tests have completed
$ErrorActionPreference = "Continue"
$completed = $false
while (($running_time -lt $timeout_ms) -and (-not $completed)) {
    $sleep_ms = 100
    Start-Sleep -m $sleep_ms
    $running_time += $sleep_ms

    # Display test's results so far
    Receive-Job -Job $job

    # Check if the tests have completed
    $running = $job | Where-Object { $_.State -match 'running' }
    if (-not $running) {
        $completed = $true
    }
}

if (-not $completed) {
    # Exit with non-zero value if the test timed out
    $timeout_seconds = $timeout_ms / 1000
    ""
    "Tests ran for longer than $timeout_seconds seconds, so have timed out."
    # Kill job.
    Remove-Job -force $job
    exit -2
} else {
    # Exit with the return code of the test command
    $test_result = Get-Content TestResult.txt
    exit $test_result
}

