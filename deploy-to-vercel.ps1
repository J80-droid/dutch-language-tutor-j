# Script om API key naar Vercel te pushen en te deployen
$envFile = ".env.local"

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'GEMINI_API_KEY=(.+)') {
        $apiKey = $matches[1].Trim()
        
        if ($apiKey -eq 'PLACEHOLDER_API_KEY' -or $apiKey -eq '') {
            Write-Host "❌ API key is nog niet ingesteld. Vul je GEMINI_API_KEY in in .env.local" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ API key gevonden, pushen naar Vercel..." -ForegroundColor Green
        
        # Push naar alle environments
        echo $apiKey | vercel env add GEMINI_API_KEY production --force
        echo $apiKey | vercel env add GEMINI_API_KEY preview --force  
        echo $apiKey | vercel env add GEMINI_API_KEY development --force
        
        Write-Host "✅ Environment variables toegevoegd aan Vercel" -ForegroundColor Green
        Write-Host "🚀 Deployen naar production..." -ForegroundColor Cyan
        
        # Deploy naar production
        vercel --prod --yes
        
        Write-Host "✅ Deployment voltooid!" -ForegroundColor Green
    } else {
        Write-Host "❌ Geen GEMINI_API_KEY gevonden in .env.local" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ .env.local bestand niet gevonden" -ForegroundColor Red
    exit 1
}

