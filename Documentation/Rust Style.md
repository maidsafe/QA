# Contributing Rust code to MaidSafe

We don't maintain a separate style guide but in general try to follow [common good practice](https://github.com/rust-lang/rust/tree/master/src/doc/style), write readable and idiomatic code and aim for full test coverage. In addition, this document lists a few decisions we've reached in discussions about specific topics.


## Unwrap

Don't unwrap [`Option`](https://doc.rust-lang.org/std/option/enum.Option.html)s or [`Result`](https://doc.rust-lang.org/std/result/enum.Result.html)s, except possibly when:

1. locking a mutex,
2. spawning a thread,
3. joining a thread

or in other patterns where using them makes the code _much simpler_ and it is _obvious at first glance_ to the reader (even one unfamiliar with the code) that the value cannot be `None`/`Err`.

In these cases, as well as in tests, consider using the macros from the [`unwrap` crate](https://crates.io/crates/unwrap).


## Rustfmt

Apply `rustfmt` to new code before committing, using the default configuration or, if present, the repository's `rustfmt.toml` file.


## Clippy

If a crate has that feature, make sure your code does not produce any new errors when compiling with `--features=clippy`. If you don't agree with a [Clippy lint](https://github.com/Manishearth/rust-clippy#lints), discuss it with the team before explicitly adding an `#[allow(lint)]` attribute.


## Other crates

Adding new dependencies to MaidSafe crates in general should be discussed in the team first, except if other MaidSafe crates already have the same dependency. E.g. [quick-error](https://crates.io/crates/quick-error) and [unwrap](https://crates.io/crates/unwrap) are fine to use.


## Git Commit Messages

The first line of the commit message should have the format `<type>/<scope>: <subject>`. For details see the [Leaf project's guidelines](https://github.com/autumnai/leaf/blob/master/CONTRIBUTING.md#git-commit-guidelines).
