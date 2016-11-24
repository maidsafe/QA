#!/bin/bash

cur_ver=`cargo install --list | grep 'rustfmt v' | sed -E 's/.*([0-9]+\.[0-9]+\.[0-9]+).*/\1/g'`

if [ $? -ne 0 ]; then
  # rustfmt is not installed yet
  cargo install rustfmt
fi

latest_ver=`curl -s -H "Accept: application/json" -H "Content-Type: application/json" -X GET https://crates.io/api/v1/crates/rustfmt | sed -E 's/.*"max_version":"([^"]*).*/\1/g'`

if [ "$cur_ver" != "$latest_ver" ]; then
  # Update to latest rustfmt
  cargo install rustfmt --force
fi

res=0
for i in `find . -name '*.rs'`; do
  rustfmt --skip-children --write-mode=diff $i
  if [ $? -ne 0 ]; then
    res=1
  fi
done

exit $res
