#!/bin/bash
# cd /home/Fraser/SuperProject/Routing
# git pull --all
# git merge upstream/master
# cargo test --example simple_key_value_store --release

# ssh 45.55.207.180 "rm ~/Routing/simple_key_value_store.bootstrap.cache"
# ssh 178.62.7.96 "rm ~/Routing/simple_key_value_store.bootstrap.cache"
# ssh 128.199.199.210 "rm ~/Routing/simple_key_value_store.bootstrap.cache"
# ssh 37.59.98.1 "rm ~/Routing/simple_key_value_store.bootstrap.cache"
# ssh 45.79.93.11 "rm ~/Routing/simple_key_value_store.bootstrap.cache"
# ssh 45.79.2.52 "rm ~/Routing/simple_key_value_store.bootstrap.cache"

scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 45.55.207.180:~/Vault/maidsafe_vault.bootstrap.cache.5483
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 178.62.7.96:~/Vault/maidsafe_vault.bootstrap.cache.5483
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 128.199.199.210:~/Vault/maidsafe_vault.bootstrap.cache.5483
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 37.59.98.1:~/Vault/maidsafe_vault.bootstrap.cache.5483
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 45.79.93.11:~/Vault/maidsafe_vault.bootstrap.cache.5483
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 45.79.2.52:~/Vault/maidsafe_vault.bootstrap.cache.5483

scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 45.55.207.180:~/Vault/maidsafe_vault.bootstrap.cache
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 178.62.7.96:~/Vault/maidsafe_vault.bootstrap.cache
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 128.199.199.210:~/Vault/maidsafe_vault.bootstrap.cache
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 37.59.98.1:~/Vault/maidsafe_vault.bootstrap.cache
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 45.79.93.11:~/Vault/maidsafe_vault.bootstrap.cache
scp /home/Fraser/SuperProject/MaidSafeVault/maidsafe_vault.bootstrap.cache.5483 45.79.2.52:~/Vault/maidsafe_vault.bootstrap.cache

# scp /home/Fraser/Downloads/installed/lib/libsodium.so.13.2.0 45.55.207.180:~/Vault/libsodium.so.13.2.0
# scp /home/Fraser/Downloads/installed/lib/libsodium.so.13.2.0 178.62.7.96:~/Vault/libsodium.so.13.2.0
# scp /home/Fraser/Downloads/installed/lib/libsodium.so.13.2.0 128.199.199.210:~/Vault/libsodium.so.13.2.0
# scp /home/Fraser/Downloads/installed/lib/libsodium.so.13.2.0 37.59.98.1:~/Vault/libsodium.so.13.2.0
# scp /home/Fraser/Downloads/installed/lib/libsodium.so.13.2.0 45.79.93.11:~/Vault/libsodium.so.13.2.0
# scp /home/Fraser/Downloads/installed/lib/libsodium.so.13.2.0 45.79.2.52:~/Vault/libsodium.so.13.2.0

# ssh 45.55.207.180 "cd Vault && ln -s libsodium.so.13.2.0 libsodium.so.13 && ln -s libsodium.so.13.2.0 libsodium.so && export LD_LIBRARY_PATH=/home/Fraser/Vault && ls -laG"
# ssh 178.62.7.96 "cd Vault && ln -s libsodium.so.13.2.0 libsodium.so.13 && ln -s libsodium.so.13.2.0 libsodium.so && export LD_LIBRARY_PATH=/home/Fraser/Vault && ls -laG"
# ssh 128.199.199.210 "cd Vault && ln -s libsodium.so.13.2.0 libsodium.so.13 && ln -s libsodium.so.13.2.0 libsodium.so && export LD_LIBRARY_PATH=/home/Fraser/Vault && ls -laG"
# ssh 37.59.98.1 "cd Vault && ln -s libsodium.so.13.2.0 libsodium.so.13 && ln -s libsodium.so.13.2.0 libsodium.so && export LD_LIBRARY_PATH=/home/Fraser/Vault && ls -laG"
# ssh 45.79.93.11 "cd Vault && ln -s libsodium.so.13.2.0 libsodium.so.13 && ln -s libsodium.so.13.2.0 libsodium.so && export LD_LIBRARY_PATH=/home/Fraser/Vault && ls -laG"
# ssh 45.79.2.52 "cd Vault && ln -s libsodium.so.13.2.0 libsodium.so.13 && ln -s libsodium.so.13.2.0 libsodium.so && export LD_LIBRARY_PATH=/home/Fraser/Vault && ls -laG"


# ln -s libsodium.so.13.2.0 libsodium.so.13
# ln -s libsodium.so.13.2.0 libsodium.so
# export LD_LIBRARY_PATH=/home/Fraser/Routing
# ./simple_key_value_store -n 45.55.207.180:34042

# ssh 45.79.2.52 'bash -s' < /home/Fraser/Scripts/run_first.sh
echo "Done."
