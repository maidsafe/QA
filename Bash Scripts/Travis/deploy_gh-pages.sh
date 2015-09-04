#!/bin/bash
if  [[ $TRAVIS_OS_NAME = linux ]] && [[ $TRAVIS_RUST_VERSION = nightly ]] && [[ $TRAVIS_BRANCH = master ]] && [[ $TRAVIS_PULL_REQUEST = false ]]; then
  PROJECT_NAME=${TRAVIS_REPO_SLUG##*/};
  cargo build
  cargo doc
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
  Cores=$((hash nproc 2>/dev/null && nproc) || (hash sysctl 2>/dev/null && sysctl -n hw.ncpu) || echo 1)
  if [ ! -d "$HOME/elfutils-$ElfUtilsVersion/lib" ]; then
    # If not, build and install it
    mkdir -p temp
    cd temp
    wget https://fedorahosted.org/releases/e/l/elfutils/$ElfUtilsVersion/elfutils-$ElfUtilsVersion.tar.bz2
    tar jxf elfutils-$ElfUtilsVersion.tar.bz2
    cd elfutils-$ElfUtilsVersion
    mkdir $HOME/elfutils-$ElfUtilsVersion
    ./configure --prefix=$HOME/elfutils-$ElfUtilsVersion
    make check -j$Cores
    make install
  else
    echo "Using cached elfutils directory."
  fi

  export COMPILER_PATH=/usr/bin
  export LIBELF_LIBRARIES=$HOME/elfutils-$ElfUtilsVersion
  export LIBELF_INCLUDE_DIRS=$HOME/elfutils-$ElfUtilsVersion
  export LIBRARY_PATH=$HOME/elfutils-$ElfUtilsVersion/lib:$LIBRARY_PATH
  export LD_LIBRARY_PATH=$HOME/elfutils-$ElfUtilsVersion/lib:$LD_LIBRARY_PATH
  cd $HOME/

  wget https://github.com/SimonKagstrom/kcov/archive/master.tar.gz
  tar xzf master.tar.gz
  cmake -Bbuild_kcov -Hkcov-master -DCMAKE_INSTALL_PREFIX=$HOME/ -DCMAKE_BUILD_TYPE=Release
  cd build_kcov
  make -j$Cores
  make install
  cd $TRAVIS_BUILD_DIR
  pwd
  $HOME/bin/kcov --coveralls-id=$TRAVIS_JOB_ID --exclude-pattern=/.cargo target/kcov target/debug/$PROJECT_NAME-*
fi
