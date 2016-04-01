## Update Snapshot Used by Droplet Deployer

1. Create a new droplet from the existing "Droplet Deployer" [snapshot](https://cloud.digitalocean.com/images/snapshots).
1. Make whatever changes are required (user is `qa`, password is held in [private Assets repo](https://github.com/maidsafe/Assets/blob/master/QA/snapshot.md)).
1. Shutdown the droplet and take a new snapshot called `Droplet Deployer`.
1. [Generate a new Personal Access Token](https://cloud.digitalocean.com/settings/api/tokens/new).
1. To get the ID of the newly-created snapshot, run `curl -sX GET -H "Content-Type: application/json" -H "Authorization: Bearer <token here>" "https://api.digitalocean.com/v2/images?private=true" | sed -n 's/.*"id":\([^,]*\),"name":"Droplet Deployer".*/\n\1\n\n/p'`
1. If this doesn't yield an ID, it may be due to pagination of the response; you may need to add `&page=2` (or whatever value the last page has) to the end of the URL after `private=true`.
1. Replace the existing value of `"imageId"` in [Droplet Deployer's config.json file](https://github.com/maidsafe/QA/blob/master/droplet_deployer/config.json#L37) with the new one.
1. Commit and push this.
1. Test the Droplet Deployer tool.
1. [Delete the Personal Access Token](https://cloud.digitalocean.com/settings/api/tokens).
1. [Delete the old Droplet Deployer snapshot](https://cloud.digitalocean.com/images/snapshots) (check "Created" values).
1. [Delete the freshly-shutdown Droplet](https://cloud.digitalocean.com/droplets) used to create the new snapshot.
