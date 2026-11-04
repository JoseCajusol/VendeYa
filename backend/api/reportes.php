<?php
/**
 * /api/reportes.php?tipo=ventas|inventario&periodo=diario|semanal|mensual|anual&fecha=YYYY-MM-DD
 *
 * "fecha" es cualquier día dentro del periodo que se quiere ver:
 *   diario  -> ese día
 *   semanal -> la semana (lunes a domingo) que contiene ese día
 *   mensual -> el mes de ese día
 *   anual   -> el año de ese día
 */
require __DIR__ . '/_bootstrap.php';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

if (metodo() !== 'GET') {
    responderError('Método no permitido.', 405);
}

$tipo = $_GET['tipo'] ?? 'ventas';
$periodo = $_GET['periodo'] ?? 'diario';
if (!in_array($tipo, ['ventas', 'inventario'], true)) {
    throw new ApiError('El tipo de reporte debe ser "ventas" o "inventario".');
}
if (!in_array($periodo, ['diario', 'semanal', 'mensual', 'anual'], true)) {
    throw new ApiError('El periodo debe ser diario, semanal, mensual o anual.');
}
$fecha = DateTimeImmutable::createFromFormat('!Y-m-d', $_GET['fecha'] ?? date('Y-m-d'));
if (!$fecha) {
    throw new ApiError('La fecha debe tener el formato AAAA-MM-DD.');
}

[$desde, $hasta, $etiqueta] = match ($periodo) {
    'diario' => [$fecha, $fecha, $fecha->format('d/m/Y')],
    'semanal' => (function () use ($fecha) {
        $lunes = $fecha->modify('-' . ((int) $fecha->format('N') - 1) . ' days');
        $domingo = $lunes->modify('+6 days');
        return [$lunes, $domingo, 'Semana del ' . $lunes->format('d/m') . ' al ' . $domingo->format('d/m/Y')];
    })(),
    'mensual' => [
        $fecha->modify('first day of this month'),
        $fecha->modify('last day of this month'),
        ucfirst(MESES_LARGOS[(int) $fecha->format('n') - 1]) . ' ' . $fecha->format('Y'),
    ],
    'anual' => [
        $fecha->setDate((int) $fecha->format('Y'), 1, 1),
        $fecha->setDate((int) $fecha->format('Y'), 12, 31),
        'Año ' . $fecha->format('Y'),
    ],
};
$ini = $desde->format('Y-m-d') . ' 00:00:00';
$fin = $hasta->format('Y-m-d') . ' 23:59:59';
$rango = [
    'periodo'  => $periodo,
    'desde'    => $desde->format('Y-m-d'),
    'hasta'    => $hasta->format('Y-m-d'),
    'etiqueta' => $etiqueta,
];

function consulta(string $sql, array $params): array
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

