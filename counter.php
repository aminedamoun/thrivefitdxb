<?php
declare(strict_types=1);

/**
 * Unique visitor counter (by IP, once per time window).
 * - Counts unique IPs within the last $WINDOW seconds.
 * - Stores total in counter.txt
 * - Stores IP timestamps in visitors.json
 *
 * Notes:
 * - Not perfect (NAT, mobile networks, VPNs), but works well for simple unique visitors.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$DIR = __DIR__ . DIRECTORY_SEPARATOR;

$counterFile  = $DIR . 'counter.txt';
$visitorsFile = $DIR . 'visitors.json';

// Count an IP only once per 24 hours (change if you want)
$WINDOW = 24 * 60 * 60; // 86400 seconds

// --------------- helper: get best visitor IP ---------------
function getVisitorIp(): string {
  // If your site is behind Cloudflare, this is the real IP:
  if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
    return trim($_SERVER['HTTP_CF_CONNECTING_IP']);
  }

  // If behind a proxy/load balancer:
  if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    // Can contain multiple IPs. Take the first one.
    $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    return trim($parts[0]);
  }

  return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

$ip  = getVisitorIp();
$now = time();

// Ensure files exist
if (!file_exists($counterFile)) {
  file_put_contents($counterFile, "0", LOCK_EX);
}
if (!file_exists($visitorsFile)) {
  file_put_contents($visitorsFile, "{}", LOCK_EX);
}

// Open visitors file with lock
$vf = fopen($visitorsFile, 'c+');
if ($vf === false) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Cannot open visitors file']);
  exit;
}
if (!flock($vf, LOCK_EX)) {
  fclose($vf);
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Cannot lock visitors file']);
  exit;
}

rewind($vf);
$rawVisitors = stream_get_contents($vf);
$visitors = json_decode($rawVisitors ?: "{}", true);
if (!is_array($visitors)) $visitors = [];

// Cleanup old IPs (keeps file small)
foreach ($visitors as $vip => $ts) {
  if (!is_int($ts)) {
    unset($visitors[$vip]);
    continue;
  }
  if (($now - $ts) > $WINDOW) {
    unset($visitors[$vip]);
  }
}

// Decide if this is a new unique visit
$isNew = true;
if (isset($visitors[$ip]) && is_int($visitors[$ip])) {
  if (($now - $visitors[$ip]) <= $WINDOW) {
    $isNew = false;
  }
}

// If new, increment counter
$count = 0;
if ($isNew) {
  $cf = fopen($counterFile, 'c+');
  if ($cf === false) {
    flock($vf, LOCK_UN);
    fclose($vf);
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Cannot open counter file']);
    exit;
  }

  if (!flock($cf, LOCK_EX)) {
    fclose($cf);
    flock($vf, LOCK_UN);
    fclose($vf);
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Cannot lock counter file']);
    exit;
  }

  rewind($cf);
  $raw = trim(stream_get_contents($cf) ?: "0");
  $count = ctype_digit($raw) ? (int)$raw : 0;

  $count++;

  rewind($cf);
  ftruncate($cf, 0);
  fwrite($cf, (string)$count);
  fflush($cf);

  flock($cf, LOCK_UN);
  fclose($cf);

  // Mark this IP as seen now
  $visitors[$ip] = $now;
} else {
  // Not new → just read current count
  $raw = trim(@file_get_contents($counterFile) ?: "0");
  $count = ctype_digit($raw) ? (int)$raw : 0;

  // Refresh timestamp (optional). Keeps them “active” inside the window.
  $visitors[$ip] = $now;
}

// Save visitors.json
rewind($vf);
ftruncate($vf, 0);
fwrite($vf, json_encode($visitors, JSON_UNESCAPED_SLASHES));
fflush($vf);

flock($vf, LOCK_UN);
fclose($vf);

echo json_encode([
  'ok' => true,
  'count' => $count,
  'unique' => $isNew,
  'window_hours' => (int)($WINDOW / 3600)
]);
