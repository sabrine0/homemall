param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,

  [string]$SuperAdminEmail = "admin@homemall.local",

  [string]$SuperAdminPassword = "Admin12345!",

  [string]$ManagerEmail = "",

  [string]$ManagerPassword = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Push-Location $repoRoot

try {
  $env:DATABASE_URL = $DatabaseUrl
  $env:SUPER_ADMIN_EMAIL = $SuperAdminEmail
  $env:SUPER_ADMIN_PASSWORD = $SuperAdminPassword

  if ($ManagerEmail) {
    $env:MANAGER_EMAIL = $ManagerEmail
  } else {
    Remove-Item Env:MANAGER_EMAIL -ErrorAction SilentlyContinue
  }

  if ($ManagerPassword) {
    $env:MANAGER_PASSWORD = $ManagerPassword
  } else {
    Remove-Item Env:MANAGER_PASSWORD -ErrorAction SilentlyContinue
  }

  Write-Host "Running Prisma migrations against the target database..."
  corepack pnpm --filter @homemall/api prisma:deploy
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  Write-Host "Running seed data..."
  corepack pnpm --filter @homemall/api prisma:seed
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  Write-Host "Remote database bootstrap completed."
}
finally {
  Pop-Location
}
