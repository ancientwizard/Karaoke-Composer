# GitHub Pages Deployment Workflow

## Overview

This document describes the automated deployment process for Karaoke Composer to GitHub Pages. The workflow enables automatic deployment of the built application to GitHub Pages, allowing users to access the latest version directly from the repository.

## 🎯 Goals

- **Automated Deployment**: Single command (`npm run deploy-gh-pages`) to build and deploy
- **Version Management**: Semantic versioning starting at 0.1.0 (alpha stage)
- **Branch Strategy**: Use `gh-pages` branch for built artifacts (keeps source and builds separate)
- **User Access**: Latest deployment automatically visible at `https://ancientwizard.github.io/Karaoke-Composer/`
- **Manual Control**: Developer decides when to deploy (no automatic deployments)

## 📝 Configuration Decisions

### Deployment Settings
- **Hosting URL**: `https://ancientwizard.github.io/Karaoke-Composer/` (subpath)
- **Deployment Branch**: `gh-pages` (standard GitHub Pages convention)
- **Build Artifacts**: Only `dist/` folder contents (production build only, no source maps or docs)
- **Custom Domain**: None (using default GitHub Pages URL)
- **Environment**: 100% browser-based, no environment variables or API keys needed

### Version Management
- **Starting Version**: `0.1.0` (alpha stage)
- **Auto-increment**: Patch version automatically incremented on each deploy
- **User Control**: Prompted to edit or accept the suggested version
- **Version Format**: Semantic versioning `MAJOR.MINOR.PATCH`

### Pre-deployment Checks (with override prompts)
- ✅ Verify clean git state (no uncommitted changes)
- ✅ Run tests (`npm test`)
- ✅ Run linting (`npm run lint`)
- ✅ Verify on main branch
- ⚠️ All checks can be overridden if user confirms

### Post-deployment Actions
- ✅ Create git tag for each deployment (e.g., `v0.1.0`)
- ✅ Display deployment URL after success
- ✅ Generate deployment log entry

## 💡 Understanding GitHub Pages Branches

**Why `gh-pages` branch?**
- **Separation of Concerns**: Source code stays on `main`, built files on `gh-pages`
- **Clean History**: Build artifacts don't clutter main branch history
- **Standard Convention**: GitHub Pages automatically serves from `gh-pages` branch
- **Easy Cleanup**: Old builds can be force-pushed over without affecting source code

**How it works:**
1. Your source code lives on `main` branch
2. Deployment script builds your app into `dist/` folder
3. Contents of `dist/` are pushed to `gh-pages` branch root
4. GitHub Pages serves `gh-pages` branch at your URL
5. Users only see the built app, never your source code

---

## 🗂️ Proposed Directory Structure

```
Karaoke-Composer/
├── bin/
│   └── deploy-gh-pages.js      # Deployment script
├── docs/
│   └── GH-PAGES-WORKFLOW.md    # This file
├── package.json                # Updated with deploy script and version 0.1.0
├── vite.config.ts              # May need base path configuration
└── dist/                       # Build output (git-ignored)
```

---

## 🔄 Deployment Workflow Steps

When you run `npm run deploy-gh-pages`, the script will execute the following steps:

### 1. Pre-flight Checks (with override prompts)
- ✅ Verify you're on the `main` branch
- ✅ Check for uncommitted changes (prompt to continue or abort)
- ✅ Run linting (`npm run lint`) - can skip if fails
- ✅ Run tests (`npm test`) - can skip if fails
- ℹ️ User can override any failed checks and continue

### 2. Version Management
- 📖 Read current version from `package.json` (e.g., `0.1.0`)
- 🔢 Auto-increment patch version (e.g., `0.1.0` → `0.1.1`)
- ✏️ Prompt user to accept or edit the version
- 💾 Update `package.json` with new version
- 📝 Commit version bump to main branch

### 3. Build Process
- 🔨 Set `GITHUB_PAGES=true` environment variable
- 🏗️ Run `npm run build:gh-pages` (builds with `/Karaoke-Composer/` base path)
- ✅ Verify build succeeded (check `dist/index.html` exists)

