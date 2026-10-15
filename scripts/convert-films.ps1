[CmdletBinding()]
param(
    [ValidateSet('qianli', 'fuchun', 'xishan', 'starry', 'empire', 'winter', 'qingming', 'guilin', 'zhangjiajie')]
    [string[]]$Paintings = @('qianli', 'fuchun', 'xishan', 'starry', 'empire', 'winter', 'qingming', 'guilin', 'zhangjiajie'),
    [switch]$Portrait,
    [string]$InputDirectory = (Join-Path $PSScriptRoot '../artifacts/videos'),
    [string]$OutputDirectory = '',
    [ValidateRange(14, 28)][int]$Crf = 18,
    [double]$ExpectedDuration = 24,
    [double]$DurationTolerance = 2
)

$ErrorActionPreference = 'Stop'
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$ffprobe = (Get-Command ffprobe -ErrorAction Stop).Source
$InputDirectory = [IO.Path]::GetFullPath($InputDirectory)
if (-not $OutputDirectory) { $OutputDirectory = $InputDirectory }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$culture = [Globalization.CultureInfo]::InvariantCulture

function Get-Probe([string]$Path) {
    $raw = & $ffprobe -v error -count_frames -show_entries 'format=duration:stream=codec_type,codec_name,pix_fmt,width,height,avg_frame_rate,nb_read_frames,duration,channels,sample_rate,bit_rate' -of json $Path
    if ($LASTEXITCODE -ne 0) { throw "ffprobe failed: $Path" }
    return ($raw -join "`n" | ConvertFrom-Json)
}

function Get-SourceDuration([string]$Path, $Probe) {
    if ($Probe.format.duration -and $Probe.format.duration -ne 'N/A') {
        return [double]::Parse($Probe.format.duration, $culture)
    }
    # MediaRecorder WebM often has no duration in its header. Use packet PTS,
    # not file size or the requested recorder duration, to measure the source.
    $raw = & $ffprobe -v error -select_streams v:0 -show_entries 'packet=pts_time,duration_time' -of json $Path
    if ($LASTEXITCODE -ne 0) { throw "Cannot read packet timestamps: $Path" }
    $packets = ($raw -join "`n" | ConvertFrom-Json).packets
    if (-not $packets -or $packets.Count -lt 2) { throw "Insufficient video packets: $Path" }
    $first = [double]::PositiveInfinity
    $last = 0.0
    foreach ($packet in $packets) {
        if (-not $packet.pts_time -or $packet.pts_time -eq 'N/A') { continue }
        $pts = [double]::Parse($packet.pts_time, $culture)
        $span = 1.0 / 30.0
        if ($packet.duration_time -and $packet.duration_time -ne 'N/A') {
            $span = [double]::Parse($packet.duration_time, $culture)
        }
        $first = [Math]::Min($first, $pts)
        $last = [Math]::Max($last, $pts + $span)
    }
    $duration = $last - $first
    if ([double]::IsNaN($duration) -or [double]::IsInfinity($duration)) { throw "Invalid video timestamps: $Path" }
    return $duration
}

