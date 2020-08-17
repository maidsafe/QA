#!/bin/sh -l

echo "Running new SAFE Network section with $1 vault, $2 cli, and $3 authd"
echo ""

# Download the specified vault version 
wget "https://safe-vault.s3.eu-west-2.amazonaws.com/safe_vault-$1-x86_64-unknown-linux-musl.tar.gz" -O ./vault.tar.gz;

ls .
mkdir -p $HOME/.safe/vault
tar -xvzf ./vault.tar.gz -C $HOME/.safe/vault/
chmod +x $HOME/.safe/vault/safe_vault

# Download the specified cli version
wget "https://safe-api.s3.eu-west-2.amazonaws.com/safe-cli-$2-x86_64-unknown-linux-gnu.tar.gz" -O ./safe.tar.gz;

ls .
mkdir -p $HOME/.safe/cli
tar -xvzf ./safe.tar.gz -C $HOME/.safe/cli/
echo ""
echo "List contents of $HOME/.safe/cli/ :"
ls $HOME/.safe/cli/
PATH=$HOME/.safe/cli:$PATH
chmod +x $HOME/.safe/cli/safe
echo ""
echo "PATH:"
echo $PATH

# Download the specified authd version
wget "https://safe-api.s3.eu-west-2.amazonaws.com/safe-authd-$3-x86_64-unknown-linux-gnu.tar.gz" -O ./safe-authd.tar.gz; 

ls .
mkdir -p $HOME/.safe/authd
tar -xvzf ./safe-authd.tar.gz -C $HOME/.safe/authd/
echo ""
echo "List contents of $HOME/.safe/authd/ :"
ls $HOME/.safe/authd/
PATH=$HOME/.safe/authd:$PATH
chmod +x $HOME/.safe/authd/safe-authd
echo ""
echo "PATH:"
echo $PATH

# Check versions
$HOME/.safe/authd/safe-authd -V
$HOME/.safe/vault/safe_vault -V
safe --version

# Start section
safe vault run-baby-fleming
