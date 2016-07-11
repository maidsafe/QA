#!/bin/bash

# Show executed commands (not expanded) while running
set -v

# Stop the script if any command fails
set -o errtrace
trap 'exit' ERR

ProjectName=${TRAVIS_REPO_SLUG##*/};

cd $TRAVIS_BUILD_DIR
cargo doc --features generate-diagrams || cargo doc
echo "<meta http-equiv=refresh content=0;url=${ProjectName}/index.html>" > target/doc/index.html
rm -rf /tmp/doc
mv target/doc /tmp/doc

git config --global user.email qa@maidsafe.net
git config --global user.name MaidSafe-QA

CommitMessage=$(git log -1 | tr '[:upper:]' '[:lower:]' | grep "version change to " | tr -d ' ')
if [[ $CommitMessage == versionchangeto* ]]; then
  Version=${CommitMessage##*to}
  Commit=$(git rev-parse HEAD)
  git tag $Version -am "Version $Version" $Commit
  # Pipe output to null if the following command fails to thereby not print expanded variables
  git push https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG} tag $Version > /dev/null 2>&1
fi

# Since we did a shallow clone which only clones the master branch, ensure we can fetch the gh-pages
# branch if it exists
git remote set-branches origin '*'
git fetch

# Checkout to the gh-pages branch if it already exists, otherwise clear out the repo and prepare
# for the first push to gh-pages.
if git rev-parse --verify origin/gh-pages > /dev/null 2>&1; then
  git checkout gh-pages
  git clean -df
else
  rm -rf ./*
  rm ./.**&
  git checkout --orphan gh-pages
  git rm -rf .
  echo "<meta http-equiv=refresh content=0;url=master/${ProjectName}/index.html>" > index.html
  touch .nojekyll
fi

rm -rf master
cp -rf /tmp/doc master

# Temporary patch to remove any named version docs
rm -rf 0* > /dev/null 2>&1

if [[ -n ${Version+x} ]]; then
  rm -rf latest
  cp -rf /tmp/doc latest
fi

git add --all .
if git commit -m"Updated documentation."; then
  # Pipe output to null if the following command fails to thereby not print expanded variables
  git push https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git gh-pages > /dev/null 2>&1
fi

git checkout master