$results = @()
foreach ($painting in $Paintings) {
    $stem = $painting
    if ($Portrait) { $stem += '-portrait' }
    $source = Join-Path $InputDirectory "$stem.webm"
    $destination = Join-Path $OutputDirectory "$stem.mp4"
    $temporary = Join-Path $OutputDirectory "$stem.converting.mp4"
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing source: $source" }
    $sourceProbe = Get-Probe $source
    $sourceVideo = @($sourceProbe.streams | Where-Object codec_type -eq 'video')[0]
    $sourceAudio = @($sourceProbe.streams | Where-Object codec_type -eq 'audio') | Select-Object -First 1
    if (-not $sourceVideo) { throw "Missing video stream: $source" }
    $sourceDuration = Get-SourceDuration $source $sourceProbe
    if ([Math]::Abs($sourceDuration - $ExpectedDuration) -gt $DurationTolerance) {
        throw "$stem source duration is $sourceDuration s; expected $ExpectedDuration +/- $DurationTolerance s"
    }
    Write-Host "Converting $stem ($([Math]::Round($sourceDuration, 3)) s)"
    $durationArgument = $sourceDuration.ToString('0.0000', $culture)
    # Optional audio mapping also accepts legacy silent MediaRecorder files.
    & $ffmpeg -y -hide_banner -loglevel error -i $source -map 0:v:0 -map '0:a:0?' -vf 'setpts=PTS-STARTPTS,fps=30,scale=in_range=auto:out_range=tv,format=yuv420p' -af 'asetpts=PTS-STARTPTS' -t $durationArgument -c:v libx264 -preset medium -crf $Crf -color_range tv -c:a aac -b:a 192k -ac 2 -ar 48000 -movflags +faststart $temporary
    if ($LASTEXITCODE -ne 0) { throw "FFmpeg conversion failed: $source" }
    $probe = Get-Probe $temporary
    $stream = @($probe.streams | Where-Object codec_type -eq 'video')[0]
    $audioStream = @($probe.streams | Where-Object codec_type -eq 'audio') | Select-Object -First 1
    $duration = [double]::Parse($probe.format.duration, $culture)
    if ($stream.codec_name -ne 'h264' -or $stream.pix_fmt -ne 'yuv420p' -or $stream.avg_frame_rate -ne '30/1') {
        throw "Unexpected output codec/pixel format/frame rate: $temporary"
    }
    if ($sourceAudio) {
        if (-not $audioStream) { throw "Source audio was lost during conversion: $temporary" }
        if ($audioStream.codec_name -ne 'aac' -or $audioStream.channels -ne 2 -or [int]$audioStream.sample_rate -ne 48000 -or [int]$audioStream.nb_read_frames -lt 1) {
            throw "Unexpected output audio codec/channels/sample rate: $temporary"
        }
        if (-not $audioStream.duration -or $audioStream.duration -eq 'N/A' -or [double]::Parse($audioStream.duration, $culture) -le 0) {
            throw "Empty output audio stream: $temporary"
        }
    } elseif ($audioStream) {
        throw "Silent source unexpectedly gained an audio stream: $temporary"
    }
    if ([Math]::Abs($duration - $sourceDuration) -gt 0.12) { throw "Output duration drift: $temporary" }
    $expectedWidth = 1280; $expectedHeight = 720
    if ($Portrait) { $expectedWidth = 720; $expectedHeight = 1280 }
    if ($stream.width -ne $expectedWidth -or $stream.height -ne $expectedHeight) {
        throw "Unexpected frame size: $($stream.width) x $($stream.height)"
    }
    Move-Item -LiteralPath $temporary -Destination $destination -Force
    # Select six known decoded frame indices, including the final panoramic shot.
    # This avoids the empty last tile produced by duration-rounded fps filters.
    $frames = [int]$stream.nb_read_frames
    $sampleIndices = @(0.08, 0.24, 0.4, 0.56, 0.75, 0.94) | ForEach-Object { [Math]::Floor(($_ * ($frames - 1))) }
    $selection = ($sampleIndices | ForEach-Object { "eq(n\,$_)" }) -join '+'
    $sheet = Join-Path $OutputDirectory "$stem-contact.jpg"
    & $ffmpeg -y -hide_banner -loglevel error -i $destination -vf "select=$selection,scale=480:-2,tile=3x2" -frames:v 1 -q:v 2 $sheet
    if ($LASTEXITCODE -ne 0) { throw "Contact sheet failed: $destination" }
    $result = [ordered]@{
        painting = $painting; portrait = [bool]$Portrait; source = $source; output = $destination
        sourceDurationSeconds = [Math]::Round($sourceDuration, 4)
        sourceFrames = [int]$sourceVideo.nb_read_frames
        sourceAverageFramesPerSecond = [Math]::Round(([int]$sourceVideo.nb_read_frames / $sourceDuration), 2)
        sourceAudio = $(if ($sourceAudio) {
            [ordered]@{ codec = $sourceAudio.codec_name; channels = $sourceAudio.channels; sampleRate = [int]$sourceAudio.sample_rate; durationSeconds = $sourceAudio.duration }
        } else { $null })
        audio = $(if ($audioStream) {
            [ordered]@{
                codec = $audioStream.codec_name; channels = $audioStream.channels
                sampleRate = [int]$audioStream.sample_rate; targetBitrate = 192000
                encodedBitrate = [int]$audioStream.bit_rate
                durationSeconds = [double]::Parse($audioStream.duration, $culture)
                frames = [int]$audioStream.nb_read_frames
            }
        } else { $null })
        durationSeconds = $duration; width = $stream.width; height = $stream.height
        codec = $stream.codec_name; pixelFormat = $stream.pix_fmt; frameRate = $stream.avg_frame_rate
        frames = $frames; bytes = (Get-Item -LiteralPath $destination).Length
        contactSheet = $sheet; verifiedAt = [DateTime]::UtcNow.ToString('o')
    }
    $jsonPath = Join-Path $OutputDirectory "$stem.probe.json"
    [IO.File]::WriteAllText($jsonPath, ($result | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding($false)))
    if ($result.sourceAverageFramesPerSecond -lt 20) {
        Write-Warning "$stem source is $($result.sourceAverageFramesPerSecond) fps. 30 fps conversion duplicates frames; re-record for smoother motion."
    }
    $results += [PSCustomObject]$result
}
$results | Format-Table painting, portrait, durationSeconds, width, height, frames, bytes
