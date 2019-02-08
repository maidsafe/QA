#!/bin/bash

#kill prevous tmux temp session
tmux kill-session -t tempBench
echo "Previous temp tmux session killed."

#starts new tmux session and calls the benchmark script
tmux new-session -d -s "tempBench" /home/maidsafe/Projects/benchmarks/parsec/benchmark.sh

#feedback
echo "Benchmark script started in tempBench tmux session."
