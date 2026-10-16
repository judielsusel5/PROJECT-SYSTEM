<?php
/**
 * api/auth.php — register / login / logout / session for the website
 *
 *   GET  api/auth.php?action=session   -> {"user": {"name","email"} | null}
 *   POST api/auth.php   {"action":"register","name":"..","email":"..","password":".."}
 *   POST api/auth.php   {"action":"login","email":"..","password":".."}
 *   POST api/auth.php   {"action":"logout"}
 *
 * Passwords are stored with password_hash() (bcrypt) in the `users` table (see users.sql).
 */

require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

auth_start();

/* ---------- read-only requests ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';

    if ($action === 'session') {
        out(['user' => current_user()]);
    }

    out(['error' => 'bad_request'], 400);
}

/* ---------- changes (POST + JSON only) ---------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out(['error' => 'method'], 405);
}

// Our own pages send JSON. A plain cross-site <form> post cannot, so this blocks CSRF.
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    out(['error' => 'bad_request'], 400);
}
$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) {
    out(['error' => 'bad_request'], 400);
}
$action = (string)($in['action'] ?? '');

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires'  => time() - 3600,
            'path'     => $p['path'],
            'domain'   => $p['domain'],
            'secure'   => $p['secure'],
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
    session_destroy();
    out(['ok' => 1]);
}

if ($conn === null) {
    out(['error' => 'server'], 500);          // MySQL is not reachable
}

try {
    /* ----- register ----- */
    if ($action === 'register') {
        $name  = trim((string)($in['name'] ?? ''));
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $pw    = (string)($in['password'] ?? '');

        if (mb_strlen($name) < 2 || mb_strlen($name) > 80
            || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190
            || strlen($pw) < 6 || strlen($pw) > 200) {
            out(['error' => 'invalid'], 422);
        }

        $hash = password_hash($pw, PASSWORD_DEFAULT);
        try {
            $stmt = $conn->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
            $stmt->bind_param('sss', $name, $email, $hash);
            $stmt->execute();
        } catch (mysqli_sql_exception $e) {
            if ((int)$e->getCode() === 1062) {      // duplicate entry: that email is already registered
                out(['error' => 'exists'], 409);
            }
            throw $e;
        }
        out(['ok' => 1]);
    }

    /* ----- login ----- */
    if ($action === 'login') {
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $pw    = (string)($in['password'] ?? '');

        // slow down password guessing: after 5 wrong tries, wait 5 minutes
        $f = $_SESSION['fails'] ?? ['n' => 0, 't' => 0];
        if ($f['n'] >= 5 && time() - $f['t'] < 300) {
            out(['error' => 'toomany'], 429);
        }
        if ($f['n'] >= 5) {
            $f = ['n' => 0, 't' => 0];
        }

        $stmt = $conn->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1');
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $u = $stmt->get_result()->fetch_assoc();

        if (!$u || !password_verify($pw, $u['password_hash'])) {
            $_SESSION['fails'] = ['n' => $f['n'] + 1, 't' => time()];
            usleep(300000);                           // 0.3 s
            out(['error' => $u ? 'badpw' : 'nouser'], 401);
        }

        // keep the stored hash up to date with PHP's current default
        if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
            $new = password_hash($pw, PASSWORD_DEFAULT);
            $up = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
            $uid = (int)$u['id'];
            $up->bind_param('si', $new, $uid);
            $up->execute();
        }

        session_regenerate_id(true);                  // new session id after login
        $_SESSION['user'] = ['name' => $u['name'], 'email' => $u['email']];
        unset($_SESSION['fails']);
        out(['ok' => 1, 'user' => $_SESSION['user']]);
    }

    out(['error' => 'bad_request'], 400);

} catch (mysqli_sql_exception $e) {
    out(['error' => 'server'], 500);                  // e.g. the users table does not exist yet
}