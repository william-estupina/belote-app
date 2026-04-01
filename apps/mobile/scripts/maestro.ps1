param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("check-syntax", "test")]
  [string]$Commande
)

$repertoireProjet = Split-Path -Path $PSScriptRoot -Parent
$repertoireFlowsSource = Join-Path $repertoireProjet ".maestro"
$repertoireTemporaire = Join-Path $env:TEMP ("belote-maestro-" + [guid]::NewGuid().ToString("N"))
$repertoireFlowsTemporaire = Join-Path $repertoireTemporaire "flows"

if (-not (Test-Path -LiteralPath $repertoireFlowsSource)) {
  throw "Dossier Maestro introuvable: $repertoireFlowsSource"
}

try {
  New-Item -ItemType Directory -Path $repertoireFlowsTemporaire -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $repertoireFlowsSource "*") -Destination $repertoireFlowsTemporaire -Recurse -Force

  if ($Commande -eq "check-syntax") {
    Get-ChildItem -LiteralPath $repertoireFlowsTemporaire -Filter "*.yaml" -File | ForEach-Object {
      & maestro check-syntax $_.FullName
      if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
      }
    }

    exit 0
  }

  & maestro test $repertoireFlowsTemporaire
  exit $LASTEXITCODE
} finally {
  if (Test-Path -LiteralPath $repertoireTemporaire) {
    Remove-Item -LiteralPath $repertoireTemporaire -Recurse -Force
  }
}