### 4. Deployment to gh-pages Branch
- 🔀 Switch to `gh-pages` branch (create if doesn't exist)
- 🗑️ Clear all files except `.git/` directory
- 📦 Copy entire contents of `dist/` to branch root
- 💾 Commit build artifacts with message: `Deploy v{version}`
- 🏷️ Create git tag `v{version}` pointing to this commit
- 🚀 Push `gh-pages` branch and tags to remote

### 5. Post-deployment
- 🔙 Switch back to `main` branch
- 📊 Append deployment entry to `.deployments.log` (timestamp, version, commit hash)
- ✅ Display success message with deployment URL
- 🔗 Show link: `https://ancientwizard.github.io/Karaoke-Composer/`
- ⏰ Remind user to wait 1-2 minutes for GitHub Pages to update

### 6. Error Handling
- ❌ If any step fails, display clear error message
- 🔄 Automatic rollback: return to main branch and restore git state
- 📋 Log error details for troubleshooting

---

## 📝 Branch & Version Strategy

### Deployment Branch: `gh-pages`
- **Purpose**: Contains only production-ready built artifacts
- **Structure**: Root of branch contains `index.html` and assets (no subdirectories)
- **Updates**: Only updated via deployment script, never edit manually
- **History**: Each deployment creates a new commit; can be force-pushed to save space
- **Cleanup**: Old deployments can be removed by force-pushing newer builds

### Version Tags
- **Format**: `v{MAJOR}.{MINOR}.{PATCH}` (e.g., `v0.1.0`, `v0.2.0`, `v1.0.0`)
- **Purpose**: Mark specific releases and track deployment history
- **Location**: Tags point to commits on `gh-pages` branch
- **Naming**: Always start with `v` prefix for consistency
- **Deletion**: Old tags can be deleted if needed to clean up history

### Semantic Versioning Guide
- **Patch** (`0.1.0` → `0.1.1`): Bug fixes, typos, minor tweaks
- **Minor** (`0.1.0` → `0.2.0`): New features, enhancements (backwards compatible)
- **Major** (`0.9.0` → `1.0.0`): Breaking changes, major milestones, API changes

### Version Lifecycle
- **0.x.x**: Alpha/Beta phase (current, experimental features)
- **1.0.0**: First stable release (production-ready)
- **2.0.0+**: Major versions with significant changes

---

## 🤖 Automation Scripts

### 1. `npm run deploy-gh-pages`
**Main deployment command** - Executes the complete workflow.

**Implementation**: Node.js script at `bin/deploy-gh-pages.js`

**Features**:
- ✅ Interactive prompts for version and override decisions
- ✅ Colored console output for clear status messages
- ✅ Comprehensive error handling with automatic rollback
- ✅ Cross-platform compatibility (Windows/Mac/Linux)
- ✅ Deployment logging to `.deployments.log`
- ✅ Progress indicators for long-running steps

**Usage**:
```bash
npm run deploy-gh-pages
```

### 2. `npm run build:gh-pages`
**GitHub Pages-specific build** - Builds with correct base path for subpath hosting.

**Implementation**: Vite build command with environment variable

**Configuration**: Sets `GITHUB_PAGES=true` to trigger base path `/Karaoke-Composer/`

**Usage** (typically called by deployment script):
```bash
npm run build:gh-pages
```

### 3. `npm run version:bump`
**Standalone version utility** - Bump version without deploying.

**Implementation**: Simple Node.js script at `bin/bump-version.js`

**Usage**:
```bash
npm run version:bump       # Interactive prompt
npm run version:bump patch # Auto-increment patch
npm run version:bump minor # Auto-increment minor
npm run version:bump major # Auto-increment major
```

### 4. Deployment Log: `.deployments.log`
**Track deployment history** - Automatically maintained by deployment script.

**Format**:
```
[2025-10-19 14:23:45] v0.1.0 - commit abc1234 - SUCCESS
[2025-10-19 15:10:32] v0.1.1 - commit def5678 - SUCCESS
```

**Location**: Root of repository (git-ignored)

---

## 🚀 Implementation Plan

### Phase 1: Configuration
1. ✅ Create `bin/` directory in project root
2. ✅ Update `package.json`:
   - Set version to `0.0.1`
   - Add `deploy-gh-pages`, `build:gh-pages`, and `version:bump` scripts
3. ✅ Update `vite.config.ts` with base path configuration
4. ✅ Add `.deployments.log` to `.gitignore`

### Phase 2: Build Script Utilities
1. ✅ Create `bin/bump-version.js` - Version management utility
2. ✅ Create `bin/utils.js` - Shared utilities (colors, prompts, git commands)
3. ✅ Test version bumping in isolation

### Phase 3: Core Deployment Script
1. ✅ Create `bin/deploy-gh-pages.js` with main workflow:
   - Pre-flight checks with override prompts
   - Version management integration
   - Build process execution
   - Git branch operations
   - Deployment to gh-pages
2. ✅ Implement error handling and rollback mechanisms
3. ✅ Add colored console output and progress indicators

### Phase 4: Testing & Validation
1. Test deployment script in dry-run mode
2. Perform first real deployment to GitHub Pages
3. Verify app loads correctly at deployment URL
4. Test override prompts and error handling
5. Verify deployment log is created

### Phase 5: Documentation
1. Add deployment section to main `README.md`
2. Document troubleshooting common issues
3. Create example deployment workflow

**Total Estimated Time**: 4.5-5.5 hours

---

## 📦 Package.json Updates

```json
{
  "name": "karaoke-composer",
  "version": "0.1.0",
  "scripts": {
    "deploy-gh-pages": "node bin/deploy-gh-pages.js",
    "version:bump": "node bin/bump-version.js",
    "build:gh-pages": "vite build --base=/Karaoke-Composer/"
  }
}
```

---

## 🔧 Vite Configuration

To deploy to the subpath `https://ancientwizard.github.io/Karaoke-Composer/`, we need to configure Vite's `base` option.

**Update `vite.config.ts`**:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  // Set base path for GitHub Pages subpath deployment
  base: process.env.GITHUB_PAGES === 'true'
    ? '/Karaoke-Composer/'
    : '/',

  // ... rest of your existing config
  plugins: [vue()],
  // etc.
})
```

**How it works**:
- **Local Development** (`npm run dev`): Base path is `/` (root)
- **GitHub Pages Build** (`npm run build:gh-pages`): Base path is `/Karaoke-Composer/`
- **Environment Variable**: `GITHUB_PAGES=true` triggers the subpath base
- **Asset Paths**: Vite automatically adjusts all asset URLs (CSS, JS, images) to include the base path

**Why this matters**:
Without the correct base path, your app will try to load assets from `https://ancientwizard.github.io/assets/...` (which doesn't exist) instead of `https://ancientwizard.github.io/Karaoke-Composer/assets/...`

