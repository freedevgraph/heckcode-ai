# heckcode

A highly modular AI coding agent with human-in-the-loop support and a setup wizard CLI.

This repository provides a TypeScript-based command-line tool that can run single prompts, start interactive sessions, and guide users through a configuration wizard to connect to multiple AI providers.

## Features

- Modular AI provider support (OpenAI, Anthropic, Google generative API)
- Human-in-the-loop CLI with an interactive mode
- Setup wizard to create configuration files
- Usable as a CLI tool (`heckcode`)

## Contents

- src/ - TypeScript source code
- examples/ - Example prompts and configurations
- package.json - Project manifest and scripts
- LICENSE - MIT license

## Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/freedevgraph/heckcode-ai.git
cd heckcode-ai
npm install
```

Build the project:

```bash
npm run build
```

Run in development mode (requires `tsx`):

```bash
npm run dev
```

## Usage

After building, the CLI entrypoint is `dist/cli/index.js` and the package exposes a `heckcode` binary.

Basic commands (see `src/cli/index.ts`):

- `heckcode init` — run the setup wizard to create a configuration
- `heckcode run [prompt]` — run a single prompt and exit (use `--config <path>` to specify a config)
- `heckcode interactive` or `heckcode i` — start an interactive session
- `heckcode info` — show the current configuration

Examples:

Run a single prompt:

```bash
# after building, or using npx in local dev
node dist/cli/index.js run "Refactor the login module"
# or
npm run start -- run "Refactor the login module"
```

Start the interactive REPL:

```bash
node dist/cli/index.js interactive
```

## Configuration

The project includes a configuration loader (`src/config/loader.js`) and a setup wizard (`src/cli/wizard.js`) that will interactively create the config for you. Use `heckcode init` to run the wizard.

Supported providers (from package.json dependencies):

- OpenAI (`openai`)
- Anthropic (`@anthropic-ai/sdk`)
- Google Generative AI (`@google/generative-ai`)

The exact configuration schema is validated with Zod — consult source code under `src/config` for details.

## Development

- Build: `npm run build` (runs `tsc`)
- Dev (run TypeScript directly): `npm run dev` (uses `tsx`)
- Type check / lint: `npm run lint` (runs `tsc --noEmit`)

When contributing, follow standard GitHub flow: create a branch, push changes, and open a pull request.

## Examples

See the `examples/` directory for sample prompts and usage snippets.

## Contributing

Contributions are welcome. Please open an issue first if you're planning larger changes or need guidance. Pull requests should include tests or manual verification steps where appropriate.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
