# GitHub Workflows Documentation

This repository uses GitHub Actions for CI/CD with the following workflows:

## Workflows Overview

### 1. CI (`ci.yml`)
**Trigger**: Pull requests and pushes to main/develop branches
**Purpose**: Run tests, linting, and build checks
**Jobs**:
- `lint`: ESLint and Prettier checks
- `unit-tests`: Jest unit tests with coverage
- `e2e-tests`: End-to-end tests (optional, runs on push or with 'run-e2e' in commit)
- `build`: TypeScript build validation
- `docker-build`: Docker image build test

### 2. Deploy to Kubernetes (`deploy.yml`)
**Trigger**: 
- Automatic: Push to main (→ production) or develop (→ development)
- Manual: workflow_dispatch with environment selection
**Purpose**: Deploy application to production or development environments
**Features**:
- Builds and pushes Docker images to GitHub Container Registry
- Updates Helm charts in `uz0/core-charts` repository
- Creates GitHub deployment records for visibility
- Supports manual deployment of any branch

### 3. Deploy PR (`deploy-pr.yml`)
**Trigger**: 
- PR comments: `/deploy` or `/deploy-dev`
- Manual: workflow_dispatch with PR number
**Purpose**: Deploy pull requests to isolated development environments
**Features**:
- Permission checking (requires write access)
- Creates PR-specific Helm values
- Isolated deployments at `https://pr-{number}.dev.theedgestory.org`
- Cleanup with `/undeploy` command
- GitHub deployment records

### 4. Deploy Preview (`pr-deploy-button.yml`)
**Trigger**: PR opened/synchronized/reopened/closed
**Purpose**: Show deployment instructions and status on PRs
**Features**:
- Adds deployment instructions comment on new PRs
- Shows "Deploy Preview" status check
- Checks for existing deployments
- Cleanup reminders when PR is closed

## Environment Variables Required

### GitHub Secrets
- `CORE_CHARTS_PAT`: Personal Access Token with repo scope for `uz0/core-charts`
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Deployment Environments
- **production**: Main branch deployments
- **development**: Develop branch deployments  
- **pr-{number}**: Pull request deployments (transient)

## How to Deploy

### Production Deployment
1. Merge PR to main branch → Automatic deployment
2. Or manually: Actions → Deploy to Kubernetes → Run workflow → Select "production"

### Development Deployment
1. Merge PR to develop branch → Automatic deployment
2. Or manually: Actions → Deploy to Kubernetes → Run workflow → Select "development"

### PR Deployment
1. Comment `/deploy` on any PR
2. Or manually: Actions → Deploy PR to Development → Run workflow → Enter PR number

## Deployment URLs
- Production: `https://core-pipeline.theedgestory.org`
- Development: `https://core-pipeline.dev.theedgestory.org`
- PR Deployments: `https://pr-{number}.dev.theedgestory.org`