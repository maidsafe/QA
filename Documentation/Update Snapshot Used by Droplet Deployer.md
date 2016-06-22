## Update Snapshot Used by Droplet Deployer

1. Create a new droplet from the existing "Droplet Deployer" [snapshot][0].
1. Make whatever changes are required (user is `qa`, password is held in [private Assets repo][1]).
1. Shutdown the droplet and take a new snapshot called `Droplet Deployer`.
1. Replicate [the snapshot][0] to all regions (click the "More" option, then "Add to Region").
1. Rename the [old snapshot][0] to `Old Droplet Deployer` (check "Created" values).
1. [Generate a new Personal Access Token][2].
1. To get the ID of the newly-created snapshot, run `curl -sX GET -H "Content-Type: application/json" -H "Authorization: Bearer <token here>" "https://api.digitalocean.com/v2/images?private=true" | sed -n 's/.*"id":\([^,]*\),"name":"Droplet Deployer".*/\n\1\n\n/p'`
1. If this doesn't yield an ID, it may be due to pagination of the response; you may need to add `&page=2` (or whatever value the last page has) to the end of the URL after `private=true`.  Alternatively, check that the [new snapshot][0] has finished being created.
1. Replace the existing value of `"imageId"` in [Droplet Deployer's config.json file][3] with the new one.
1. Test the [Droplet Deployer][4] tool.
1. Commit and push the change.
1. [Delete the Personal Access Token][5].
1. [Delete the `Old Droplet Deployer` snapshot][0].
1. [Delete the freshly-shutdown Droplet][6] used to create the new snapshot.


[0]: https://cloud.digitalocean.com/images/snapshots
[1]: https://github.com/maidsafe/Assets/blob/master/QA/Droplets.md
[2]: https://cloud.digitalocean.com/settings/api/tokens/new
[3]: https://github.com/maidsafe/QA/blob/master/droplet_deployer/config.json#L37
[4]: https://github.com/maidsafe/QA/tree/master/droplet_deployer
[5]: https://cloud.digitalocean.com/settings/api/tokens
[6]: https://cloud.digitalocean.com/droplets
