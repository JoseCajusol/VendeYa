<?php
require __DIR__ . '/_bootstrap.php';

function normalizarCliente(array $c): array { $c['id'] = (int) $c['id']; return $c; }

switch (metodo()) {
    case 'GET':
        $tipo = strtoupper(trim((string) ($_GET['tipo_documento'] ?? '')));
        $numero = trim((string) ($_GET['numero_documento'] ?? ''));
        if ($tipo && $numero) {
            $st = db()->prepare('SELECT * FROM clientes WHERE tipo_documento = ? AND numero_documento = ?');
            $st->execute([$tipo, $numero]);
            $cliente = $st->fetch();
            responder($cliente ? normalizarCliente($cliente) : null);
        }
        $st = db()->query('SELECT * FROM clientes ORDER BY actualizado_en DESC, id DESC LIMIT 500');
        responder(array_map('normalizarCliente', $st->fetchAll()));

    case 'POST':
        $d = cuerpo();
        $tipo = strtoupper((string) ($d['tipo_documento'] ?? ''));
        $numero = trim((string) ($d['numero_documento'] ?? ''));
        if (!in_array($tipo, ['DNI', 'RUC'], true) || ($tipo === 'DNI' && !preg_match('/^\d{8}$/', $numero)) || ($tipo === 'RUC' && !preg_match('/^\d{11}$/', $numero))) {
            throw new ApiError('El número de documento no tiene un formato válido.');
        }
        $datos = [$tipo, $numero, texto($d, 'nombres', false, 120), texto($d, 'apellido_paterno', false, 80), texto($d, 'apellido_materno', false, 80), texto($d, 'razon_social', false, 180), texto($d, 'direccion', false, 255), texto($d, 'estado', false, 60), texto($d, 'condicion', false, 60)];
        db()->prepare('INSERT INTO clientes (tipo_documento, numero_documento, nombres, apellido_paterno, apellido_materno, razon_social, direccion, estado, condicion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellido_paterno = VALUES(apellido_paterno), apellido_materno = VALUES(apellido_materno), razon_social = VALUES(razon_social), direccion = VALUES(direccion), estado = VALUES(estado), condicion = VALUES(condicion)')->execute($datos);
        $st = db()->prepare('SELECT * FROM clientes WHERE tipo_documento = ? AND numero_documento = ?');
        $st->execute([$tipo, $numero]);
        responder(normalizarCliente($st->fetch()), 201);

    default: responderError('Método no permitido.', 405);
}
