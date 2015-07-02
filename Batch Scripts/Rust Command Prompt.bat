@echo OFF
set MissingArg=You didn't pass RUST_BETA or RUST_NIGHTLY as a command line argument.  Using RUST_NIGHTLY.
if [%1]==[] (
    echo %MissingArg% & set Version=%RUST_NIGHTLY%
) else (
    call set Version=%%%1%%
)
set PATH=%Version%\bin;%PATH%
set RUST_BACKTRACE=1
rustc --version
echo RUST_BACKTRACE=%RUST_BACKTRACE%
echo RUST_TEST_THREADS=%RUST_TEST_THREADS%
