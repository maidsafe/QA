## Add new Github repository - QA steps

New github repo created? Then this document should walk you through the QA steps to standardise your repo, alongside all the other MaidSafe github repositories. For steps and tools please use the MaidSafe-QA user unless instructions specify otherwise.

**Add repository to Travis**

Sync account and find the new repository you want to add and flick the switch to on.

![Sync Account](https://github.com/rossmuir/QA/blob/master/Documentation/images/1.png?raw=true)


**Add repository to Appveyor**

Login and select  `+ NEW PROJECT`




Then select the repository you would like to add







Add appveyor.yml and .travis.yml scripts to new repository

Fork the new repository from MaidSafe and locally clone the new repository and then from another MaidSafe github repository > https://github.com/maidsafe, copy and add the `appveyor.yml` and `.travis.yml` YAML files to the root of the new repository. The `.travis.yml` will require minor tweaking (more of which in the following steps) especially creating and updating the secure token, which is used to upload rust documentation. If you follow the bash scripts in the `.travis.yml` you will see this in > https://github.com/maidsafe/QA/blob/master/Bash%20Scripts/Travis/deploy_docs.sh


**Give Travis permissions**

Log into github as the MaidSafe-QA github user and go to settings and select Personal access tokens. Now click `Generate new token` and create a new “Travis Deploy Token - <new repo name>”



and limit scopes to match the screen below


Once you have clicked on Generate token copy the output as you will not see it again.

Use Travis gem to encrypt secure github access (see hoverbear)

Install the Travis Gem - follow the link for install instructions.

Run this, where `$YOUR_TOKEN` is the one we copied in the previous step.

`travis encrypt GH_TOKEN=$YOUR_TOKEN`


This will create a new -secure: …. line in the `.travis.yml`.

Edit the `.travis.yml` file you added to the new repo and replace the line `-secure:` with the output you have just generated - example of what this looks like is below.




If you are not at this point going to update the repositories `README.md` then you can push all your local changes upstream and issue a PR to add them to main repository.



**Webhooks - Add Highfive**

For this step you need to request temporary Github admin privileges from Fraser, Viv or David.
Login with new privs and go to *> Settings > Webhooks & services > Add webhook*

Payload URL = http://visualiser.maidsafe.net/cgi-bin/highfive/newpr.py





**Highfive backend configuration**

SSH (details in private assets github repository) to the droplet hosting Highfive


Navigate to `cd /usr/lib/cgi-bin/highfive/configs/`



create a new `<repository_name>.json` file (copy an existing .json file)



Edit the new `<repository_name>.json` file and update the maintainers names.
The important section is “groups” - note that entries & file names are case sensitive.
Save file.

**Add Coverage - coveralls.io**

Login with github account and click `RE-SYNC REPOS`




Click `ADD REPOS`


Flick the switch on your new repository












Update new repo `README.md`



Above is a screenshot and below is a template, best take the markdown from another repository and edit to fit the purposes of the new repository.


# < repository_name >

[![](https://img.shields.io/badge/Project%20SAFE-Approved-green.svg)](http://maidsafe.net/applications) [![](https://img.shields.io/badge/License-GPL3-green.svg)](https://github.com/maidsafe/crust/blob/master/COPYING)


**Primary Maintainer:**     < name > (< email_address >)

**Secondary Maintainer:**   < name > (< email_address >)

Reliable p2p network connections in Rust with NAT traversal. One of the most needed libraries for any server-less, decentralised project.

|Crate|Linux/OS X|Windows|Coverage|Issues|
|:---:|:--------:|:-----:|:------:|:----:|
|[![](http://meritbadge.herokuapp.com/crust)](https://crates.io/crates/crust)|[![Build Status](https://travis-ci.org/maidsafe/crust.svg?branch=master)](https://travis-ci.org/maidsafe/crust)|[![Build status](https://ci.appveyor.com/api/projects/status/ajw6ab26p86jdac4/branch/master?svg=true)](https://ci.appveyor.com/project/MaidSafe-QA/crust/branch/master)|[![Coverage Status](https://coveralls.io/repos/maidsafe/crust/badge.svg)](https://coveralls.io/r/maidsafe/crust)|[![Stories in Ready](https://badge.waffle.io/maidsafe/crust.png?label=ready&title=Ready)](https://waffle.io/maidsafe/crust)|

|[API Documentation - master branch](http://maidsafe.net/crust/master)|[SAFE Network System Documentation](http://systemdocs.maidsafe.net)|[MaidSafe website](http://maidsafe.net)| [SAFE Network Forum](https://forum.safenetwork.io)|
|:------:|:-------:|:-------:|:-------:|


## Overview
< insert_overview >
## Todo Items
< insert_todo_items >

*In the above example the badges and links are for `crust` just for illustrative purposes*

One niggle worth noting for Appveyor badges that has caught a few folk out of you need to grab the markdown for master badge - this can be found on the Appveyor site in the new repo page under: *Settings > Badges* and is the 6th or last entry on the page see below.
This is the one that needs pasted into the project's `README.md` and the QA `README.md`










**Update QA readme.md**

Finally add a new entry to https://github.com/maidsafe/QA/blob/master/README.md


Push upstream all your local repo changes and issue a PR

Checklist to see if everything is ok:

* Did Travis run?
* Did Appveyor run?
* Does Highfive allocate a reviewer for a PR?
* Do all the links and badges go to the correct places?
* On a successful merge to master did Travis create and publish the documentation?
* Did Coverage run?



**REMEMBER: to ask one of the Github administrators to revoke the temp privileges**
