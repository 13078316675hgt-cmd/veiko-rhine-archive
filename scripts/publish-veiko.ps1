param(
  [string]$Message = 'Update VEIKO Rhine archive site'
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$gitDirectory = Join-Path $projectRoot '.veiko.git'
$repository = '13078316675hgt-cmd/veiko-rhine-archive'
$apiRoot = "https://api.github.com/repos/$repository"

if (-not (Test-Path -LiteralPath $gitDirectory)) {
  throw 'Independent VEIKO Git metadata is missing.'
}

$credential = "protocol=https`nhost=github.com`n`n" | git credential fill
$tokenLine = $credential | Where-Object { $_ -like 'password=*' }
if (-not $tokenLine) {
  throw 'GitHub credential is unavailable.'
}

$headers = @{
  Authorization = "Bearer $($tokenLine.Substring(9))"
  Accept = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}

function Invoke-GitHubJson {
  param(
    [string]$Method,
    [string]$Uri,
    [object]$Body
  )

  $parameters = @{
    Method = $Method
    Uri = $Uri
    Headers = $headers
    ContentType = 'application/json'
  }
  if ($null -ne $Body) {
    $parameters.Body = $Body | ConvertTo-Json -Depth 8 -Compress
  }
  Invoke-RestMethod @parameters
}

Push-Location $projectRoot
try {
  pnpm run build
  if ($LASTEXITCODE -ne 0) {
    throw 'Production build failed; publication was cancelled.'
  }

  git --git-dir="$gitDirectory" --work-tree="$projectRoot" add -A
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to stage the VEIKO publication files.'
  }

  git --git-dir="$gitDirectory" --work-tree="$projectRoot" diff --cached --quiet
  $diffStatus = $LASTEXITCODE
  if ($diffStatus -eq 1) {
    git --git-dir="$gitDirectory" --work-tree="$projectRoot" commit -m $Message
    if ($LASTEXITCODE -ne 0) {
      throw 'Unable to create the VEIKO publication commit.'
    }
  } elseif ($diffStatus -ne 0) {
    throw 'Unable to inspect VEIKO publication changes.'
  }
} finally {
  Pop-Location
}

$relativePaths = @(git --git-dir="$gitDirectory" --work-tree="$projectRoot" ls-tree -r --name-only HEAD)
if ($LASTEXITCODE -ne 0 -or $relativePaths.Count -eq 0) {
  throw 'No VEIKO deployment files were found.'
}

$treeEntries = foreach ($relativePath in $relativePaths) {
  $fullPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $relativePath))
  if (-not $fullPath.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to publish a path outside the project: $relativePath"
  }

  $blobBody = @{
    content = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($fullPath))
    encoding = 'base64'
  }
  $blob = Invoke-GitHubJson -Method Post -Uri "$apiRoot/git/blobs" -Body $blobBody
  [pscustomobject]@{
    path = $relativePath.Replace('\', '/')
    mode = '100644'
    type = 'blob'
    sha = $blob.sha
  }
  Write-Progress -Activity 'Publishing VEIKO' -Status $relativePath -PercentComplete 0
}

$tree = Invoke-GitHubJson -Method Post -Uri "$apiRoot/git/trees" -Body @{ tree = @($treeEntries) }
$parents = @()
try {
  $current = Invoke-GitHubJson -Method Get -Uri "$apiRoot/git/ref/heads/main" -Body $null
  $parents = @($current.object.sha)
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 404 -and $_.Exception.Response.StatusCode.value__ -ne 409) {
    throw
  }
}

$commit = Invoke-GitHubJson -Method Post -Uri "$apiRoot/git/commits" -Body @{
  message = $Message
  tree = $tree.sha
  parents = $parents
}

if ($parents.Count -eq 0) {
  Invoke-GitHubJson -Method Post -Uri "$apiRoot/git/refs" -Body @{
    ref = 'refs/heads/main'
    sha = $commit.sha
  } | Out-Null
} else {
  Invoke-GitHubJson -Method Patch -Uri "$apiRoot/git/refs/heads/main" -Body @{
    sha = $commit.sha
    force = $false
  } | Out-Null
}

git --git-dir="$gitDirectory" config branch.main.remote origin
git --git-dir="$gitDirectory" config branch.main.merge refs/heads/main
Write-Progress -Activity 'Publishing VEIKO' -Completed
Write-Output "Published $($relativePaths.Count) files at commit $($commit.sha)."