if ($tipo === 'ventas') {
    $r = consulta("SELECT COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS total
        FROM ventas WHERE estado = 'COMPLETADA' AND fecha BETWEEN ? AND ?", [$ini, $fin])[0];
    $g = consulta("SELECT COALESCE(SUM(d.cantidad), 0) AS unidades,
            COALESCE(SUM((d.precio_unitario - d.precio_compra) * d.cantidad), 0) AS ganancia
        FROM venta_detalle d JOIN ventas v ON v.id = d.venta_id
        WHERE v.estado = 'COMPLETADA' AND v.fecha BETWEEN ? AND ?", [$ini, $fin])[0];
    $anuladas = consulta("SELECT COUNT(*) AS n FROM ventas
        WHERE estado = 'ANULADA' AND fecha BETWEEN ? AND ?", [$ini, $fin])[0]['n'];

    $numVentas = (int) $r['ventas'];
    $total = round((float) $r['total'], 2);

    $porMetodo = [];
    foreach (['EFECTIVO', 'YAPE'] as $m) {
        $porMetodo[$m] = ['metodo' => $m, 'ventas' => 0, 'total' => 0.0];
    }
    foreach (consulta("SELECT metodo_pago, COUNT(*) AS ventas, SUM(total) AS total FROM ventas
        WHERE estado = 'COMPLETADA' AND fecha BETWEEN ? AND ? GROUP BY metodo_pago", [$ini, $fin]) as $m) {
        $porMetodo[$m['metodo_pago']] = [
            'metodo' => $m['metodo_pago'],
            'ventas' => (int) $m['ventas'],
            'total'  => round((float) $m['total'], 2),
        ];
    }

    $top = array_map(fn ($t) => [
        'producto_id' => (int) $t['producto_id'],
        'nombre'      => $t['nombre'],
        'cantidad'    => (int) $t['cantidad'],
        'total'       => round((float) $t['total'], 2),
    ], consulta("SELECT d.producto_id, MAX(d.nombre_producto) AS nombre,
            SUM(d.cantidad) AS cantidad, SUM(d.subtotal) AS total
        FROM venta_detalle d JOIN ventas v ON v.id = d.venta_id
        WHERE v.estado = 'COMPLETADA' AND v.fecha BETWEEN ? AND ?
        GROUP BY d.producto_id ORDER BY cantidad DESC, total DESC LIMIT 10", [$ini, $fin]));

    // Serie para el gráfico de barras
    [$expr, $claves] = match ($periodo) {
        'diario'  => ['HOUR(fecha)', array_map(fn ($h) => [$h, sprintf('%02dh', $h)], range(0, 23))],
        'semanal' => ['DATE(fecha)', array_map(function ($i) use ($desde) {
            $d = $desde->modify("+$i days");
            return [$d->format('Y-m-d'), DIAS[$i] . ' ' . $d->format('d')];
        }, range(0, 6))],
        'mensual' => ['DAY(fecha)', array_map(fn ($d) => [$d, (string) $d], range(1, (int) $hasta->format('j')))],
        'anual'   => ['MONTH(fecha)', array_map(fn ($m) => [$m, MESES[$m - 1]], range(1, 12))],
    };
    $valores = [];
    foreach (consulta("SELECT $expr AS k, COUNT(*) AS ventas, SUM(total) AS total FROM ventas
        WHERE estado = 'COMPLETADA' AND fecha BETWEEN ? AND ? GROUP BY k", [$ini, $fin]) as $fila) {
        $valores[(string) $fila['k']] = $fila;
    }
    $serie = array_map(fn ($c) => [
        'etiqueta' => $c[1],
        'ventas'   => (int) ($valores[(string) $c[0]]['ventas'] ?? 0),
        'total'    => round((float) ($valores[(string) $c[0]]['total'] ?? 0), 2),
    ], $claves);

    responder([
        'rango'   => $rango,
        'resumen' => [
            'ventas'          => $numVentas,
            'total'           => $total,
            'ticket_promedio' => $numVentas > 0 ? round($total / $numVentas, 2) : 0.0,
            'unidades'        => (int) $g['unidades'],
            'ganancia'        => round((float) $g['ganancia'], 2),
            'anuladas'        => (int) $anuladas,
        ],
        'por_metodo'    => array_values($porMetodo),
        'top_productos' => $top,
        'serie'         => $serie,
    ]);
}

// ----------------------------- Inventario -----------------------------
$umbral = umbralStock();
$productos = array_map(function ($p) use ($umbral) {
    $p = normalizarProducto($p);
    $p['entradas'] = (int) $p['entradas'];
    $p['salidas'] = (int) $p['salidas'];
    $p['vendidos'] = (int) $p['vendidos'];
    $p['estado'] = $p['stock'] === 0 ? 'AGOTADO' : ($p['stock'] <= $umbral ? 'BAJO' : 'OK');
    return $p;
}, consulta("SELECT p.*, c.nombre AS categoria,
        COALESCE(SUM(CASE WHEN m.tipo IN ('ENTRADA','ANULACION') OR (m.tipo = 'AJUSTE' AND m.cantidad > 0)
            THEN m.cantidad END), 0) AS entradas,
        COALESCE(-SUM(CASE WHEN m.tipo = 'SALIDA' OR (m.tipo = 'AJUSTE' AND m.cantidad < 0)
            THEN m.cantidad END), 0) AS salidas,
        COALESCE(-SUM(CASE WHEN m.tipo = 'VENTA' THEN m.cantidad END), 0) AS vendidos
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN movimientos_inventario m ON m.producto_id = p.id AND m.fecha BETWEEN ? AND ?
    WHERE p.activo = 1
    GROUP BY p.id ORDER BY p.nombre", [$ini, $fin]));

$resumen = [
    'productos'   => count($productos),
    'unidades'    => array_sum(array_column($productos, 'stock')),
    'valor_costo' => round(array_sum(array_map(fn ($p) => $p['stock'] * $p['precio_compra'], $productos)), 2),
    'valor_venta' => round(array_sum(array_map(fn ($p) => $p['stock'] * $p['precio_venta'], $productos)), 2),
    'stock_bajo'  => count(array_filter($productos, fn ($p) => $p['estado'] !== 'OK')),
    'agotados'    => count(array_filter($productos, fn ($p) => $p['estado'] === 'AGOTADO')),
    'entradas'    => array_sum(array_column($productos, 'entradas')),
    'salidas'     => array_sum(array_column($productos, 'salidas')),
    'vendidos'    => array_sum(array_column($productos, 'vendidos')),
];

responder([
    'rango'      => $rango,
    'umbral'     => $umbral,
    'resumen'    => $resumen,
    'stock_bajo' => array_values(array_filter($productos, fn ($p) => $p['estado'] !== 'OK')),
    'productos'  => $productos,
]);
