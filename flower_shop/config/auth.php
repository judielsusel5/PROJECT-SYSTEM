<?php
/**
 * config/auth.php
 * Sessions + helpers for login / register.
 * Used by api/auth.php and the pages (index.php, products.php, login.php).
 */

require_once __DIR__ . '/database.php';

/** Starts the PHP session (safe to call more than once). */
function auth_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443;
    session_name('annroe');
    session_set_cookie_params([
        'lifetime' => 0,        // until the browser is closed
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,     // JavaScript cannot read the session cookie
        'samesite' => 'Lax',
    ]);
    session_start();
}

/** The logged-in customer as ['name' => ..., 'email' => ...], or null when nobody is logged in. */
function current_user(): ?array
{
    auth_start();
    $u = $_SESSION['user'] ?? null;
    return is_array($u) ? $u : null;
}