#!/bin/bash

# Core Pipeline Setup Script
# This script sets up the development environment for the Core Pipeline application

set -e

echo "🚀 Core Pipeline Setup Script"
echo "=============================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Error: Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check npm version
echo "📦 Checking npm version..."
NPM_VERSION=$(npm -v | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 10 ]; then
    echo "❌ Error: npm 10+ is required. Current version: $(npm -v)"
    exit 1
fi
echo "✅ npm version: $(npm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Setup environment file
echo ""
echo "🔧 Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
else
    echo "ℹ️  .env file already exists, skipping..."
fi

# Build the application
echo ""
echo "🔨 Building the application..."
npm run build

# Run tests
echo ""
echo "🧪 Running tests..."
npm test

# Check if Docker is installed
echo ""
echo "🐳 Checking Docker..."
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed: $(docker --version)"
    
    # Optional: Build Docker image
    read -p "Do you want to build the Docker image? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🐳 Building Docker image..."
        docker build -t core-pipeline:latest .
        echo "✅ Docker image built successfully"
    fi
else
    echo "ℹ️  Docker is not installed. Docker is optional for local development."
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review and update .env file with your configuration"
echo "2. Start the development server: npm run start:dev"
echo "3. Access the application:"
echo "   - API: http://localhost:3000"
echo "   - Health: http://localhost:3000/health"
echo "   - Swagger: http://localhost:3000/api-docs"
echo "   - Metrics: http://localhost:3000/metrics"
echo ""
echo "Happy coding! 🎉"