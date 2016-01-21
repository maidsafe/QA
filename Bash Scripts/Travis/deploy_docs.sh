#!/bin/bash

# Show executed commands (not expanded) while running
set -v

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

ProjectName=${TRAVIS_REPO_SLUG##*/};

cd $TRAVIS_BUILD_DIR
cargo doc

echo "<meta http-equiv=refresh content=0;url=${ProjectName}/index.html>" > target/doc/index.html
pip install --user ghp-import
CommitMessage=$(git log -1 | tr '[:upper:]' '[:lower:]' | grep "version change to " | tr -d ' ')
git config --global user.email qa@maidsafe.net
git config --global user.name MaidSafe-QA

# If gh-pages branch already exists, clone it to pull down the existing version-specific docs.
# Otherwise just create an empty folder, since this is the first push to gh-pages.
if git rev-parse --verify origin/gh-pages > /dev/null 2>&1; then
  git clone https://github.com/${TRAVIS_REPO_SLUG}.git --branch gh-pages --single-branch docs-stage
else
  mkdir -p docs-stage
fi

cd docs-stage
echo "<meta http-equiv=refresh content=0;url=master/${ProjectName}/index.html>" > index.html
rm -rf .git*
if [[ $CommitMessage == versionchangeto* ]]; then
  Version=${CommitMessage##*to}
  mkdir -p $Version
  mkdir -p latest
  cp -rf ../target/doc/* $Version
  cp -rf ../target/doc/* latest
  git tag $Version -a -m "Version $Version"
  # Pipe output to null if the following command fails to thereby not print expanded variables
  git push -q https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG} --tags > /dev/null 2>&1
fi
mkdir -p master
cp -rf ../target/doc/* master
cd ..
ghp-import -n docs-stage
git push -fq https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git gh-pages > /dev/null 2>&1
