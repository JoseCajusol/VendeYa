<?php
/**
 * /api/configuracion.php
 *   GET                 Datos del negocio (incluye la URL del QR de Yape)
 *   PUT                 Actualizar datos del negocio
 *   POST  (multipart)   Subir imagen del QR de Yape (campo "qr")
 *   DELETE              Quitar el QR de Yape
 */
require __DIR__ . '/_bootstrap.php';

const CARPETA_UPLOADS = __DIR__ . '/../uploads/';

function urlUploads(): string
{
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $base = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/x.php'))), '/');
    return ($https ? 'https' : 'http') . "://$host$base/uploads/";
}

function obtenerConfig(): array
{
    $c = db()->query('SELECT * FROM configuracion WHERE id = 1')->fetch();
    if (!$c) {
        db()->exec('INSERT INTO configuracion (id) VALUES (1)');
        $c = db()->query('SELECT * FROM configuracion WHERE id = 1')->fetch();
    }
    $c['id'] = (int) $c['id'];
    $c['umbral_stock'] = (int) $c['umbral_stock'];
    $c['yape_qr_url'] = $c['yape_qr'] ? urlUploads() . rawurlencode($c['yape_qr']) : null;
    return $c;
}

function borrarQrAnterior(): void
{
    $actual = db()->query('SELECT yape_qr FROM configuracion WHERE id = 1')->fetchColumn();
    if ($actual && is_file(CARPETA_UPLOADS . basename($actual))) {
        @unlink(CARPETA_UPLOADS . basename($actual));
    }
}

switch (metodo()) {
    case 'GET':
        responder(obtenerConfig());

    case 'PUT':
        $d = cuerpo();
        $ruc = texto($d, 'ruc', false, 11);
        if ($ruc !== null && !preg_match('/^\d{11}$/', $ruc)) {
            throw new ApiError('El RUC debe tener 11 dígitos.');
        }
        $umbral = entero($d, 'umbral_stock', false, 0) ?? 5;
        db()->prepare('UPDATE configuracion SET nombre_negocio = ?, ruc = ?, direccion = ?, telefono = ?,
                yape_numero = ?, yape_titular = ?, umbral_stock = ? WHERE id = 1')
            ->execute([
                texto($d, 'nombre_negocio', true, 120),
                $ruc,
                texto($d, 'direccion', false, 200),
                texto($d, 'telefono', false, 20),
                texto($d, 'yape_numero', false, 15),
                texto($d, 'yape_titular', false, 120),
                $umbral,
            ]);
        responder(obtenerConfig());

    case 'POST':
        $archivo = $_FILES['qr'] ?? null;
        if (!$archivo || $archivo['error'] !== UPLOAD_ERR_OK) {
            throw new ApiError('No se recibió la imagen del QR (campo "qr").');
        }
        if ($archivo['size'] > 5 * 1024 * 1024) {
            throw new ApiError('La imagen no puede pesar más de 5 MB.');
        }
        $info = @getimagesize($archivo['tmp_name']);
        $extensiones = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
        if (!$info || !isset($extensiones[$info[2]])) {
            throw new ApiError('El archivo debe ser una imagen JPG, PNG o WEBP.');
        }
        if (!is_dir(CARPETA_UPLOADS)) {
            mkdir(CARPETA_UPLOADS, 0775, true);
        }
        $nombre = 'yape_qr_' . time() . '.' . $extensiones[$info[2]];
        if (!move_uploaded_file($archivo['tmp_name'], CARPETA_UPLOADS . $nombre)) {
            throw new ApiError('No se pudo guardar la imagen en el servidor.', 500);
        }
        borrarQrAnterior();
        db()->prepare('UPDATE configuracion SET yape_qr = ? WHERE id = 1')->execute([$nombre]);
        responder(obtenerConfig(), 201);

    case 'DELETE':
        borrarQrAnterior();
        db()->exec('UPDATE configuracion SET yape_qr = NULL WHERE id = 1');
        responder(obtenerConfig());

    default:
        responderError('Método no permitido.', 405);
}
