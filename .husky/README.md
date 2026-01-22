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

## Commit Message Hook

**Validates commit message format**

### Format Required:

```
<type>(<scope>): <subject>
```

### Valid Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `build`: Build system changes
- `ci`: CI/CD changes
- `revert`: Revert previous commit

### Examples:

```bash
git commit -m "feat(auth): add JWT authentication"
git commit -m "fix(user): resolve profile loading issue"
git commit -m "docs: update API documentation"
git commit -m "refactor(classes): simplify query logic"
```

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
