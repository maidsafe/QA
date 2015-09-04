#!/bin/bash

# Show expanded commands while running
set -x

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

# We only want to deploy the docs and run coverage if it's a pull request to 'master' and only on
# the first job number in the Travis matrix.  This should be a Linux run.
if [[ ! $TRAVIS_OS_NAME = linux ]] || [[ ${TRAVIS_JOB_NUMBER##*.} -ne 1 ]] ||
   [[ ! $TRAVIS_BRANCH = master ]] || [[ ! $TRAVIS_PULL_REQUEST = false ]]; then
  exit 0
fi

PROJECT_NAME=${TRAVIS_REPO_SLUG##*/};
cargo doc
cargo test --no-run
echo "<meta http-equiv=refresh content=0;url=${PROJECT_NAME}/index.html>" > target/doc/index.html
pip install --user ghp-import
COMMIT_MSG=$(git log -1 | tr '[:upper:]' '[:lower:]' | grep "version change to " | tr -d ' ')
git clone https://github.com/${TRAVIS_REPO_SLUG}.git --branch gh-pages --single-branch docs-stage
cd docs-stage
rm -rf .git*
if [[ $COMMIT_MSG == versionchangeto* ]]; then
  VERSION=${COMMIT_MSG##*to}
  mkdir -p $VERSION
  mkdir -p latest
  cp -rf ../target/doc/* $VERSION
  cp -rf ../target/doc/* latest
  git config --global user.email dev@maidsafe.net
  git config --global user.name maidsafe-jenkins
  git tag $VERSION -a -m "Version $VERSION"
  git push -q https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG} --tags
fi
mkdir -p master
cp -rf ../target/doc/* master
cd ..
ghp-import -n docs-stage
git push -fq https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git gh-pages
cd $HOME

# Check to see if elfutils dir has been retrieved from cache
ElfUtilsVersion=0.163
ElfUtilsInstallPath=$HOME/elfutils-$ElfUtilsVersion
Cores=$((hash nproc 2>/dev/null && nproc) || (hash sysctl 2>/dev/null && sysctl -n hw.ncpu) || echo 1)
if [ ! -d "$ElfUtilsInstallPath/lib" ]; then
  # If not, build and install it
  mkdir -p temp
  cd temp
  wget https://fedorahosted.org/releases/e/l/elfutils/$ElfUtilsVersion/elfutils-$ElfUtilsVersion.tar.bz2
  tar jxf elfutils-$ElfUtilsVersion.tar.bz2
  cd elfutils-$ElfUtilsVersion
  ./configure --prefix=$ElfUtilsInstallPath
  make check -j$Cores
  make install
else
  echo "Using cached elfutils directory."
fi
export LD_LIBRARY_PATH=$ElfUtilsInstallPath/lib:$LD_LIBRARY_PATH

cd $HOME

mkdir -p temp
cd temp
wget https://github.com/SimonKagstrom/kcov/archive/master.tar.gz
tar xzf master.tar.gz
cmake -Bbuild_kcov -Hkcov-master -DCMAKE_INSTALL_PREFIX=$HOME/ -DCMAKE_BUILD_TYPE=Release -DCMAKE_INCLUDE_PATH="$ElfUtilsInstallPath/include" -DCMAKE_LIBRARY_PATH="$ElfUtilsInstallPath/lib"
cd build_kcov
make -j$Cores
make install

cd $TRAVIS_BUILD_DIR
$HOME/bin/kcov --coveralls-id=$TRAVIS_JOB_ID --include-path=src target/kcov target/debug/$PROJECT_NAME-*
