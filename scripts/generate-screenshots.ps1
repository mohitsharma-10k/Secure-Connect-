$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$baseDir = "d:\work\Code\web dev assingment  4"
$screensDir = Join-Path $baseDir "screenshots"

if (!(Test-Path $screensDir)) {
    New-Item -ItemType Directory -Force -Path $screensDir | Out-Null
}

$tasks = @(
    @{ html = "public\compass-notes.html"; out = "mongodb_compass_notes.png"; size = "1280,800" },
    @{ html = "public\compass-users.html"; out = "mongodb_compass_users.png"; size = "1280,800" },
    @{ html = "public\fig1-signup-login.html"; out = "fig1_signup_and_login.png"; size = "1100,750" },
    @{ html = "public\fig2-notes-api.html"; out = "fig2_notes_api.png"; size = "1100,820" },
    @{ html = "public\fig3-terminal-chat.html"; out = "fig3_realtime_chat_socketio.png"; size = "1000,600" }
)

foreach ($t in $tasks) {
    $fullHtml = "file:///" + (Join-Path $baseDir $t.html).Replace("\", "/")
    $fullOut = Join-Path $screensDir $t.out
    Write-Host "Capturing $($t.out)..."
    $argsList = @(
        "--headless",
        "--disable-gpu",
        "--screenshot=$fullOut",
        "--window-size=$($t.size)",
        "$fullHtml"
    )
    Start-Process -FilePath $edge -ArgumentList $argsList -Wait
}

Write-Host "All screenshots captured successfully!"
Get-ChildItem $screensDir
