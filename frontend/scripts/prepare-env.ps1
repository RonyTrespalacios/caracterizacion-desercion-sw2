Param(
  [Parameter(Mandatory=$true)]
  [string]$ApiBaseUrl
)

(Get-Content src/environments/environment.prod.ts) `
  -replace '\$\{API_BASE_URL\}', $ApiBaseUrl `
  | Set-Content src/environments/environment.prod.ts
