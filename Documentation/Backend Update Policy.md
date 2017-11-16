# Backend Update Policy

The backend side of MaidSafe -- our stack of Rust code and crates -- must take care to preserve the data compatibility of the SAFE network when updating. In other words, we cannot make any change that would prevent older data on the network from being read. We need to make sure that, when upgrading dependencies, the way that data is encoded or serialized does not change, [as has happened before](https://github.com/maidsafe/self_encryption/pull/223). We have adopted this update policy to prevent these situations from causing binary incompatibility with the network, which would result in users not being able to access their data.

## Updating dependencies

### General policy

In most cases, dependencies should be updated to the latest version whenever doing a version change. We use tilde notation, e.g. `~x.y.z`, for specifying versions. This ensures that we don't run into version conflicts if two crates with the same dependency specify a different version of that dependency. In such cases, the higher of the two versions will be selected, which is OK most of the time.

### Exceptions

The exceptions to this rule are any crates that deal with serialization or encoding. Currently, this applies to the following in our dependency stack:

* `bincode`,
* `brotli2`,
* and all `serde_*` crates.

When updating any of these dependencies in `safe_client_libs`, the version **must** be specified with equals notation, e.g. `=x.y.z`, and this specific version must be tested for binary compatibility with the previous version. Such testing should ideally involve running the actual network and making sure that everything works.

All lower-level crates (such as `crust`, `routing`, and others) should **not** give a specific version. This makes it easier to update the version for these dependencies in `safe_client_libs` and also makes it easier for others to use our lower-level crates. Keep the version string as `x.y.*`.

## Version changes

Make version changes in their own commits and PRs. A version change should appropriately increment the current crate's version as well as the versions of dependencies, according to the rules laid out above.
