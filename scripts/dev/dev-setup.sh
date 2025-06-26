#!/bin/bash
# Development setup script for Celebrum AI Rust project
# Ensures correct Rust toolchain configuration for WASM builds

set -e

echo "🦀 Celebrum AI Development Setup"
echo "=============================="

# Ensure we're using rustup's Rust, not Homebrew's
export PATH="$HOME/.cargo/bin:$PATH"

# Verify Rust toolchain
echo "📋 Checking Rust configuration..."
echo "Rust version: $(rustc --version)"
echo "Cargo version: $(cargo --version)"
echo "Rustc path: $(which rustc)"

# Verify WASM target is installed
echo ""
echo "🎯 Checking WASM target..."
if rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo "✅ WASM target (wasm32-unknown-unknown) is installed"
else
    echo "❌ WASM target not found. Installing..."
    rustup target add wasm32-unknown-unknown
    echo "✅ WASM target installed"
fi

# Verify WASM build works
echo ""
echo "🔨 Testing WASM build..."
if cargo build --target wasm32-unknown-unknown --quiet; then
    echo "✅ WASM build successful"
else
    echo "❌ WASM build failed"
    exit 1
fi

# Verify tests pass
echo ""
echo "🧪 Running tests..."
if cargo test --quiet; then
    echo "✅ All tests passing"
else
    echo "❌ Tests failed"
    exit 1
fi

echo ""
echo "🚀 Development environment ready!"
echo "You can now run:"
echo "  cargo build                          # Native build"
echo "  cargo build --target wasm32-unknown-unknown  # WASM build"
echo "  cargo test                           # Run tests"
echo "  cargo tarpaulin --out html           # Generate coverage report"