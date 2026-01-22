# Git Hooks Configuration

This project uses [Husky](https://typicode.github.io/husky/) to enforce code quality and consistency through Git hooks.

## Pre-commit Hook

**Runs automatically before each commit**

### What it does:

1. 🎨 **Auto-formats code** using Prettier
2. 🔍 **Lints TypeScript files** with ESLint (auto-fixes issues)
3. 🔨 **Type-checks** the entire codebase with TypeScript compiler

### Files checked:

- `*.ts` - TypeScript files (formatted + linted)
- `*.json` - JSON files (formatted)
- `*.md` - Markdown files (formatted)

## Commit Message

**No restrictions** - Write your commit messages however you like!

The pre-commit hook will still ensure code quality, but commit messages are flexible.

## Bypassing Hooks (Not Recommended)

In rare cases where you need to bypass hooks:

```bash
# Skip all hooks
git commit --no-verify -m "message"

# Or set HUSKY=0 environment variable
HUSKY=0 git commit -m "message"
```

⚠️ **Warning**: Bypassing hooks can lead to broken builds and inconsistent code quality.

## Troubleshooting

### Hooks not running?

1. Make sure hooks are executable:

   ```bash
   chmod +x .husky/*
   ```

2. Reinstall Husky:
   ```bash
   npm run prepare
   ```

### TypeScript errors?

Fix TypeScript errors before committing:

```bash
npx tsc --noEmit
```

### Linting errors?

Auto-fix linting issues:

```bash
npm run lint:fix
```

### Format all files:

```bash
npm run format
```
