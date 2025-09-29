# GitHub Workflows

## Simple CI/CD Setup (3 workflows only)

### 1. `ci.yml` - Tests & Linting
**Triggers:** Pull requests and pushes to main/develop
**Jobs:**
- **Lint & Type Check** - ESLint, Prettier, TypeScript build
- **Tests (Unit & E2E)** - Jest tests with PostgreSQL and Redis

### 2. `deploy.yml` - Deployment
**Triggers:** 
- **Automatic:** Push to main → Production deployment
- **Manual:** workflow_dispatch → Choose development or production

**Process:**
1. Build and push Docker image to GitHub Container Registry
2. Update Helm charts in `uz0/core-charts` repository
3. Create GitHub deployment records

### 3. `pr-deploy.yml` - PR Deploy Link
**Triggers:** Pull request opened or synchronized
**Purpose:** Adds deployment link and instructions to PR comments

## How to Deploy

### Production (Automatic)
✅ **Merge to `main` branch** → Auto deploys to production
- URL: https://core-pipeline.theedgestory.org

### Development (Manual)
From any branch or PR:
1. **Click the deployment link in PR comment** 
2. Or go to **Actions → Deploy → Run workflow**
3. Select your branch and "development" environment
- URL: https://dev.core-pipeline.theedgestory.org

## Required Secrets
- `CORE_CHARTS_PAT` - Personal Access Token for `uz0/core-charts` repository