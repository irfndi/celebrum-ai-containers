#!/bin/bash
# Build script for TypeScript and Go services
set -euo pipefail

echo "🚀 Building Celebrum AI services..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build TypeScript packages
echo "🔨 Building TypeScript packages..."
pnpm run build

# Build Go container if needed
if [ -f "container_src/go.mod" ]; then
    echo "🐹 Building Go container..."
    cd container_src
    go mod tidy
    go build -o ../dist/container .
    cd ..
fi

echo "✅ Build completed successfully!"