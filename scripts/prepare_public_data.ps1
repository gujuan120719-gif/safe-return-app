# ==============================================================================
# 🛡️ 공공데이터포털 CSV ➔ 수퍼베이스(Supabase) 원클릭 자동 정제 스크립트
# ==============================================================================
$downloadsPath = [System.IO.Path]::Combine($env:USERPROFILE, "Downloads")
$outputPath = Join-Path $PSScriptRoot "supabase_import.csv"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [안심 귀가] 공공데이터포털 CSV ➔ 수퍼베이스 변환을 시작합니다." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$allRecords = [System.Collections.Generic.List[PSCustomObject]]::new()

# ------------------------------------------------------------------------------
# 1. 전국보안등정보표준데이터 처리
# ------------------------------------------------------------------------------
$lightFile = Join-Path $downloadsPath "전국보안등정보표준데이터.csv"
if (Test-Path $lightFile) {
    Write-Host "[1/2] 전국보안등정보표준데이터.csv 파일 처리 중..." -ForegroundColor Yellow
    $lines = Get-Content $lightFile -Encoding Default
    if ($lines.Count -gt 1) {
        $headers = $lines[0].Split(',')
        $latIdx = -1; $lngIdx = -1; $nameIdx = -1; $addrIdx = -1

        for ($i=0; $i -lt $headers.Count; $i++) {
            $h = $headers[$i].Trim(' "')
            if ($h -eq '위도') { $latIdx = $i }
            elseif ($h -eq '경도') { $lngIdx = $i }
            elseif ($h -like '*위치명*' -or $h -like '*관리번호*' -or $h -like '*명칭*') { if ($nameIdx -eq -1) { $nameIdx = $i } }
            elseif ($h -like '*도로명주소*' -or $h -like '*지번주소*') { if ($addrIdx -eq -1) { $addrIdx = $i } }
        }

        $count = 0
        for ($i = 1; $i -lt $lines.Count; $i++) {
            $cols = $lines[$i].Split(',')
            if ($cols.Count -gt [Math]::Max($latIdx, $lngIdx) -and $latIdx -ge 0 -and $lngIdx -ge 0) {
                $latStr = $cols[$latIdx].Trim(' "')
                $lngStr = $cols[$lngIdx].Trim(' "')
                $lat = 0.0; $lng = 0.0

                # 대한민국 위경도 범위 유효성 검증 (위도 33~39, 경도 124~132)
                if ([double]::TryParse($latStr, [ref]$lat) -and [double]::TryParse($lngStr, [ref]$lng)) {
                    if ($lat -ge 33.0 -and $lat -le 39.0 -and $lng -ge 124.0 -and $lng -le 132.0) {
                        $name = if ($nameIdx -ge 0 -and $nameIdx -lt $cols.Count) { $cols[$nameIdx].Trim(' "') } else { "가로등/보안등" }
                        if ([string]::IsNullOrWhiteSpace($name)) { $name = "스마트 보안등" }
                        $addr = if ($addrIdx -ge 0 -and $addrIdx -lt $cols.Count) { $cols[$addrIdx].Trim(' "') } else { "" }

                        $allRecords.Add([PSCustomObject]@{
                            type = "STREETLIGHT"
                            name = $name
                            latitude = $lat
                            longitude = $lng
                            address = $addr
                            safety_weight = 1
                        })
                        $count++
                    }
                }
            }
        }
        Write-Host "  -> 보안등/가로등 $count 건 정제 완료!" -ForegroundColor Green
    }
} else {
    Write-Host "[1/2] 전국보안등정보표준데이터.csv 파일을 찾지 못했습니다 (건너뜀)" -ForegroundColor DarkGray
}

# ------------------------------------------------------------------------------
# 2. 전국무인교통단속카메라표준데이터 또는 CCTV 데이터 처리
# ------------------------------------------------------------------------------
$cctvFiles = Get-ChildItem -Path $downloadsPath -Filter "*단속카메라*.csv"
if (-not $cctvFiles) {
    $cctvFiles = Get-ChildItem -Path $downloadsPath -Filter "*CCTV*.csv"
}

if ($cctvFiles) {
    $cctvFile = $cctvFiles[0].FullName
    Write-Host "[2/2] $([System.IO.Path]::GetFileName($cctvFile)) 처리 중..." -ForegroundColor Yellow
    $lines = Get-Content $cctvFile -Encoding Default
    if ($lines.Count -gt 1) {
        $headers = $lines[0].Split(',')
        $latIdx = -1; $lngIdx = -1; $nameIdx = -1; $addrIdx = -1

        for ($i=0; $i -lt $headers.Count; $i++) {
            $h = $headers[$i].Trim(' "')
            if ($h -eq '위도') { $latIdx = $i }
            elseif ($h -eq '경도') { $lngIdx = $i }
            elseif ($h -like '*설치장소*' -or $h -like '*관리기관명*' -or $h -like '*위치명*') { if ($nameIdx -eq -1) { $nameIdx = $i } }
            elseif ($h -like '*도로명주소*' -or $h -like '*지번주소*') { if ($addrIdx -eq -1) { $addrIdx = $i } }
        }

        $count = 0
        for ($i = 1; $i -lt $lines.Count; $i++) {
            $cols = $lines[$i].Split(',')
            if ($cols.Count -gt [Math]::Max($latIdx, $lngIdx) -and $latIdx -ge 0 -and $lngIdx -ge 0) {
                $latStr = $cols[$latIdx].Trim(' "')
                $lngStr = $cols[$lngIdx].Trim(' "')
                $lat = 0.0; $lng = 0.0

                if ([double]::TryParse($latStr, [ref]$lat) -and [double]::TryParse($lngStr, [ref]$lng)) {
                    if ($lat -ge 33.0 -and $lat -le 39.0 -and $lng -ge 124.0 -and $lng -le 132.0) {
                        $name = if ($nameIdx -ge 0 -and $nameIdx -lt $cols.Count) { $cols[$nameIdx].Trim(' "') } else { "방범 CCTV" }
                        if ([string]::IsNullOrWhiteSpace($name)) { $name = "방범 감시 CCTV" }
                        $addr = if ($addrIdx -ge 0 -and $addrIdx -lt $cols.Count) { $cols[$addrIdx].Trim(' "') } else { "" }

                        $allRecords.Add([PSCustomObject]@{
                            type = "CCTV"
                            name = $name
                            latitude = $lat
                            longitude = $lng
                            address = $addr
                            safety_weight = 3
                        })
                        $count++
                    }
                }
            }
        }
        Write-Host "  -> CCTV/카메라 $count 건 정제 완료!" -ForegroundColor Green
    }
} else {
    Write-Host "[2/2] CCTV 관련 CSV 파일을 찾지 못했습니다 (건너뜀)" -ForegroundColor DarkGray
}

# ------------------------------------------------------------------------------
# 3. 수퍼베이스 전용 UTF-8 CSV 파일로 내보내기
# ------------------------------------------------------------------------------
if ($allRecords.Count -gt 0) {
    $allRecords | Export-Csv -Path $outputPath -NoTypeInformation -Encoding utf8
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " [대성공] 총 $($allRecords.Count)건의 안전시설물이 수퍼베이스 규격으로 정제되었습니다!" -ForegroundColor Green
    Write-Host " 생성된 파일: $outputPath" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Cyan
} else {
    Write-Host "정제할 수 있는 유효한 데이터가 없습니다." -ForegroundColor Red
}
