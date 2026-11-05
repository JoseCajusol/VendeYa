<?php
/** Gestiona la imagen de referencia de un producto. */
require __DIR__ . '/_bootstrap.php';

const CARPETA_UPLOADS_PRODUCTOS = __DIR__ . '/../uploads/';

function productoConImagen(int $id): array
{
    $st = db()->prepare('SELECT p.*, c.nombre AS categoria FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.id = ? AND p.activo = 1');
    $st->execute([$id]);
    $producto = $st->fetch();
    if (!$producto) throw new ApiError('Producto no encontrado.', 404);
    return normalizarProducto($producto);
}

function borrarImagenProducto(?string $nombre): void
{
    if ($nombre && is_file(CARPETA_UPLOADS_PRODUCTOS . basename($nombre))) {
        @unlink(CARPETA_UPLOADS_PRODUCTOS . basename($nombre));
    }
}

$id = (int) ($_GET['id'] ?? 0);
if (!$id) throw new ApiError('Falta el id del producto.');
$producto = productoConImagen($id);

switch (metodo()) {
    case 'POST':
        $archivo = $_FILES['imagen'] ?? null;
        if (!$archivo || $archivo['error'] !== UPLOAD_ERR_OK) {
            throw new ApiError('No se recibió la imagen del producto (campo "imagen").');
        }
        if ($archivo['size'] > 5 * 1024 * 1024) throw new ApiError('La imagen no puede pesar más de 5 MB.');
        $info = @getimagesize($archivo['tmp_name']);
        $extensiones = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
        if (!$info || !isset($extensiones[$info[2]])) throw new ApiError('El archivo debe ser una imagen JPG, PNG o WEBP.');
        if (!is_dir(CARPETA_UPLOADS_PRODUCTOS)) mkdir(CARPETA_UPLOADS_PRODUCTOS, 0775, true);
        $nombre = 'producto_' . $id . '_' . bin2hex(random_bytes(8)) . '.' . $extensiones[$info[2]];
        if (!move_uploaded_file($archivo['tmp_name'], CARPETA_UPLOADS_PRODUCTOS . $nombre)) {
            throw new ApiError('No se pudo guardar la imagen en el servidor.', 500);
        }
        db()->prepare('UPDATE productos SET imagen = ? WHERE id = ?')->execute([$nombre, $id]);
        borrarImagenProducto($producto['imagen'] ?? null);
        responder(productoConImagen($id), 201);

    case 'DELETE':
        db()->prepare('UPDATE productos SET imagen = NULL WHERE id = ?')->execute([$id]);
        borrarImagenProducto($producto['imagen'] ?? null);
        responder(productoConImagen($id));

    default:
        responderError('Método no permitido.', 405);
}
