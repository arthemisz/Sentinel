# Sentinel

Sentinel is a security analysis platform for exploring vulnerabilities across application source code. The repository combines a Next.js web application, a Go command-line interface, and a Rust analysis engine.

## Repository layout

- `src/` - Next.js application and shared UI components.
- `cli/` - Go command-line client and scanner workflows.
- `sentinel-core/` - Rust parsing, graph, taint, and analysis engine.
- `prisma/` - Database schema used by the web application.

## Getting started

Install the JavaScript dependencies and start the web application:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The application may require environment values for authentication, the database, and configured AI providers; see the local environment setup used by your deployment.

## Development checks

Run the checks for each part of the repository:

```bash
npm run lint
npm run build

cd cli
go test ./...

cd ../sentinel-core
cargo test
cargo check
```

## Contributing

Bug reports, documentation improvements, tests, and focused code contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Please report security vulnerabilities privately according to [SECURITY.md](SECURITY.md), rather than opening a public issue.

## License

Sentinel is available under the [MIT License](LICENSE).
