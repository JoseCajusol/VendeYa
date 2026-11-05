<?php
/**
 * Código común a todos los endpoints de la API de VendeYa:
 * cabeceras CORS, respuestas JSON, lectura del cuerpo, conexión PDO
 * y manejo centralizado de errores.
 */
declare(strict_types=1);

$config = require __DIR__ . '/../config/database.php';
date_default_timezone_set($config['timezone']);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/** Error de negocio con código HTTP (400, 404, 409...). */
final class ApiError extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 400)
    {
        parent::__construct($message);
    }
}

function responder(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function responderError(string $mensaje, int $status = 400): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

set_exception_handler(function (Throwable $e): void {
    if ($e instanceof ApiError) {
        responderError($e->getMessage(), $e->status);
    }
    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        responderError('Ya existe un registro con ese dato (por ejemplo, el código de barras).', 409);
    }
    error_log('[VendeYa] ' . $e);
    responderError('Error interno del servidor: ' . $e->getMessage(), 500);
});

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        global $config;
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'], $config['port'], $config['database'], $config['charset']
        );
        try {
            $pdo = new PDO($dsn, $config['user'], $config['password'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            throw new ApiError('No se pudo conectar a MySQL. ¿Está encendido en XAMPP? ' . $e->getMessage(), 500);
        }
        $offset = (new DateTime())->format('P');
        $pdo->exec("SET time_zone = '$offset'");
    }
    return $pdo;
}

function metodo(): string
{
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

/** Cuerpo JSON de la petición como arreglo asociativo. */
function cuerpo(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new ApiError('El cuerpo de la petición debe ser JSON válido.');
    }
    return $data;
}

function ahora(): string
{
    return date('Y-m-d H:i:s');
}

function texto(array $d, string $campo, bool $requerido = false, int $max = 255): ?string
{
    $v = isset($d[$campo]) ? trim((string) $d[$campo]) : '';
    if ($v === '') {
        if ($requerido) {
            throw new ApiError("El campo \"$campo\" es obligatorio.");
        }
        return null;
    }
    if (mb_strlen($v) > $max) {
        throw new ApiError("El campo \"$campo\" no puede tener más de $max caracteres.");
    }
    return $v;
}

function numero(array $d, string $campo, bool $requerido = false, float $min = 0): ?float
{
    if (!isset($d[$campo]) || $d[$campo] === '' || $d[$campo] === null) {
        if ($requerido) {
            throw new ApiError("El campo \"$campo\" es obligatorio.");
        }
        return null;
    }
    if (!is_numeric($d[$campo])) {
        throw new ApiError("El campo \"$campo\" debe ser un número.");
    }
    $n = (float) $d[$campo];
    if ($n < $min) {
        throw new ApiError("El campo \"$campo\" no puede ser menor que $min.");
    }
    return $n;
}

function entero(array $d, string $campo, bool $requerido = false, int $min = 0): ?int
{
    $n = numero($d, $campo, $requerido, $min);
    if ($n === null) {
        return null;
    }
    if (floor($n) !== $n) {
        throw new ApiError("El campo \"$campo\" debe ser un número entero.");
    }
    return (int) $n;
}

function umbralStock(): int
{
    return (int) db()->query('SELECT umbral_stock FROM configuracion WHERE id = 1')->fetchColumn();
}

/** Convierte columnas numéricas de MySQL (que llegan como string) a números. */
function normalizarProducto(array $p): array
{
    $p['id'] = (int) $p['id'];
    $p['categoria_id'] = $p['categoria_id'] !== null ? (int) $p['categoria_id'] : null;
    $p['precio_compra'] = (float) $p['precio_compra'];
    $p['precio_venta'] = (float) $p['precio_venta'];
    $p['stock'] = (int) $p['stock'];
    $p['activo'] = (bool) $p['activo'];
    $p['imagen_url'] = null;
    if (!empty($p['imagen'])) {
        $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $base = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/x.php'))), '/');
        $p['imagen_url'] = ($https ? 'https' : 'http') . "://$host$base/uploads/" . rawurlencode((string) $p['imagen']);
    }
    return $p;
}