---

## 🎓 Usage Guide

### First-Time GitHub Pages Setup

Before your first deployment, enable GitHub Pages in your repository:

1. Go to your repository on GitHub: `https://github.com/ancientwizard/Karaoke-Composer`
2. Click **Settings** → **Pages** (in left sidebar)
3. Under **Source**, select:
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
4. Click **Save**
5. GitHub will display your site URL: `https://ancientwizard.github.io/Karaoke-Composer/`

**Note**: The `gh-pages` branch will be created automatically on your first deployment.

---

### Regular Deployment Workflow

```bash
# 1. Ensure your changes are committed
git status                    # Check for uncommitted changes
git add .
git commit -m "feat: add new feature"

# 2. Run deployment script
npm run deploy-gh-pages

# 3. Follow interactive prompts:
#    ✓ Current version: 0.1.0
#    ✓ Suggested version: 0.1.1
#    ? Accept version 0.1.1? (Y/n):     # Press Enter to accept, or type new version
#
#    ✓ Uncommitted changes detected!
#    ? Continue anyway? (y/N):          # Type 'y' to override if needed
#
#    ✓ Running tests...
#    ✓ Tests passed!
#
#    ✓ Running lint...
#    ✓ Lint passed!
#
#    ✓ Building for GitHub Pages...
#    ✓ Build complete!
#
#    ✓ Deploying to gh-pages branch...
#    ✓ Creating tag v0.1.1...
#    ✓ Pushing to remote...
#
#    ✅ Deployment successful!
#    🔗 https://ancientwizard.github.io/Karaoke-Composer/
#    ⏰ Please wait 1-2 minutes for GitHub Pages to update

# 4. Wait for GitHub Pages to rebuild (1-2 minutes)

# 5. Visit your deployment URL to verify
```

---

### Version Bumping Without Deployment

If you just want to bump the version in `package.json` without deploying:

