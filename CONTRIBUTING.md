# Contributing to Sentinel

Thanks for taking the time to improve Sentinel. Issues, documentation updates, tests, bug fixes, and new analysis rules are all welcome.

## Before you start

- Search existing issues and pull requests before opening a new one.
- For a security vulnerability, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
- For changes that affect behavior, describe the intended behavior before doing substantial work.

## Local setup

The repository contains three related parts:

- The Next.js application at the repository root.
- The Go CLI in `cli/`.
- The Rust analysis engine in `sentinel-core/`.

Install the JavaScript dependencies and configure the environment values required by the application:

```bash
npm install
npm run dev
```

Run the application checks with:

```bash
npm run lint
npm run build
```

Run Go tests from the CLI directory:

```bash
cd cli
go test ./...
```

Run Rust checks from the analysis engine directory:

```bash
cd sentinel-core
cargo test
cargo check
```

## Making changes

1. Create a focused branch from `master`.
2. Keep each change small enough to review and add tests for behavior you change.
3. Follow the existing formatting and naming conventions in the affected package.
4. Update documentation when commands, configuration, or user-facing behavior changes.
5. Run the checks relevant to the code you touched.
6. Write a pull request description that explains the problem, the solution, and how you tested it.

Do not include secrets, credentials, private source code, or generated build output in a commit.

## Pull requests

A pull request should have a clear title, a concise explanation of the change, and evidence that the relevant checks pass. Keep unrelated refactors out of the same pull request. Maintainers may ask for changes before merging.

By contributing, you agree that your contribution is provided under the repository license and that you will follow the [Code of Conduct](CODE_OF_CONDUCT.md).
