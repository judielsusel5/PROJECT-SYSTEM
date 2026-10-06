<?php
/**
 * config/database.php
 * MySQL connection (mysqli) + helpers used by index.php
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'root');          // your MySQL username
define('DB_PASS', '');              // your MySQL password (empty by default in XAMPP/WAMP)
define('DB_NAME', 'flower_shop');   // your database name
define('DB_PORT', 3306);

// Make mysqli throw exceptions so we can catch connection errors
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$conn = null;
$db_error = null;

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    $conn = null;
    $db_error = $e->getMessage();
}

/**
 * Checks that the connection is really alive by running SQL on it.
 * Returns: connected (bool), database, version, time, error
 */
function db_status(?mysqli $conn): array
{
    global $db_error;

    $status = [
        'connected' => false,
        'database'  => DB_NAME,
        'version'   => '',
        'time'      => '',
        'error'     => $db_error,
    ];

    if ($conn === null) {
        return $status;
    }

    try {
        $row = $conn->query('SELECT DATABASE() AS db, VERSION() AS version, NOW() AS server_time')->fetch_assoc();
        $status['connected'] = true;
        $status['database']  = $row['db'];
        $status['version']   = $row['version'];
        $status['time']      = $row['server_time'];
        $status['error']     = null;
    } catch (mysqli_sql_exception $e) {
        $status['error'] = $e->getMessage();
    }

    return $status;
}

/**
 * Loads products in the shape script.js expects:
 * id, n (name), p (price), o (old price), e (emoji), c (color), t (tag), so (sold out)
 * Returns [] when the database is unavailable (script.js then uses its sample products).
 */
function get_products(?mysqli $conn): array
{
    if ($conn === null) {
        return [];
    }

    $items = [];
    try {
        $result = $conn->query(
            'SELECT id, name, price, old_price, emoji, color, tag, sold_out FROM products ORDER BY id'
        );
        while ($r = $result->fetch_assoc()) {
            $item = [
                'id' => (int)$r['id'],
                'n'  => $r['name'],
                'p'  => (float)$r['price'],
                'e'  => $r['emoji'],
                'c'  => $r['color'],
            ];
            if ($r['old_price'] !== null) { $item['o'] = (float)$r['old_price']; }
            if ($r['tag'] !== null && $r['tag'] !== '') { $item['t'] = $r['tag']; }
            if ((int)$r['sold_out'] === 1) { $item['so'] = 1; }
            $items[] = $item;
        }
    } catch (mysqli_sql_exception $e) {
        return [];
    }

    return $items;
}