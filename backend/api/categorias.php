<?php
/**
 * /api/categorias.php
 *   GET               Lista de categorías (con cantidad de productos)
 *   POST              Crear { nombre }
 *   PUT    ?id=3      Renombrar { nombre }
 *   DELETE ?id=3      Eliminar (los productos quedan "Sin categoría")
 */
require __DIR__ . '/_bootstrap.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch (metodo()) {
    case 'GET':
        $filas = db()->query('SELECT c.id, c.nombre,
                (SELECT COUNT(*) FROM productos p WHERE p.categoria_id = c.id AND p.activo = 1) AS productos
            FROM categorias c WHERE c.activo = 1 ORDER BY c.nombre')->fetchAll();
        responder(array_map(fn ($c) => [
            'id'        => (int) $c['id'],
            'nombre'    => $c['nombre'],
            'productos' => (int) $c['productos'],
        ], $filas));

    case 'POST':
        $nombre = texto(cuerpo(), 'nombre', true, 80);
        db()->prepare('INSERT INTO categorias (nombre) VALUES (?)')->execute([$nombre]);
        responder(['id' => (int) db()->lastInsertId(), 'nombre' => $nombre, 'productos' => 0], 201);

    case 'PUT':
        if (!$id) {
            throw new ApiError('Falta el id de la categoría.');
        }
        $nombre = texto(cuerpo(), 'nombre', true, 80);
        db()->prepare('UPDATE categorias SET nombre = ? WHERE id = ?')->execute([$nombre, $id]);
        responder(['id' => $id, 'nombre' => $nombre]);

    case 'DELETE':
        if (!$id) {
            throw new ApiError('Falta el id de la categoría.');
        }
        db()->prepare('DELETE FROM categorias WHERE id = ?')->execute([$id]);
        responder(['id' => $id, 'eliminado' => true]);

    default:
        responderError('Método no permitido.', 405);
}
