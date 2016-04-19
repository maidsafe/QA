# Update Apt and Yum Repos

##### Build and Transfer 32-bit Package

```sh
ssh maidsafe@178.62.25.205

rustup update
git -C QA pull

cd safe_vault
git pull

~/QA/Bash\ Scripts/create_linux_vault_package.sh
```


##### Build and Transfer 64-bit Package
```sh
ssh maidsafe@178.62.85.248

rustup update
git -C QA pull

cd safe_vault
git pull

~/QA/Bash\ Scripts/create_linux_vault_package.sh
```


##### Update Apt Repo

```sh
ssh maidsafe@apt.maidsafe.net
Version=$(cat safe_vault_latest_version.txt)
cd /var/www/repos/apt/debian

# sudo reprepro remove jessie safe-vault
# sudo reprepro remove wheezy safe-vault

sudo reprepro includedeb jessie ~/SysV-style/safe-vault_"$Version"_amd64.deb
sudo reprepro includedeb jessie ~/SysV-style/safe-vault_"$Version"_i386.deb
sudo reprepro includedeb wheezy ~/SysV-style/safe-vault_"$Version"_amd64.deb
sudo reprepro includedeb wheezy ~/SysV-style/safe-vault_"$Version"_i386.deb

mv ~/safe_*.tar.gz /var/www/tarballs/
```

##### Update Yum Repo

```sh
ssh maidsafe@yum.maidsafe.net
cd /var/www/repos
cp ~/SysV-style/* .
rpm --resign *.rpm
createrepo .  # need '--checksum sha' for at least CentOS <= 5.10  See http://linux.die.net/man/8/createrepo
gpg2 --detach-sign --armor repodata/repomd.xml
```

---

##### Apt Links

- http://www.jejik.com/articles/2006/09/setting_up_and_managing_an_apt_repository_with_reprepro/
- https://mirrorer.alioth.debian.org/reprepro.1.html
- https://wiki.debian.org/HowToSetupADebianRepository#reprepro_for_new_packages
- https://wiki.debian.org/SettingUpSignedAptRepositoryWithReprepro
- https://scotbofh.wordpress.com/2011/04/26/creating-your-own-signed-apt-repository-and-debian-packages/

##### Yum Links

- http://www.idimmu.net/2009/10/20/creating-a-local-and-http-redhat-yum-repository/
- http://yum.baseurl.org/wiki/RepoCreate
- http://fedoranews.org/tchung/gpg/
- https://iuscommunity.org/pages/CreatingAGPGKeyandSigningRPMs.html
