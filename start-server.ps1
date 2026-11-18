param(
    [int]$Port = 8080,
    [switch]$NoBrowser
)

$Root = $PSScriptRoot
$Prefix = "http://localhost:$Port/"

$MimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.mjs'  = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.png'  = 'image/png'
    '.webp' = 'image/webp'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.mp3'  = 'audio/mpeg'
    '.wav'  = 'audio/wav'
    '.ogg'  = 'audio/ogg'
    '.mp4'  = 'video/mp4'
    '.mov'  = 'video/mp4'
    '.woff2'= 'font/woff2'
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)
$Listener.Start()

Write-Host "A Letter to Liana — Chapter 21" -ForegroundColor Magenta
Write-Host "Serving at $Prefix (Press Ctrl+C to stop)" -ForegroundColor Yellow

if (-not $NoBrowser) {
    Start-Process $Prefix
}

try {
    while ($Listener.IsListening) {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        try {
            $RelPath = [System.Uri]::UnescapeDataString($Request.Url.AbsolutePath.TrimStart('/'))
            if ([string]::IsNullOrWhiteSpace($RelPath)) { $RelPath = 'index.html' }

            $SafePath = $RelPath -replace '/', '\'
            $FullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $SafePath))

            if (-not $FullPath.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $FullPath -PathType Leaf)) {
                $Response.StatusCode = 404
                if ($Request.HttpMethod -ne 'HEAD') {
                    $Buf = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                    $Response.ContentLength64 = $Buf.Length
                    $Response.OutputStream.Write($Buf, 0, $Buf.Length)
                }
                $Response.OutputStream.Close()
                continue
            }

            $FileInfo = Get-Item $FullPath
            $FileLen = $FileInfo.Length
            $Ext = $FileInfo.Extension.ToLowerInvariant()
            $Response.ContentType = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { 'application/octet-stream' }
            $Response.Headers.Add('Accept-Ranges', 'bytes')
            $Response.Headers.Add('Cache-Control', 'no-cache')

            if ($Request.HttpMethod -eq 'HEAD') {
                $Response.ContentLength64 = $FileLen
                $Response.StatusCode = 200
                $Response.OutputStream.Close()
                continue
            }

            $RangeHeader = $Request.Headers['Range']
            if ($RangeHeader -and $RangeHeader -match '^bytes=(\d*)-(\d*)$') {
                $Start = if ($Matches[1]) { [long]$Matches[1] } else { 0 }
                $End = if ($Matches[2]) { [long]$Matches[2] } else { $FileLen - 1 }
                if ($End -ge $FileLen) { $End = $FileLen - 1 }
                $ChunkLen = ($End - $Start) + 1

                $Response.StatusCode = 206
                $Response.Headers.Add('Content-Range', "bytes $Start-$End/$FileLen")
                $Response.ContentLength64 = $ChunkLen

                $Fs = [System.IO.File]::OpenRead($FullPath)
                try {
                    $Fs.Seek($Start, [System.IO.SeekOrigin]::Begin) | Out-Null
                    $Buffer = New-Object byte[] 65536
                    $Remaining = $ChunkLen
                    while ($Remaining -gt 0) {
                        $ToRead = [int][math]::Min($Buffer.Length, $Remaining)
                        $Read = $Fs.Read($Buffer, 0, $ToRead)
                        if ($Read -le 0) { break }
                        $Response.OutputStream.Write($Buffer, 0, $Read)
                        $Remaining -= $Read
                    }
                } finally {
                    $Fs.Close()
                }
                $Response.OutputStream.Close()
                continue
            }

            $Response.ContentLength64 = $FileLen
            $Response.StatusCode = 200
            $Fs = [System.IO.File]::OpenRead($FullPath)
            try {
                $Fs.CopyTo($Response.OutputStream)
            } finally {
                $Fs.Close()
            }
            $Response.OutputStream.Close()
        } catch {
            try { $Response.Abort() } catch {}
        }
    }
} finally {
    $Listener.Stop()
    $Listener.Close()
}
