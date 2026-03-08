$output = @()

# Step 1: Git Add
$output += "=== Step 1: Git Add ==="
cd 'C:\Users\archi\Documents\campaign-sites-website'
$output += (git add apps/web/src/app/admin/portal/profile/page.tsx apps/web/src/lib/webauthn-challenge.ts 2>&1)
$output += "Exit code: $LASTEXITCODE"

# Step 2: Git Commit  
$output += "`n=== Step 2: Git Commit ==="
$output += (git commit -m "fix: profile layout + passkey DB-first challenge storage`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" 2>&1)
$output += "Exit code: $LASTEXITCODE"

# Step 3: Git Push
$output += "`n=== Step 3: Git Push ==="
$output += (git push origin main 2>&1)
$output += "Exit code: $LASTEXITCODE"

# Write to file
$output | Out-File 'C:\Users\archi\Documents\campaign-sites-website\git-output.txt' -Encoding UTF8

# Also output to console
$output | Write-Host
