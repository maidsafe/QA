#!/usr/local/bin/bash
echo $BASH_VERSION

# Declare folder variables
ROOT_FOLDER="/Users/qamaidsafe/Projects/soak"
LOG_FOLDER="$ROOT_FOLDER/logs"

# Create log_folder if doesn't exist
mkdir -p $LOG_FOLDER

# Declare log_file variable
LOGFILE="$LOG_FOLDER/log.log"

# Check if logfile exists, timestamp and move to log_folder if it does
[[ -f $LOGFILE ]] && mv $LOGFILE "$LOG_FOLDER/log-$(date -d "today" +"%Y%m%d%H%M").log"

# Output stack trace to log if error happens when running tests
export RUST_BACKTRACE=1

# Move to parsec folder for cargo operations
cd "$ROOT_FOLDER/parsec"

# Remove any artefacts from previous builds
cargo clean |& tee $LOGFILE

# Ensure on most recent commit
git pull |& tee -a $LOGFILE

# Return commit info
git log -1 --oneline

# Build the binary needed for soak tests
cargo update |& tee -a $LOGFILE
cargo test --release --features=testing |& tee -a $LOGFILE

# Remove the build artefact file with same name as integration test we want:
rm target/release/integration_tests-*.d

printf "Starting soak tests...\n"

# Loop the test forever until it hits an error
os=$(uname)
echo $os |& tee $LOGFILE
if [[ $os == "Darwin" ]]; then
	loop -q target/release/integration_tests-* |& tee -a -i $LOGFILE
else
	loop -q target/release/integration_tests-* |& tee -a -i -p --output-error=warn $LOGFILE
fi