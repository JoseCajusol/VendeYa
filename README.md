# VendeYa

App móvil Android (React Native + Expo + TypeScript) para que pequeños y medianos negocios registren productos, controlen su inventario, vendan con escáner de código de barras y cobren en **efectivo** o **Yape**.

## Funcionalidades

| Pantalla | Qué hace |
|---|---|
| **Vender** | Escanear con la cámara o buscar por nombre, carrito con cantidad editable y botón *Quitar*, total y botón *Cobrar* |
| **Escáner** | La cámara lee el código de barras, muestra nombre, precio y stock, y permite elegir la cantidad antes de agregar al carrito. Si el código no existe, ofrece registrarlo |
| **Cobrar** | Efectivo (monto recibido, botones rápidos y vuelto) o Yape (muestra el QR del vendedor con el monto) |
| **Productos** | Lista, búsqueda, categorías, registrar/editar/eliminar (el código se puede escanear) |
| **Inventario** | Valor del inventario, alertas de stock bajo, entradas/salidas/ajustes y kardex por producto |
| **Ventas** | Historial filtrable (hoy, semana, mes, efectivo/Yape), ticket en PDF y anulación (devuelve el stock) |
| **Reportes** | Ventas e inventario **diario, semanal, mensual y anual**, con gráfico y exportación a PDF |
| **Ajustes** | Conexión con XAMPP, datos del negocio, número/titular/QR de Yape y umbral de alerta de stock |

Cada venta descuenta el stock automáticamente dentro de una transacción de MySQL. Cuando un producto queda con **5 unidades o menos** (configurable), la app avisa para reponerlo.

## Estructura

```
backend/            API REST en PHP para XAMPP (Apache + MySQL)
  api/              productos, categorias, inventario, ventas, reportes, configuracion
  config/           datos de conexión a MySQL (database.php)
  uploads/          imagen del QR de Yape
database/
  vendeya_db.sql    crea la base de datos vendeya_db
  datos_prueba.sql  (opcional) productos de ejemplo
src/
  app/              pantallas (Expo Router)
  components/       componentes reutilizables
  services/api.ts   cliente de la API
  store/            estado global (Zustand), sincroniza todas las pantallas
  utils/            formatos y generación de PDF
```

## Puesta en marcha

### 1. Base de datos (XAMPP)
1. Enciende **Apache** y **MySQL** en el panel de XAMPP.
2. En phpMyAdmin → **Importar** → `database/vendeya_db.sql`. Opcional: importa también `database/datos_prueba.sql`.
3. Si tu usuario `root` tiene contraseña, escríbela en `backend/config/database.php`.

### 2. Backend en Apache
Apache debe servir la carpeta `backend` como `http://localhost/vendeya`. Crea un enlace (CMD como administrador si te lo pide):

```bat
mklink /J C:\xampp\htdocs\vendeya "C:\ruta\al\proyecto\VendeYa\backend"
```

Comprueba abriendo `http://localhost/vendeya/api/productos.php` en el navegador.

### 3. App en el celular
```bash
npm install
npx expo start
```
Escanea el QR con **Expo Go**. El celular y la PC deben estar en la **misma red Wi-Fi**.
La app usa por defecto `http://<IP-de-tu-PC>/vendeya/api`; puedes cambiarla en **Ajustes**.
Si no conecta, permite Apache en el **Firewall de Windows** para redes privadas.

## Comandos útiles
```bash
npx tsc --noEmit   # revisar tipos
npm run lint       # revisar código
```
