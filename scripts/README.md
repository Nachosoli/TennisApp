# Status Generation Script

## Overview

The `generate-status.js` script automatically generates `PROJECT_STATUS.html` from `LIVE_STATUS.md`. This ensures the HTML dashboard always reflects the current project status without manual HTML editing.

## Usage

### Generate Status HTML

```bash
npm run generate-status
```

Or directly:

```bash
node scripts/generate-status.js
```

## How It Works

1. **Reads** `LIVE_STATUS.md` from the project root
2. **Parses** the markdown to extract:
   - Overall progress percentages
   - Phase statuses and tasks
   - Frontend development tasks
   - Critical path items
   - Summary statistics
3. **Generates** `PROJECT_STATUS.html` with the same visual design

## Workflow

### Recommended Workflow

1. **Update** `LIVE_STATUS.md` when project status changes
2. **Run** `npm run generate-status` to regenerate HTML
3. **View** `PROJECT_STATUS.html` in your browser

### When to Update

- After completing major features
- After finishing a phase
- Weekly/monthly status reviews
- Before important presentations
- After agent work is completed

## File Structure

```
.
├── LIVE_STATUS.md          # Source of truth (edit this)
├── PROJECT_STATUS.html     # Generated file (auto-generated)
└── scripts/
    └── generate-status.js  # Generation script
```

## What Gets Parsed

The script extracts:

- **Summary Statistics**: Backend, Frontend, Database, Testing, Documentation, DevOps percentages
- **Phases**: All 6 phases with their tasks and statuses
- **Frontend Tasks**: All frontend development tasks
- **Critical Path**: High, Medium, Low priority items
- **Last Updated**: Date from the markdown file

## Status Indicators

The script recognizes these status indicators:

- `✅ Complete` → Green badge, complete task card
- `⏳ Partial` → Yellow badge, partial task card  
- `⏳ Pending` → Red badge, pending task card
- `✅ MOSTLY COMPLETE` → Blue badge

## Troubleshooting

### Script fails to run

- Ensure Node.js 18+ is installed
- Check that `LIVE_STATUS.md` exists in project root
- Verify file permissions

### HTML doesn't update

- Check console for error messages
- Verify `LIVE_STATUS.md` format matches expected structure
- Ensure write permissions for `PROJECT_STATUS.html`

### Missing data in HTML

- Check that `LIVE_STATUS.md` has the required sections
- Verify markdown table format is correct
- Look for parsing errors in console output

## Integration

### Pre-commit Hook (Optional)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
npm run generate-status
git add PROJECT_STATUS.html
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Generate Status HTML
  run: npm run generate-status
  
- name: Commit Status HTML
  run: |
    git config user.name "CI"
    git config user.email "ci@example.com"
    git add PROJECT_STATUS.html
    git commit -m "Update project status HTML" || exit 0
```

## Notes

- The HTML file is **auto-generated** - don't edit it manually
- Always edit `LIVE_STATUS.md` instead
- The script preserves the original HTML styling and structure
- Generated HTML includes a footer note indicating it's auto-generated

