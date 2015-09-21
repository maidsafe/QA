# Managing Remote Servers

The objective of this document is to detail a standard process for handling remote servers (e.g.
Droplets), so that all MaidSafe remote servers are secure and can be accessed in a similar way.
This should make working with and scripting for these simpler.

Note that this does not apply to "throw-away" remote servers which are used for short-term testing,
and need not be secure.

### Setting up a New Server

Where there is a choice, we should never allow the host to send us a root password via email.  If a
root or sudo user's password _is_ ever emailed (even internally between two MaidSafe employees), it
should immediately be treated as compromised and changed.

In the case of Droplets, we should add all QA members' SSH keys by default.  This allows any QA
member to ssh into the droplet as root.  However, this should generally only ever be done once, in
order to create the new `qa` user as detailed below.  Working as root is not a good practice and
should be kept to a minimum.

As soon as a new server is created, the following steps should be taken:

1. ssh into the server as root
1. create a sudo user named `qa` with a strong, unique, random password.  On Ubuntu:

    ```bash
    adduser qa
    adduser qa sudo
    ```

    or on Fedora:

    ```bash
    useradd qa
    passwd qa
    usermod qa -a -G wheel
    ```

1. exit the ssh session
1. add details of the server to an existing or new document in the QA folder of the private
[Assets](https://github.com/maidsafe/Assets/tree/master/QA) repository

### Managing the Servers

#### Compromised Password

If the password of a sudo user is compromised (e.g. laptop lost/stolen, password emailed), all
affected servers should be updated as soon as possible.  As passwords should be unique, this should
apply to just a single user account on a single server.

The fix can either be to change the password, or to delete the user.

#### Compromised SSH Key

If the private SSH key of a sudo user is compromised (e.g. laptop lost/stolen, private key
emailed!), all affected servers should be updated as soon as possible.

The hard part will be identifying all the accounts to which this key has access.  For a QA team
member, this will likely include the root user, their own user account and perhaps other users'
accounts on every remote server.

The fix is to remove the affected key from the relevant `authorized_keys` files.  This will be in
`/home/<USER>/.ssh/` or `/root/.ssh/`.

#### Adding new Users

If for whatever reason, a non-QA team member wants to access a remote server, don't share
credentials with that member; instead create a new user account for them.  Normally, the only shared
account should be the `qa` one (an exception is the `peer1` account on the `peer_prog.maidsafe.net`
Droplet).

Before creating an account for them, ensure that they really need access to the secure server.  If
their work can be done on a non-secure, throw-away Droplet for example, then that is the best
option.

Don't give the new user sudo access if not required.  If sudo access _is_ required, then create the
new user with a strong, unique, random password, but **don't email this password** to the team
member.  Instead, send it via a mumble message.

The team member should be asked to never change the password to a weak one, nor to one which they
use elsewhere.  They should also notify QA once the account can be deleted.
