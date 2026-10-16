<?php
/**
 * check_login.php — tests the login / register setup step by step.
 * Open:  http://localhost/flower_shop/check_login.php
 * When you are done, DELETE this file.
 */
error_reporting(E_ALL);
ini_set('display_errors', '1');

function e($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }

$rows = [];
function check(string $label, bool $ok, string $detail = ''): void
{
    global $rows;
    $rows[] = [$label, $ok, $detail];
}
function body(string $rel): ?string
{
    $p = __DIR__ . '/' . $rel;
    return is_file($p) ? (string)file_get_contents($p) : null;
}


/** Calls a URL with JSON (like the website does) and returns [raw text, decoded JSON, session cookie]. */
function http_json(string $url, ?array $payload, string $cookie = ''): array
{
    $headers = "Content-Type: application/json\r\n" . ($cookie !== '' ? "Cookie: $cookie\r\n" : '');
    $opts = ['http' => ['method' => $payload === null ? 'GET' : 'POST', 'header' => $headers, 'timeout' => 8, 'ignore_errors' => true]];
    if ($payload !== null) {
        $opts['http']['content'] = json_encode($payload);
    }
    $raw = @file_get_contents($url, false, stream_context_create($opts));
    $ck = '';
    foreach (($http_response_header ?? []) as $h) {
        if (stripos($h, 'Set-Cookie:') === 0 && preg_match('/annroe=([^;]+)/', $h, $m)) {
            $ck = 'annroe=' . $m[1];
        }
    }
    return [$raw, json_decode((string)$raw, true), $ck];
}

/* 1. PHP */
check('PHP 7.3 or newer', version_compare(PHP_VERSION, '7.3.0', '>='), 'You have PHP ' . PHP_VERSION);
check('mysqli is on', extension_loaded('mysqli'));
check('mbstring is on', extension_loaded('mbstring'), 'If red: in XAMPP open php.ini and enable extension=mbstring, then restart Apache.');
check('mysqlnd is on (needed for login)', function_exists('mysqli_stmt_get_result'), 'If red: use the PHP that comes with XAMPP.');

/* 2. files are in the right place and are the right version */
$files = [
    'config/database.php' => ['function get_products', 'the database connection file'],
    'config/auth.php'     => ['function auth_start', 'must be the CONFIG one (it has "function auth_start")'],
    'api/auth.php'        => ["\$action === 'login'", 'must be the API one (it has the login code and "application/json")'],
    'assets/js/script.js' => ['action:"login"', 'must be the NEW script.js (the old one keeps accounts in the browser)'],
    'login.php'           => ['filemtime', 'must be the NEWEST login.php (the one with ?v= after the file names)'],
    'index.php'           => ['config/auth.php', 'must be the NEW index.php'],
    'products.php'        => ['config/auth.php', 'must be the NEW products.php'],
];
foreach ($files as $rel => $info) {
    $b = body($rel);
    if ($b === null) {
        check($rel, false, 'File not found. Check the folder and the file name.');
        continue;
    }
    check($rel, strpos($b, $info[0]) !== false, $info[1]);
}

/* 3. database */
$conn = null;
$db_error = null;
$dbBody = body('config/database.php');
if ($dbBody !== null && strpos($dbBody, 'function get_products') !== false) {
    require_once __DIR__ . '/config/database.php';
}
check('MySQL connection', $conn instanceof mysqli, $db_error ? (string)$db_error : 'Uses config/database.php (database flower_shop)');

if ($conn instanceof mysqli) {
    try {
        $has = $conn->query("SHOW TABLES LIKE 'users'")->num_rows > 0;
        check('users table exists', $has, 'If red: run users.sql in phpMyAdmin (database flower_shop).');
        if ($has) {
            $cols = [];
            $r = $conn->query('SHOW COLUMNS FROM users');
            while ($c = $r->fetch_assoc()) {
                $cols[] = $c['Field'];
            }
            check('users table has name, email, password_hash', count(array_diff(['name', 'email', 'password_hash'], $cols)) === 0, 'Columns found: ' . implode(', ', $cols));

            // save a test account, read it back, then delete it
            $name = 'Check';
            $email = 'check-login@example.invalid';
            $hash = password_hash('test1234', PASSWORD_DEFAULT);
            $conn->query("DELETE FROM users WHERE email = 'check-login@example.invalid'");
            $st = $conn->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
            $st->bind_param('sss', $name, $email, $hash);
            $st->execute();
            $st2 = $conn->prepare('SELECT password_hash FROM users WHERE email = ?');
            $st2->bind_param('s', $email);
            $st2->execute();
            $row = $st2->get_result()->fetch_assoc();
            check('can save an account and check its password', is_array($row) && password_verify('test1234', $row['password_hash']));
            $conn->query("DELETE FROM users WHERE email = 'check-login@example.invalid'");
        }
    } catch (Throwable $ex) {
        check('database test', false, $ex->getMessage());
    }
}

