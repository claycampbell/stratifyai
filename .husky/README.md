# Git Hooks

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/) to ensure code quality before commits and pushes.

## Available Hooks

### pre-commit
Runs before every `git commit`. This hook performs:
- **TypeScript Type Checking** for both frontend and backend
- Prevents commits with TypeScript errors

**What it does:**
```bash
npm run typecheck
```

This runs:
- `tsc --noEmit` in the frontend directory
- `tsc --noEmit` in the backend directory

**Time:** ~5-10 seconds

### pre-push
Runs before every `git push`. This hook performs:
- **Full Production Builds** for both frontend and backend
- Ensures code will build successfully in CI/CD
- Catches build errors before they reach Azure

**What it does:**
```bash
npm run build
```

This runs:
- `npm run build` in the frontend directory (TypeScript compilation + Vite build)
- `npm run build` in the backend directory (TypeScript compilation)

**Time:** ~15-30 seconds

## How to Use

### Normal Workflow
Just work as usual! The hooks run automatically:

```bash
git add .
git commit -m "fix: some changes"  # ← pre-commit hook runs here
git push                           # ← pre-push hook runs here
```

### If a Hook Fails

**Pre-commit failure:**
```
❌ TypeScript type check failed. Please fix the errors before committing.
```
- Fix the TypeScript errors shown in the output
- Run `npm run typecheck` to verify fixes
- Try committing again

**Pre-push failure:**
```
❌ Build failed. Please fix the errors before pushing.
```
- Fix the build errors shown in the output
- Run `npm run build` to verify fixes
- Try pushing again

### Skipping Hooks (Emergency Only!)

If you absolutely must skip a hook (not recommended):

```bash
# Skip pre-commit
git commit --no-verify -m "emergency fix"

# Skip pre-push
git push --no-verify
```

⚠️ **Warning:** Skipping hooks may cause build failures in Azure!

## Available Scripts

From the root directory, you can run:

```bash
# Type checking only (fast)
npm run typecheck

# Full builds (slower)
npm run build

# Linting (when configured)
npm run lint

# Individual components
npm run typecheck:frontend
npm run typecheck:backend
npm run build:frontend
npm run build:backend
```

## Benefits

✅ **Catch errors early** - Before they reach CI/CD
✅ **Faster feedback** - Know about issues in seconds, not minutes
✅ **Save time** - No waiting for Azure builds to fail
✅ **Team consistency** - Everyone runs the same checks
✅ **Automatic** - No need to remember to run checks manually

## Troubleshooting

### "Husky command not found"
Run from the root directory:
```bash
npm install
```

### Hooks not running
1. Make sure you're in the git repository
2. Reinstall Husky:
```bash
npm run prepare
```

### Slow hook performance
The hooks are intentionally comprehensive. If they're too slow:
- Pre-commit can be made faster by only checking changed files
- Pre-push is meant to be thorough (but you can skip with `--no-verify` in emergencies)

## Customization

To modify the hooks, edit the files in `.husky/`:
- `.husky/pre-commit` - Runs before commits
- `.husky/pre-push` - Runs before pushes

After editing, no reinstallation needed - changes take effect immediately.
