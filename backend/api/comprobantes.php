<?php
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/../services/FactilizaConsultaService.php';

function normalizarComprobante(array $c): array
{
    $c['id'] = (int) $c['id'];
    $c['venta_id'] = (int) $c['venta_id'];
    $c['correlativo'] = (int) $c['correlativo'];
    return $c;
}

function obtenerComprobante(int $id): array
{
    $st = db()->prepare('SELECT * FROM comprobantes WHERE id = ?');
    $st->execute([$id]);
    $c = $st->fetch();
    if (!$c) throw new ApiError('Comprobante no encontrado.', 404);
    return normalizarComprobante($c);
}

function estadoDesdeRespuesta(array $respuesta): array
{
    $sunat = $respuesta['data']['sunatResponse'] ?? null;
    $cdr = is_array($sunat) ? ($sunat['cdrResponse'] ?? null) : null;
    if (is_array($cdr) && (string) ($cdr['code'] ?? '') === '0') return ['ACEPTADO', $cdr];
    if (is_array($cdr) && isset($cdr['code'])) return ['RECHAZADO', $cdr];
    return ['ENVIADO', null];
}

switch (metodo()) {
    case 'GET':
        $id = (int) ($_GET['id'] ?? 0);
        if ($id) {
            $comprobante = obtenerComprobante($id);
            $recurso = strtolower((string) ($_GET['recurso'] ?? ''));
            if ($recurso !== '') {
                $ruc = (string) db()->query('SELECT ruc FROM configuracion WHERE id = 1')->fetchColumn();
                $respuesta = (new FactilizaConsultaService())->descargarComprobante($recurso, ['empresa_Ruc' => $ruc, 'tipo_Doc' => $comprobante['tipo_doc'], 'serie' => $comprobante['serie'], 'correlativo' => (string) $comprobante['correlativo']]);
                responder($respuesta);
            }
            responder($comprobante);
        }
        $st = db()->query('SELECT * FROM comprobantes ORDER BY creado_en DESC, id DESC LIMIT 500');
        responder(array_map('normalizarComprobante', $st->fetchAll()));

    case 'POST':
        $d = cuerpo();
        $ventaId = entero($d, 'venta_id', true, 1);
        $tipoDoc = (string) ($d['tipo_doc'] ?? '');
        if (!in_array($tipoDoc, ['01', '03'], true)) throw new ApiError('El comprobante debe ser factura (01) o boleta (03).');

        $st = db()->prepare('SELECT v.*, c.tipo_documento, c.numero_documento, c.nombres, c.apellido_paterno, c.apellido_materno, c.razon_social, c.direccion
            FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id WHERE v.id = ?');
        $st->execute([$ventaId]);
        $venta = $st->fetch();
        if (!$venta) throw new ApiError('Venta no encontrada.', 404);
        if ($venta['estado'] !== 'COMPLETADA') throw new ApiError('Solo se pueden emitir comprobantes de ventas completadas.');
        $st = db()->prepare('SELECT * FROM comprobantes WHERE venta_id = ?');
        $st->execute([$ventaId]);
        $existente = $st->fetch();
        if ($existente) responder(normalizarComprobante($existente));

        $config = db()->query('SELECT ruc FROM configuracion WHERE id = 1')->fetch();
        $empresaRuc = (string) ($config['ruc'] ?? '');
        if (!preg_match('/^\d{11}$/', $empresaRuc)) throw new ApiError('Configura primero el RUC del negocio.');
        if ($tipoDoc === '01' && ($venta['tipo_documento'] ?? '') !== 'RUC') throw new ApiError('La factura requiere un cliente con RUC.');
        if (!$venta['tipo_documento'] || !$venta['numero_documento']) throw new ApiError('Registra el cliente antes de emitir el comprobante.');

        $serie = $tipoDoc === '01' ? 'F001' : 'B001';
        $pdo = db();
        $pdo->beginTransaction();
        $st = $pdo->prepare('SELECT COALESCE(MAX(correlativo), 0) + 1 FROM comprobantes WHERE tipo_doc = ? AND serie = ? FOR UPDATE');
        $st->execute([$tipoDoc, $serie]);
        $correlativo = (int) $st->fetchColumn();
        $pdo->prepare('INSERT INTO comprobantes (venta_id, tipo_doc, serie, correlativo, estado) VALUES (?, ?, ?, ?, \'PENDIENTE\')')->execute([$ventaId, $tipoDoc, $serie, $correlativo]);
        $comprobanteId = (int) $pdo->lastInsertId();
        $pdo->commit();

        $st = db()->prepare('SELECT * FROM venta_detalle WHERE venta_id = ? ORDER BY id');
        $st->execute([$ventaId]);
        $detalles = $st->fetchAll();
        $gravadas = round((float) $venta['total'] / 1.18, 2);
        $igv = round((float) $venta['total'] - $gravadas, 2);
        $payload = [
            'tipo_Operacion' => '0101', 'tipo_Doc' => $tipoDoc, 'serie' => $serie, 'correlativo' => (string) $correlativo,
            'tipo_Moneda' => 'PEN', 'fecha_Emision' => date('c'), 'empresa_Ruc' => $empresaRuc,
            'cliente_Tipo_Doc' => $venta['tipo_documento'] === 'RUC' ? '6' : '1', 'cliente_Num_Doc' => $venta['numero_documento'],
            'cliente_Razon_Social' => $venta['razon_social'] ?: trim(implode(' ', array_filter([$venta['nombres'], $venta['apellido_paterno'], $venta['apellido_materno']]))),
            'cliente_Direccion' => $venta['direccion'] ?: '-', 'monto_Oper_Gravadas' => $gravadas, 'monto_Igv' => $igv,
            'total_Impuestos' => $igv, 'valor_Venta' => $gravadas, 'sub_Total' => (float) $venta['total'], 'monto_Imp_Venta' => (float) $venta['total'],
            'detalle' => array_map(static function (array $i): array {
                $unitario = round((float) $i['precio_unitario'] / 1.18, 2);
                $base = round($unitario * (int) $i['cantidad'], 2);
                $impuesto = round((float) $i['subtotal'] - $base, 2);
                return ['unidad' => 'NIU', 'cantidad' => (int) $i['cantidad'], 'cod_Producto' => (string) ($i['codigo_barras'] ?: $i['producto_id']), 'descripcion' => $i['nombre_producto'], 'monto_Valor_Unitario' => $unitario, 'monto_Base_Igv' => $base, 'porcentaje_Igv' => 18, 'igv' => $impuesto, 'tip_Afe_Igv' => '10', 'total_Impuestos' => $impuesto, 'monto_Precio_Unitario' => (float) $i['precio_unitario'], 'monto_Valor_Venta' => $base, 'factor_Icbper' => 0];
            }, $detalles),
        ];

        try {
            $respuesta = (new FactilizaConsultaService())->emitirComprobante($payload);
            [$estado, $cdr] = estadoDesdeRespuesta($respuesta);
            $pdo = db();
            $pdo->prepare('UPDATE comprobantes SET estado = ?, mensaje = ?, hash = ?, cdr_codigo = ?, cdr_descripcion = ?, respuesta_json = ?, emitido_en = ?, procesado_en = ? WHERE id = ?')
                ->execute([$estado, $respuesta['message'] ?? null, $respuesta['data']['hash'] ?? null, $cdr['code'] ?? null, $cdr['description'] ?? null, json_encode($respuesta, JSON_UNESCAPED_UNICODE), ahora(), ahora(), $comprobanteId]);
        } catch (Throwable $e) {
            db()->prepare('UPDATE comprobantes SET estado = \'ERROR_COMUNICACION\', mensaje = ?, procesado_en = ? WHERE id = ?')->execute([$e->getMessage(), ahora(), $comprobanteId]);
        }
        responder(obtenerComprobante($comprobanteId), 201);

    case 'PUT':
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) throw new ApiError('Falta el id del comprobante.');
        responder(obtenerComprobante($id));

    default: responderError('Método no permitido.', 405);
}
