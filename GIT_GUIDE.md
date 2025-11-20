# Git Version Control Guide for CourtMate

This guide explains how to use git to track changes and protect your working code.

## What is Git?

Git is a version control system that tracks changes to your code. It allows you to:
- **Save checkpoints** of your working code
- **See what changed** between versions
- **Revert to previous versions** if something breaks
- **Experiment safely** without breaking working code

## Current Setup

Your repository is initialized with:
- **Initial commit**: "Initial commit - Working version before UI improvements"
- **Tag**: `v1.0-working` - A named checkpoint you can always return to
- **Branch**: `main` - Your main working branch

## Basic Commands

### Check Status
See what files have changed:
```bash
git status
```

### See What Changed
View differences in modified files:
```bash
git diff
```

### View History
See all commits:
```bash
git log
```

See commits in one line:
```bash
git log --oneline
```

### Save Changes (Commit)
1. **Stage files** (tell git which files to save):
   ```bash
   git add .
   ```
   Or stage specific files:
   ```bash
   git add frontend/app/calendar/page.tsx
   ```

2. **Commit** (save the changes):
   ```bash
   git commit -m "Description of what you changed"
   ```
   Example:
   ```bash
   git commit -m "Fixed calendar filtering bug"
   ```

## Safety Workflows

### Before Making Changes

**Option 1: Commit First (Recommended)**
1. Make sure current code is committed:
   ```bash
   git status  # Should show "nothing to commit"
   ```
2. If there are uncommitted changes, commit them:
   ```bash
   git add .
   git commit -m "Save current state before changes"
   ```
3. Now make your changes

**Option 2: Create a Branch (Advanced)**
1. Create a new branch for experiments:
   ```bash
   git checkout -b feature/calendar-improvements
   ```
2. Make changes and test
3. If it works, merge back:
   ```bash
   git checkout main
   git merge feature/calendar-improvements
   ```
4. If it breaks, just switch back:
   ```bash
   git checkout main
   git branch -D feature/calendar-improvements  # Delete broken branch
   ```

### If Something Breaks

**Option 1: Revert to Last Commit**
```bash
# See what changed
git status

# Discard all uncommitted changes (DESTRUCTIVE - be careful!)
git reset --hard HEAD
```

**Option 2: Revert to Working Version Tag**
```bash
# See the tag
git tag

# Revert to the working version
git checkout v1.0-working

# Create a new branch from this point if needed
git checkout -b fix/restore-working-version
```

**Option 3: Revert to Specific Commit**
```bash
# Find the commit hash
git log --oneline

# Revert to that commit (replace abc1234 with actual hash)
git reset --hard abc1234
```

## Common Scenarios

### Scenario 1: Made Changes, Want to Save
```bash
git add .
git commit -m "Added navigation bar"
```

### Scenario 2: Made Changes, Want to Discard
```bash
# See what changed
git status

# Discard all changes
git reset --hard HEAD
```

### Scenario 3: Want to See What Changed Since Last Commit
```bash
git diff
```

### Scenario 4: Accidentally Broke Something
```bash
# Find the last working commit
git log --oneline

# Revert to it (replace abc1234 with commit hash)
git reset --hard abc1234
```

### Scenario 5: Want to Experiment Safely
```bash
# Create a branch
git checkout -b experiment/new-feature

# Make changes, test them

# If it works, merge to main
git checkout main
git merge experiment/new-feature

# If it doesn't work, just switch back
git checkout main
git branch -D experiment/new-feature
```

## Important Notes

### What Git Tracks
- ✅ All code files (`.ts`, `.tsx`, `.js`, `.json`, etc.)
- ✅ Configuration files
- ✅ Documentation (`.md` files)

### What Git Ignores (via .gitignore)
- ❌ `node_modules/` - Dependencies (too large)
- ❌ `dist/`, `.next/`, `build/` - Build outputs
- ❌ `logs/`, `*.log` - Log files
- ❌ `.env*` - Environment variables (sensitive data)
- ❌ `backups/`, `*.sql` - Database backups
- ❌ IDE files (`.vscode/`, `.idea/`)

### Database Data
- Git **does NOT** track database data
- Use the backup scripts (`backend/scripts/backup-db.ps1`) for database backups
- Git only tracks code, not data

## Best Practices

1. **Commit Often**: Save your work frequently with meaningful messages
2. **Test Before Committing**: Make sure code works before committing
3. **Write Good Commit Messages**: Describe what changed, not just "fix"
4. **Don't Commit Sensitive Data**: API keys, passwords, etc. should be in `.env` files (which are ignored)
5. **Use Branches for Experiments**: Test new features in branches before merging

## Quick Reference

| Command | What It Does |
|---------|-------------|
| `git status` | Show what files changed |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Save changes with a message |
| `git log` | Show commit history |
| `git log --oneline` | Show compact commit history |
| `git diff` | Show what changed |
| `git reset --hard HEAD` | Discard all uncommitted changes |
| `git checkout v1.0-working` | Go back to working version tag |
| `git checkout -b branch-name` | Create and switch to new branch |
| `git checkout main` | Switch back to main branch |

## Getting Help

- View git help: `git help <command>`
- Example: `git help commit`
- Online: [Git Documentation](https://git-scm.com/doc)

## Your Current Checkpoint

You can always return to the working version using:
```bash
git checkout v1.0-working
```

This tag marks the state of your code before starting UI improvements.

