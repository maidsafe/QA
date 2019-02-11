#!/bin/bash

date

# Remove old graphs
find /tmp/parsec_graphs -maxdepth 1 -type d -ctime 1 -exec rm -r "{}" \;

cd /home/maidsafe/Projects/benchmarks/parsec
git pull
git log -1 --oneline
/home/maidsafe/.cargo/bin/cargo update

# Pause the soak tests
INTEGRATION_TESTS_PID=$(pgrep integration_)
printf "Pausing soak tests with PID %i\n\n" $INTEGRATION_TESTS_PID
kill -TSTP $INTEGRATION_TESTS_PID

#run the benchmark tests and output log to timestamped file
/home/maidsafe/.cargo/bin/cargo bench --features=testing >> /home/maidsafe/Projects/benchmarks/parsec/logs/log$(date -d "today" +"%Y%m%d%H%M").log 2>&1

#feedback
echo"Benchmark testing complete.\n"

# Restart the soak tests
printf "Resuming soak tests with PID %i\n" $INTEGRATION_TESTS_PID
kill -CONT $INTEGRATION_TESTS_PID

printf "==================================================================\n\n"
