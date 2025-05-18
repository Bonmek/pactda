#!/bin/powershell
# filepath: d:\work\bonchain\pactda\cross-chain-poc\scripts\setup.ps1
# This script installs dependencies and sets up the project for testing

Write-Host "Setting up PactDA Cross-Chain PoC..." -ForegroundColor Cyan

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install
pnpm add dotenv --save

Write-Host "Creating .env file if it doesn't exist..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env file from .env.example" -ForegroundColor Green
}

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit your .env file to add your VITE_SPONSOR_PRIVATE_KEY" -ForegroundColor White
Write-Host "2. Or generate a new wallet by running 'solana-keygen new -o sponsor_wallet.json'" -ForegroundColor White
Write-Host "3. Extract the private key with 'pnpm extract-key sponsor_wallet.json'" -ForegroundColor White
Write-Host "4. Test your sponsor wallet setup with 'pnpm test:sponsor'" -ForegroundColor White
Write-Host "5. Start the app with 'pnpm dev'" -ForegroundColor White
