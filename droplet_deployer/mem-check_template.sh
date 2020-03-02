#!/bin/bash

source /home/qa/.bash_profile  # now declaring source here

proc="safe_vault";
max_allowed_KiB=$((3*1024*1024)); # 3 GiB allowed
current_timestamp=$(date +%Y-%m-%d-%H:%M);

pid=$(ps -aux | grep -i ${proc} | grep -v grep | awk 'BEGIN { FS=" " } { printf $2 }');

if [[ ${pid} -ne 0 ]]; then
    mem_used_kb=$(cat /proc/${pid}/status | grep -i vmsize | awk 'BEGIN { FS=" " } { printf $2 }');
    if [[ ${mem_used_kb} -le ${max_allowed_KiB} ]]; then
        printf "${current_timestamp} Mem used: ${mem_used_kb} KiB.\n" > /home/qa/current-mem-used.log;
        exit 0;
    fi
    printf "${current_timestamp} Memory usage of ${proc} has exceeded ${max_allowed_KiB} KiB. Killing and restarting...\n" >> /home/qa/vault_cron.log;
else
    printf "${current_timestamp} ERROR: ${proc} is not running.\n" >> /home/qa/vault_cron.log;
fi

tmux kill-session;

node_log_bkup=Node-${current_timestamp}.log;
mv Node.log ${node_log_bkup} > mv-out 2>&1;

tmux ls > ls-out 2>&1;
tmux new-session -d "teamocil settings;";  # no longer declaring source as part of this line
tmux ls > ls-outp 2>&1;
