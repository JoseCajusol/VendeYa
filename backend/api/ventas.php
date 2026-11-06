<?php

require __DIR__ . '/_bootstrap.php';

function normalizarVenta(array $v): array
{
    $v['id'] = (int) $v['id'];
    $v['total'] = (float) $v['total'];
    $v['monto_recibido'] = $v['monto_recibido'] !== null ? (float) $v['monto_recibido'] : null;
    $v['vuelto'] = $v['vuelto'] !== null ? (float) $v['vuelto'] : null;
    if (isset($v['items_count'])) {
        $v['items_count'] = (int) $v['items_count'];
    }
    return $v;
}

function obtenerVenta(int $id): array
{
    $st = db()->prepare('SELECT * FROM ventas WHERE id = ?');
    $st->execute([$id]);
    $v = $st->fetch();
    if (!$v) {
        throw new ApiError('Venta no encontrada.', 404);
    }
    $st = db()->prepare('SELECT id, producto_id, nombre_producto, codigo_barras, precio_unitario, cantidad, subtotal
        FROM venta_detalle WHERE venta_id = ? ORDER BY id');
    $st->execute([$id]);
    $v = normalizarVenta($v);
    $v['items'] = array_map(fn ($i) => [
        'id'              => (int) $i['id'],
        'producto_id'     => (int) $i['producto_id'],
        'nombre_producto' => $i['nombre_producto'],
        'codigo_barras'   => $i['codigo_barras'],
        'precio_unitario' => (float) $i['precio_unitario'],
        'cantidad'        => (int) $i['cantidad'],
        'subtotal'        => (float) $i['subtotal'],
    ], $st->fetchAll());
    return $v;
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch (metodo()) {
    case 'GET':
        if ($id) {
            responder(obtenerVenta($id));
        }
        $where = ['1 = 1'];
        $params = [];
        if (!empty($_GET['desde'])) {
            $where[] = 'v.fecha >= ?';
            $params[] = $_GET['desde'] . ' 00:00:00';
        }
        if (!empty($_GET['hasta'])) {
            $where[] = 'v.fecha <= ?';
            $params[] = $_GET['hasta'] . ' 23:59:59';
        }
        if (!empty($_GET['metodo'])) {
            $where[] = 'v.metodo_pago = ?';
            $params[] = strtoupper((string) $_GET['metodo']);
        }
        if (!empty($_GET['estado'])) {
            $where[] = 'v.estado = ?';
            $params[] = strtoupper((string) $_GET['estado']);
        }
        $st = db()->prepare('SELECT v.*, COALESCE(SUM(d.cantidad), 0) AS items_count
            FROM ventas v LEFT JOIN venta_detalle d ON d.venta_id = v.id
            WHERE ' . implode(' AND ', $where) . '
            GROUP BY v.id ORDER BY v.fecha DESC, v.id DESC LIMIT 300');
        $st->execute($params);
        responder(array_map('normalizarVenta', $st->fetchAll()));

    case 'POST':
    

        $d = cuerpo();
        $clienteId = entero($d, 'cliente_id', false, 1);
        if ($clienteId !== null) {
            $sc = db()->prepare('SELECT 1 FROM clientes WHERE id = ?');
            $sc->execute([$clienteId]);
            if (!$sc->fetchColumn()) throw new ApiError('El cliente seleccionado no existe.', 404);
        }
        $metodo = strtoupper((string) ($d['metodo_pago'] ?? ''));
        if (!in_array($metodo, ['EFECTIVO', 'YAPE'], true)) {
            throw new ApiError('El método de pago debe ser EFECTIVO o YAPE.');
        }
        $items = $d['items'] ?? [];
        if (!is_array($items) || count($items) === 0) {
            throw new ApiError('El carrito está vacío.');
        }

        // Agrupar por producto por si viene repetido
        $cantidades = [];
        foreach ($items as $i => $item) {
            if (!is_array($item)) {
                throw new ApiError("El producto #$i del carrito no es válido.");
            }
            $pid = entero($item, 'producto_id', true, 1);
            $cant = entero($item, 'cantidad', true, 1);
            $cantidades[$pid] = ($cantidades[$pid] ?? 0) + $cant;
        }

        $pdo = db();
        $pdo->beginTransaction();
        $fecha = ahora();
        $total = 0.0;
        $lineas = [];
        foreach ($cantidades as $pid => $cant) {
            // FOR UPDATE bloquea la fila: dos celulares no pueden vender el último producto a la vez
            $st = $pdo->prepare('SELECT * FROM productos WHERE id = ? AND activo = 1 FOR UPDATE');
            $st->execute([$pid]);
            $p = $st->fetch();
            if (!$p) {
                $pdo->rollBack();
                throw new ApiError("El producto con id $pid ya no existe.", 404);
            }
            if ((int) $p['stock'] < $cant) {
                $pdo->rollBack();
                throw new ApiError("Stock insuficiente de \"{$p['nombre']}\": pides $cant y solo hay {$p['stock']}.", 409);
            }
            $subtotal = round((float) $p['precio_venta'] * $cant, 2);
            $total += $subtotal;
            $lineas[] = ['p' => $p, 'cantidad' => $cant, 'subtotal' => $subtotal];
        }
        $total = round($total, 2);

        $recibido = null;
        $vuelto = null;
        if ($metodo === 'EFECTIVO') {
            $recibido = numero($d, 'monto_recibido') ?? $total;
            if ($recibido + 0.001 < $total) {
                $pdo->rollBack();
                throw new ApiError(sprintf('El monto recibido (S/ %.2f) es menor que el total (S/ %.2f).', $recibido, $total));
            }
            $vuelto = round($recibido - $total, 2);
        }

        $pdo->prepare('INSERT INTO ventas (fecha, total, metodo_pago, monto_recibido, vuelto, observacion, cliente_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)')
            ->execute([$fecha, $total, $metodo, $recibido, $vuelto, texto($d, 'observacion', false, 255), $clienteId]);
        $ventaId = (int) $pdo->lastInsertId();
        $codigo = 'V-' . str_pad((string) $ventaId, 6, '0', STR_PAD_LEFT);
        $pdo->prepare('UPDATE ventas SET codigo = ? WHERE id = ?')->execute([$codigo, $ventaId]);

        $umbral = umbralStock();
        $alertas = [];
        foreach ($lineas as $l) {
            $p = $l['p'];
            $anterior = (int) $p['stock'];
            $nuevo = $anterior - $l['cantidad'];
            $pdo->prepare('INSERT INTO venta_detalle
                (venta_id, producto_id, nombre_producto, codigo_barras, precio_unitario, precio_compra, cantidad, subtotal)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$ventaId, $p['id'], $p['nombre'], $p['codigo_barras'], $p['precio_venta'],
                    $p['precio_compra'], $l['cantidad'], $l['subtotal']]);
            $pdo->prepare('UPDATE productos SET stock = ? WHERE id = ?')->execute([$nuevo, $p['id']]);
            $pdo->prepare("INSERT INTO movimientos_inventario
                (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, venta_id, motivo, fecha)
                VALUES (?, 'VENTA', ?, ?, ?, ?, ?, ?)")
                ->execute([$p['id'], -$l['cantidad'], $anterior, $nuevo, $ventaId, "Venta $codigo", $fecha]);
            if ($nuevo <= $umbral) {
                $alertas[] = ['producto_id' => (int) $p['id'], 'nombre' => $p['nombre'], 'stock' => $nuevo];
            }
        }
        $pdo->commit();

        $venta = obtenerVenta($ventaId);
        $venta['alertas_stock'] = $alertas;
        responder($venta, 201);

    default:
        responderError('Método no permitido.', 405);
}
