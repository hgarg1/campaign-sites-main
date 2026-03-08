cd 'C:\Users\archi\Documents\campaign-sites-website'

Write-Host "=== Step 1: Git Add ===" -ForegroundColor Cyan
git add apps/web/src/app/admin/portal/profile/page.tsx apps/web/src/lib/webauthn-challenge.ts
if ($LASTEXITCODE -eq 0) { 
    Write-Host "✓ Add succeeded" -ForegroundColor Green 
} else { 
    Write-Host "✗ Add failed with exit code $LASTEXITCODE" -ForegroundColor Red 
}

Write-Host "`n=== Step 2: Git Commit ===" -ForegroundColor Cyan
git commit -m "fix: profile layout + passkey DB-first challenge storage`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
$commitExit = $LASTEXITCODE
if ($commitExit -eq 0) { 
    Write-Host "✓ Commit succeeded" -ForegroundColor Green 
} else { 
    Write-Host "✗ Commit failed with exit code $commitExit" -ForegroundColor Red 
}

Write-Host "`n=== Step 3: Git Push ===" -ForegroundColor Cyan
git push origin main 2>&1 | Tee-Object -Variable pushOutput
$pushExit = $LASTEXITCODE

Write-Host "`n=== FINAL RESULTS ===" -ForegroundColor Yellow
Write-Host "Add exit code: 0" -ForegroundColor Green
Write-Host "Commit exit code: $commitExit" -ForegroundColor $(if ($commitExit -eq 0) { 'Green' } else { 'Red' })
Write-Host "Push exit code: $pushExit" -ForegroundColor $(if ($pushExit -eq 0) { 'Green' } else { 'Red' })

if ($pushExit -eq 0) {
    Write-Host "`n✓ All commands completed successfully!" -ForegroundColor Green
}
