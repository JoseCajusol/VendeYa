<?php
/**
 * /api/productos.php
 *   GET                      Lista (filtros: q, categoria_id, stock_bajo=1)
 *   GET    ?id=5             Un producto
 *   GET    ?codigo=775...    Buscar por código de barras (para el escáner)
 *   POST                     Crear producto (con stock inicial)
 *   PUT    ?id=5             Editar datos del producto (el stock se cambia en inventario.php)
 *   DELETE ?id=5             Eliminar producto
 */
require __DIR__ . '/_bootstrap.php';

const SELECT_PRODUCTO = 'SELECT p.*, c.nombre AS categoria
    FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id';

function obtenerProducto(int $id): array
{
    $st = db()->prepare(SELECT_PRODUCTO . ' WHERE p.id = ? AND p.activo = 1');
    $st->execute([$id]);
    $p = $st->fetch();
    if (!$p) {
        throw new ApiError('Producto no encontrado.', 404);
    }
    return normalizarProducto($p);
}

function datosProducto(array $d): array
{
    $codigo = texto($d, 'codigo_barras', false, 50);
    $categoria = entero($d, 'categoria_id', false, 1);
    if ($categoria !== null) {
        $st = db()->prepare('SELECT 1 FROM categorias WHERE id = ?');
        $st->execute([$categoria]);
        if (!$st->fetchColumn()) {
            throw new ApiError('La categoría seleccionada no existe.');
        }
    }
    return [
        'codigo_barras' => $codigo,
        'nombre'        => texto($d, 'nombre', true, 150),
        'descripcion'   => texto($d, 'descripcion', false, 255),
        'categoria_id'  => $categoria,
        'precio_compra' => numero($d, 'precio_compra') ?? 0,
        'precio_venta'  => numero($d, 'precio_venta', true),
        'unidad'        => texto($d, 'unidad', false, 20) ?? 'unidad',
    ];
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch (metodo()) {
    case 'GET':
        if ($id) {
            responder(obtenerProducto($id));
        }
        if (isset($_GET['codigo'])) {
            $st = db()->prepare(SELECT_PRODUCTO . ' WHERE p.codigo_barras = ? AND p.activo = 1');
            $st->execute([trim((string) $_GET['codigo'])]);
            $p = $st->fetch();
            if (!$p) {
                throw new ApiError('No hay ningún producto registrado con ese código de barras.', 404);
            }
            responder(normalizarProducto($p));
        }

        $where = ['p.activo = 1'];
        $params = [];
        if (!empty($_GET['q'])) {
            $where[] = '(p.nombre LIKE ? OR p.codigo_barras LIKE ?)';
            $q = '%' . trim((string) $_GET['q']) . '%';
            array_push($params, $q, $q);
        }
        if (!empty($_GET['categoria_id'])) {
            $where[] = 'p.categoria_id = ?';
            $params[] = (int) $_GET['categoria_id'];
        }
        if (!empty($_GET['stock_bajo'])) {
            $where[] = 'p.stock <= ?';
            $params[] = umbralStock();
        }
        $st = db()->prepare(SELECT_PRODUCTO . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY p.nombre');
        $st->execute($params);
        responder(array_map('normalizarProducto', $st->fetchAll()));

    case 'POST':
        $d = cuerpo();
        $datos = datosProducto($d);
        $stock = entero($d, 'stock') ?? 0;
        $pdo = db();
        $pdo->beginTransaction();
        $st = $pdo->prepare('INSERT INTO productos
            (codigo_barras, nombre, descripcion, categoria_id, precio_compra, precio_venta, unidad, stock)
            VALUES (:codigo_barras, :nombre, :descripcion, :categoria_id, :precio_compra, :precio_venta, :unidad, :stock)');
        $st->execute($datos + ['stock' => $stock]);
        $nuevoId = (int) $pdo->lastInsertId();
        if ($stock > 0) {
            $pdo->prepare("INSERT INTO movimientos_inventario
                (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
                VALUES (?, 'ENTRADA', ?, 0, ?, 'Stock inicial', ?)")
                ->execute([$nuevoId, $stock, $stock, ahora()]);
        }
        $pdo->commit();
        responder(obtenerProducto($nuevoId), 201);

    case 'PUT':
        if (!$id) {
            throw new ApiError('Falta el id del producto.');
        }
        obtenerProducto($id);
        $datos = datosProducto(cuerpo());
        $st = db()->prepare('UPDATE productos SET
            codigo_barras = :codigo_barras, nombre = :nombre, descripcion = :descripcion,
            categoria_id = :categoria_id, precio_compra = :precio_compra,
            precio_venta = :precio_venta, unidad = :unidad
            WHERE id = :id');
        $st->execute($datos + ['id' => $id]);
        responder(obtenerProducto($id));

    case 'DELETE':
        if (!$id) {
            throw new ApiError('Falta el id del producto.');
        }
        obtenerProducto($id);
        $st = db()->prepare('SELECT COUNT(*) FROM venta_detalle WHERE producto_id = ?');
        $st->execute([$id]);
        if ((int) $st->fetchColumn() > 0) {
            // Tiene ventas: se desactiva para no perder el historial y se libera el código de barras.
            db()->prepare('UPDATE productos SET activo = 0, codigo_barras = NULL WHERE id = ?')->execute([$id]);
        } else {
            db()->prepare('DELETE FROM productos WHERE id = ?')->execute([$id]);
        }
        responder(['id' => $id, 'eliminado' => true]);

    default:
        responderError('Método no permitido.', 405);
}
