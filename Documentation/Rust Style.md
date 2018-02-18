# Contributing Rust code to MaidSafe

We don't maintain a separate style guide but in general try to follow [common good practice](https://aturon.github.io/), write readable and idiomatic code and aim for full test coverage. In addition, this document lists a few decisions we've reached in discussions about specific topics.

## Rust version

We currently use Rust stable 1.24.0.

## Unwrap

Don't unwrap [`Option`](https://doc.rust-lang.org/std/option/enum.Option.html)s or [`Result`](https://doc.rust-lang.org/std/result/enum.Result.html)s, except possibly when:

1. locking a mutex,
2. spawning a thread,
3. joining a thread,
4. writing tests or examples

or in other patterns where using them makes the code _much simpler_ and it is _obvious at first glance_ to the reader (even one unfamiliar with the code) that the value cannot be `None`/`Err`.

In these cases, prefer to use the macro from the [`unwrap` crate](https://crates.io/crates/unwrap).

## Threads

Generally avoid detached threads. Give child threads meaningful names.

This can easily be achieved by preferring to create child threads using [`maidsafe_utilities::thread::named()`](http://docs.maidsafe.net/maidsafe_utilities/master/maidsafe_utilities/thread/fn.named.html).

* it returns a [`Joiner`](http://docs.maidsafe.net/maidsafe_utilities/master/maidsafe_utilities/thread/struct.Joiner.html) which helps to avoid detached threads
* it requires that the child thread is given a name

## Rustfmt

Apply `rustfmt` to new code before committing, using the default configuration or, if present, the repository's `rustfmt.toml` file. We currently use rustfmt 0.9.0.

## Function ordering

In `impl`s, always put public functions before private ones.

## Clippy

Crates are tested using cargo-clippy; make sure your code does not produce any new errors when running Clippy. If you don't agree with a [Clippy lint](https://github.com/Manishearth/rust-clippy#lints), discuss it with the team before explicitly adding a `#[cfg_attr(feature="cargo-clippy", allow(<lint>))]` attribute.

We currently use Clippy 0.0.186 which needs to be installed and run with Rust nightly-2018-02-05:
```
rustup install nightly-2018-02-05
cargo +nightly-2018-02-05 install clippy -f --vers=0.0.186
```

To run Clippy:
```
cargo +nightly-2018-02-05 clippy
cargo +nightly-2018-02-05 clippy --profile test
```
If the crate being tested also defines features, these two Clippy commands should also be run with each feature enabled.

## Cargo

Use `cargo-edit` to update dependencies or keep the `Cargo.toml` in the formatting that `cargo-edit` uses.

## Other crates

Adding new dependencies to MaidSafe crates in general should be discussed in the team first, except if other MaidSafe crates already have the same dependency. E.g. [quick-error](https://crates.io/crates/quick-error) and [unwrap](https://crates.io/crates/unwrap) are fine to use.

## Git Commit Messages

The first line of the commit message should have the format `<type>/<scope>: <subject>`. For details see the [Leaf project's guidelines](https://github.com/autumnai/leaf/blob/master/CONTRIBUTING.md#git-commit-guidelines).
