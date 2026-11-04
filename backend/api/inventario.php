<?php
/**
 * /api/inventario.php
 *   GET                         Resumen del inventario
 *   GET ?alertas=1              Productos con stock bajo (stock <= umbral)
 *   GET ?movimientos=1          Kardex (filtros: producto_id, desde, hasta)
 *   POST                        Registrar movimiento manual:
 *        { producto_id, tipo: ENTRADA|SALIDA|AJUSTE, cantidad, motivo?, precio_compra? }
 *        - ENTRADA / SALIDA: "cantidad" son las unidades que entran o salen
 *        - AJUSTE: "cantidad" es el stock real contado (queda exactamente ese valor)
 */
require __DIR__ . '/_bootstrap.php';

switch (metodo()) {
    case 'GET':
        $umbral = umbralStock();

        if (!empty($_GET['alertas'])) {
            $st = db()->prepare('SELECT p.*, c.nombre AS categoria FROM productos p
                LEFT JOIN categorias c ON c.id = p.categoria_id
                WHERE p.activo = 1 AND p.stock <= ? ORDER BY p.stock, p.nombre');
            $st->execute([$umbral]);
            responder([
                'umbral'    => $umbral,
                'productos' => array_map('normalizarProducto', $st->fetchAll()),
            ]);
        }

        if (!empty($_GET['movimientos'])) {
            $where = ['1 = 1'];
            $params = [];
            if (!empty($_GET['producto_id'])) {
                $where[] = 'm.producto_id = ?';
                $params[] = (int) $_GET['producto_id'];
            }
            if (!empty($_GET['desde'])) {
                $where[] = 'm.fecha >= ?';
                $params[] = $_GET['desde'] . ' 00:00:00';
            }
            if (!empty($_GET['hasta'])) {
                $where[] = 'm.fecha <= ?';
                $params[] = $_GET['hasta'] . ' 23:59:59';
            }
            $st = db()->prepare('SELECT m.*, p.nombre AS producto, v.codigo AS venta_codigo
                FROM movimientos_inventario m
                JOIN productos p ON p.id = m.producto_id
                LEFT JOIN ventas v ON v.id = m.venta_id
                WHERE ' . implode(' AND ', $where) . ' ORDER BY m.fecha DESC, m.id DESC LIMIT 300');
            $st->execute($params);
            $filas = array_map(function (array $m): array {
                foreach (['id', 'producto_id', 'cantidad', 'stock_anterior', 'stock_nuevo'] as $k) {
                    $m[$k] = (int) $m[$k];
                }
                $m['venta_id'] = $m['venta_id'] !== null ? (int) $m['venta_id'] : null;
                return $m;
            }, $st->fetchAll());
            responder($filas);
        }

        $st = db()->prepare('SELECT
                COUNT(*)                                   AS productos,
                COALESCE(SUM(stock), 0)                    AS unidades,
                COALESCE(SUM(stock * precio_compra), 0)    AS valor_costo,
                COALESCE(SUM(stock * precio_venta), 0)     AS valor_venta,
                COALESCE(SUM(stock <= ?), 0)               AS stock_bajo,
                COALESCE(SUM(stock = 0), 0)                AS agotados
            FROM productos WHERE activo = 1');
        $st->execute([$umbral]);
        $r = $st->fetch();
        responder([
            'umbral'      => $umbral,
            'productos'   => (int) $r['productos'],
            'unidades'    => (int) $r['unidades'],
            'valor_costo' => round((float) $r['valor_costo'], 2),
            'valor_venta' => round((float) $r['valor_venta'], 2),
            'stock_bajo'  => (int) $r['stock_bajo'],
            'agotados'    => (int) $r['agotados'],
        ]);

    case 'POST':
        $d = cuerpo();
        $productoId = entero($d, 'producto_id', true, 1);
        $tipo = strtoupper((string) ($d['tipo'] ?? ''));
        if (!in_array($tipo, ['ENTRADA', 'SALIDA', 'AJUSTE'], true)) {
            throw new ApiError('El tipo de movimiento debe ser ENTRADA, SALIDA o AJUSTE.');
        }
        $cantidad = entero($d, 'cantidad', true, 0);
        if ($tipo !== 'AJUSTE' && $cantidad === 0) {
            throw new ApiError('La cantidad debe ser mayor que cero.');
        }
        $motivo = texto($d, 'motivo', false, 255);
        $precioCompra = numero($d, 'precio_compra');

        $pdo = db();
        $pdo->beginTransaction();
        $st = $pdo->prepare('SELECT * FROM productos WHERE id = ? AND activo = 1 FOR UPDATE');
        $st->execute([$productoId]);
        $p = $st->fetch();
        if (!$p) {
            $pdo->rollBack();
            throw new ApiError('Producto no encontrado.', 404);
        }
        $anterior = (int) $p['stock'];
        $nuevo = match ($tipo) {
            'ENTRADA' => $anterior + $cantidad,
            'SALIDA'  => $anterior - $cantidad,
            'AJUSTE'  => $cantidad,
        };
        if ($nuevo < 0) {
            $pdo->rollBack();
            throw new ApiError("No puedes sacar $cantidad unidades: solo hay $anterior en stock.");
        }

        $pdo->prepare('UPDATE productos SET stock = ? WHERE id = ?')->execute([$nuevo, $productoId]);
        if ($tipo === 'ENTRADA' && $precioCompra !== null) {
            $pdo->prepare('UPDATE productos SET precio_compra = ? WHERE id = ?')->execute([$precioCompra, $productoId]);
        }
        $pdo->prepare('INSERT INTO movimientos_inventario
            (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
            VALUES (?, ?, ?, ?, ?, ?, ?)')
            ->execute([$productoId, $tipo, $nuevo - $anterior, $anterior, $nuevo, $motivo, ahora()]);
        $pdo->commit();

        $st = db()->prepare('SELECT p.*, c.nombre AS categoria FROM productos p
            LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.id = ?');
        $st->execute([$productoId]);
        responder(normalizarProducto($st->fetch()), 201);

    default:
        responderError('Método no permitido.', 405);
}
