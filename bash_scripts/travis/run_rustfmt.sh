#!/bin/bash

res=0
for i in `find . -name '*.rs'`; do
  rustfmt --skip-children --write-mode=diff $i
  if [ $? -ne 0 ]; then
    res=1
  fi
done

if [ $res -eq 0 ]; then
  echo "\n\033[0;32mRustfmt check passed.\033[0m\n"
else
  echo "\n\033[0;31mRustfmt check failed.\033[0m\n"
fi

exit $res