```bash
# Interactive prompt
npm run version:bump

# Or specify bump type
npm run version:bump patch  # 0.1.0 → 0.1.1
npm run version:bump minor  # 0.1.0 → 0.2.0
npm run version:bump major  # 0.9.0 → 1.0.0
```

---

### Overriding Safety Checks

The deployment script includes safety checks that can be overridden:

- **Uncommitted Changes**: Script warns but allows continuation
- **Failed Tests**: You can choose to deploy anyway (not recommended)
- **Failed Linting**: You can choose to deploy anyway (not recommended)
- **Not on Main Branch**: Script will abort (this cannot be overridden)

**Best Practice**: Always fix issues rather than override, but overrides are available for emergency deployments.

---

## ⚠️ Important Notes

### Git State Management
- ✅ **Always commit your work before deploying** - The script checks for uncommitted changes
- ✅ **Stay on main branch** - Deployment must be initiated from `main` branch
- ⚠️ **Override with caution** - You can override checks, but it's not recommended

### Branch Management
- 🚫 **Never manually edit `gh-pages` branch** - Only the script should update it
- 🗑️ **Can force-push to `gh-pages`** - Old builds can be overwritten to save space
- 🏷️ **Tags are permanent** - Once pushed, tags mark specific versions

### Version Control Best Practices
- 📈 **Always increment forward** - Don't decrease version numbers
- 📋 **Follow semantic versioning**:
  - **Patch** (0.1.0 → 0.1.1): Bug fixes, typos, small tweaks
  - **Minor** (0.1.0 → 0.2.0): New features, enhancements
  - **Major** (0.9.0 → 1.0.0): Breaking changes, complete rewrites
- 🎯 **Save 1.0.0 for production** - Use 0.x.x during development

### GitHub Pages Limitations
- 💾 **Storage**: 1GB soft limit
- 📊 **Bandwidth**: 100GB/month
- ⏱️ **Build Time**: 1-2 minutes for changes to appear
- 🔒 **HTTPS**: Automatically enabled (cannot be disabled)
- 🌐 **No Server-Side Code**: Static files only (perfect for Vue apps!)

### Deployment Log
- 📝 `.deployments.log` tracks all deployments locally
- 🚫 Git-ignored (not pushed to repository)
- ℹ️ Useful for debugging and tracking deployment history
- 🗑️ Can be deleted safely (will be recreated on next deploy)

---

## 🐛 Troubleshooting

### Deployment fails with "not a git repository"
- Ensure you're running the command from the project root
- Verify `.git/` directory exists

### GitHub Pages shows 404
- Check GitHub Pages settings (Settings → Pages)
- Verify `gh-pages` branch has `index.html` in root
- Wait 1-2 minutes for propagation

### Assets not loading (404 on CSS/JS)
- Check Vite `base` configuration matches deployment path
- Verify asset paths in `dist/index.html` are correct

### Permission denied when pushing
- Check GitHub authentication (SSH keys or personal access token)
- Verify you have write access to the repository

---

## 📚 References

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#github-pages)
- [Semantic Versioning](https://semver.org/)
- [gh-pages npm package](https://www.npmjs.com/package/gh-pages) (alternative tool)

---

## ✅ Next Steps

Now that the workflow is documented, here's what to do:

### 1. Review & Approve ✓
- [x] Review this documentation
- [x] Confirm configuration decisions
- [ ] Ask any remaining questions

### 2. Implementation Phase
- [ ] Create `bin/` directory
- [ ] Update `package.json` (version → `0.1.0`, add scripts)
- [ ] Update `vite.config.ts` (add base path configuration)
- [ ] Create deployment scripts (`deploy-gh-pages.js`, `bump-version.js`, `utils.js`)
- [ ] Test deployment script locally

### 3. First Deployment
- [ ] Run `npm run deploy-gh-pages` for the first time
- [ ] Enable GitHub Pages in repository settings
- [ ] Verify deployment at `https://ancientwizard.github.io/Karaoke-Composer/`

### 4. Documentation Updates
- [ ] Add deployment section to main `README.md`
- [ ] Document common troubleshooting scenarios
- [ ] Update project status/roadmap

---

## ❓ Open Questions

Have questions or concerns about the workflow? Add them here:

### Q: [Your question here]
**A**: [Answer will be added]

---

**Document Status**: ✅ Ready for Implementation
**Document Version**: 2.0
**Last Updated**: October 19, 2025
**Next Review**: After first successful deployment