/* 4. sessions */
$sessOk = false;
try {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    $_SESSION['t'] = 1;
    $sessOk = isset($_SESSION['t']);
    session_write_close();
} catch (Throwable $ex) {
}
check('PHP sessions work', $sessOk, 'session.save_path = ' . ini_get('session.save_path'));

/* 5. the API answers */
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$base = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$resp = @file_get_contents($base . '/api/auth.php?action=session', false, stream_context_create(['http' => ['timeout' => 5]]));
$j = ($resp !== false) ? json_decode($resp, true) : null;
check(
    'api/auth.php answers with JSON',
    is_array($j) && array_key_exists('user', $j),
    $resp === false ? 'No answer from ' . $base . '/api/auth.php (wrong folder?)' : 'It answered: ' . substr($resp, 0, 300)
);

/* 6. the whole thing, the way the website does it: register -> login -> the server remembers you */
$flowEmail = 'check-flow@example.invalid';
if ($conn instanceof mysqli && is_array($j)) {
    try {
        $conn->query("DELETE FROM users WHERE email = '$flowEmail'");
    } catch (Throwable $ex) {
    }
    [$r1, $d1] = http_json($base . '/api/auth.php', ['action' => 'register', 'name' => 'Flow Test', 'email' => $flowEmail, 'password' => 'test1234']);
    check('register through the API', is_array($d1) && !empty($d1['ok']), 'Answer: ' . substr((string)$r1, 0, 300));
    [$r2, $d2, $ck] = http_json($base . '/api/auth.php', ['action' => 'login', 'email' => $flowEmail, 'password' => 'test1234']);
    check('login through the API', is_array($d2) && !empty($d2['ok']), 'Answer: ' . substr((string)$r2, 0, 300));
    check('the server sent a session cookie', $ck !== '', $ck !== '' ? 'Cookie ' . substr($ck, 0, 22) . '...' : 'No "annroe" cookie came back');
    [$r3, $d3] = http_json($base . '/api/auth.php?action=session', null, $ck);
    check('the session remembers the user', is_array($d3) && isset($d3['user']['email']) && $d3['user']['email'] === $flowEmail, 'Answer: ' . substr((string)$r3, 0, 300));
    try {
        $conn->query("DELETE FROM users WHERE email = '$flowEmail'");
    } catch (Throwable $ex) {
    }
}

$allOk = true;
foreach ($rows as $r) {
    if (!$r[1]) {
        $allOk = false;
    }
}
?>
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Login check</title>
<style>
 body{font-family:system-ui,sans-serif;background:#f3e8d1;color:#3b2a20;margin:0;padding:24px}
 .box{max-width:860px;margin:auto;background:#fffdf6;border:1px solid #cdbb98;border-radius:14px;padding:22px}
 h1{margin:0 0 4px;font-size:22px} table{width:100%;border-collapse:collapse;margin-top:14px;font-size:14px}
 td{padding:9px 8px;border-top:1px solid #e5d9c4;vertical-align:top} td:first-child{width:34px;font-size:18px}
 .ok{color:#2f7d3a} .bad{color:#b3261e} small{color:#7a6556} .sum{margin-top:14px;padding:12px;border-radius:8px}
 .good{background:#e3f1dc} .warn{background:#fbe3da}
</style></head><body><div class="box">
<h1>Login / register check</h1>
<small>Delete check_login.php when you are done.</small>
<table>
<?php foreach ($rows as $r): ?>
 <tr>
  <td class="<?= $r[1] ? 'ok' : 'bad' ?>"><?= $r[1] ? '&#10004;' : '&#10008;' ?></td>
  <td><b><?= e($r[0]) ?></b><?php if ($r[2] !== ''): ?><br><small><?= e($r[2]) ?></small><?php endif; ?></td>
 </tr>
<?php endforeach; ?>
</table>
<?php if ($allOk): ?>
 <div class="sum good">Everything is green, so the server side works. If login still fails on the website, press Ctrl + F5 on login.php, then press F12 and read the Console / Network tab.</div>
<?php else: ?>
 <div class="sum warn">Fix the red items first (top to bottom), then refresh this page.</div>
<?php endif; ?>
</div></body></html>