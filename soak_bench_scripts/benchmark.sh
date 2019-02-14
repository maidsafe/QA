#!/bin/bash

date

# This code is obsolete but leaving just in case there is a need for graphs again
# Remove old graphs
#find /tmp/parsec_graphs -maxdepth 1 -type d -ctime 1 -exec rm -r "{}" \;

cd /home/maidsafe/Projects/benchmarks/parsec
git pull
git log -1 --oneline
/home/maidsafe/.cargo/bin/cargo update

# Pause the soak tests
INTEGRATION_TESTS_PID=$(pgrep integration_)
printf "Pausing soak tests with PID %i\n\n" $INTEGRATION_TESTS_PID
kill -TSTP $INTEGRATION_TESTS_PID

# Run the benchmark tests and output log to timestamped file in /logs directory
LOGFILE="/home/maidsafe/Projects/benchmarks/parsec/logs/log$(date -d "today" +"%Y%m%d%H%M").log" 
/home/maidsafe/.cargo/bin/cargo bench --features=testing | tee $LOGFILE

# Feedback
printf "Benchmark testing complete.\n"

# Restart the soak tests
printf "Resuming soak tests with PID %i\n" $INTEGRATION_TESTS_PID
kill -CONT $INTEGRATION_TESTS_PID

# Grep -c the logfile to count the instances of the different test messages
IMPROVED=$(grep -c 'improved' $LOGFILE)
NOT_CHANGED=$(grep -c 'detected' $LOGFILE)
NOISE=$(grep -c 'noise' $LOGFILE)
REGRESSED=$(grep -c 'regressed' $LOGFILE) 

# Print test results and append to logfile
printf "No. of tests that have improved: %i\n\n" $IMPROVED | tee -a $LOGFILE
printf "No. of tests that have not changed: %i\n\n" $NOT_CHANGED | tee -a $LOGFILE
printf "No of tests that have changed within noise threshold: %i\n\n" $NOISE | tee -a $LOGFILE
printf "No. of tests that have regressed: %i\n\n" $REGRESSED | tee -a $LOGFILE

printf "==================================================================\n\n"
