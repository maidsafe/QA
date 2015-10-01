## Flow of the script:

1. Setup Network
    1.  Check if the os is Ubuntu (deviation)
    2.  Check authentication
    3.  If valid user, present the CLI options to choose
           - crust
           - routing
           - vault
    4.  Based on selection - clone the repository with depth 1       
    5.  Build & Strip the binary
    6.  get the size of network (8 - 20)
    7.  get the size of seed nodes (3 - 6)
    8.  Create Spread / Concentrated network based on selection from user (only region, not based on cluster in a region)
    9.  Create a droplet based on a Snapshot - droplet naming convention <github-user>-<lib>-TN-<RegionShort>-<index>
    10. Get connection type preference for config
            - tcp
            - utp 
            - both
    11. Provide hidden `--advanced` option, which will allow to get the beacon and listening port (defaults to be listed)
    12. Create the config file based on seed node and name the file based on the option selected (library)
    13. scp the binary to the location in the remote system
    14. Print the message formatted with Droplet name & their corresponding ips. 
    15. Also create a space delimitted file of ips 
       
2. Drop network
    1. Validate git user.name is set. abort if not.
    2. Try and clone the maidsafe private repo only internal devs will have access to, if failed -> abort script with corresponding error. On success, retrieve the credentials for digital ocean account.
    3. Present user with all library options
    4. On selection of an option, destroy all droplets that match that criteria (<git_user>-<library>*).
