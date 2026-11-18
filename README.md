# Trueque U
Segundo Proyecto de IHC

[![pruebas](https://github.com/Job-Natanael-Contreras-Garzon/2ndProject/actions/workflows/pruebas.yml/badge.svg)](https://github.com/Job-Natanael-Contreras-Garzon/2ndProject/actions/workflows/pruebas.yml)
[Ver la última ejecución de las pruebas](https://github.com/Job-Natanael-Contreras-Garzon/2ndProject/actions/workflows/pruebas.yml)

**Integrantes:**
* Flores Veizaga Eudenia Gandira
* Contreras Garzon Job Natanael

## Cómo instalar (pnpm)

Requiere Node 22 y pnpm (el proyecto usa un workspace con `backend` y `frontend`).

```bash
pnpm install
```

## Pruebas

| Comando | Qué corre |
|---|---|
| `pnpm test:unit` | Unitarias del backend (Jest) y del frontend (Vitest), las dos con coverage |
| `pnpm test:e2e` | E2E con Playwright (chromium). Necesita backend en `:3000` y frontend en `:5173` (ver abajo) |

Las dos se ejecutan solas en GitHub Actions en cada push (`.github/workflows/pruebas.yml`).
El workflow tiene dos pasos visibles: **Pruebas unitarias** y **Pruebas E2E**.

### Coverage de las pruebas unitarias

| Parte | Tests | Líneas cubiertas |
|---|---|---|
| Backend | 105 | 89.4 % |
| Frontend | 32 | 24.3 % |

* Backend: queda sin probar sobre todo partes de `auth.controller.js`, el `errorHandler` y partes del modelo `Evento`.
* Frontend: `PostForm`, `BaseButton`, `CancelExchangeForm`, la analítica y parte de los stores tienen unitarias; la mayoría de las vistas (login, registro, perfil, recuperar, etc.) no tiene unitarias y se cubre con las pruebas E2E.
* El frontend mide **todos** los archivos de `src/`, no solo los que las pruebas tocan, por eso el porcentaje es bajo pero real.

### Calidad del código

| Comando | Qué hace |
|---|---|
| `pnpm lint` | Revisa el código con ESLint (también corre en GitHub Actions) |
| `pnpm format -- <archivos>` | Da formato con Prettier a los archivos que le indiques |

La configuración está en `eslint.config.js`, `.prettierrc.json` y `.editorconfig` (UTF-8, saltos de línea LF, 4 espacios).
No se corre el formato sobre todo el repositorio para no mezclar cambios de formato con cambios de lógica:
se usa en los archivos que se crean o se editan.

### En la nube (Neon + Render)

* **Base de datos:** Postgres en [Neon](https://neon.tech). El backend usa Neon cuando existe la variable `DATABASE_URL`; sin ella usa SQLite local.
* **Backend y frontend:** [Render](https://render.com), definidos en `render.yaml` (New → Blueprint, con la URL del repositorio).
* **Variables:** `DATABASE_URL` (cadena de Neon), `CORS_ORIGIN` (URL del frontend) en el backend, y `VITE_API_URL` (URL del backend + `/api`) en el frontend.
* **Datos de prueba en Neon** (borra y recrea las tablas): `DATABASE_URL="..." pnpm --dir backend seed`
* En el plan gratuito de Render el backend se duerme si no recibe visitas; la primera petición puede tardar cerca de un minuto.

### Para correr las E2E en local

```bash
pnpm --dir backend seed          # datos de prueba
pnpm --dir backend dev           # terminal 1 (http://localhost:3000)
pnpm --dir frontend dev          # terminal 2 (http://localhost:5173)
pnpm test:e2e                    # terminal 3
```


## Convenciones

* **Idioma:** las entidades heredadas del repo base están en inglés (`posts`, `offers`, `activity`); lo que se agregó después usa español
  del dominio (`calificacion`, `cuenta`, `eventos`). Lo nuevo se escribe en español.
* **Backend, una capa por responsabilidad:**
  `routes` define las rutas → `controllers` recibe la petición y responde → `validators` revisa lo que llega →
  `rules` decide si una acción está permitida → `services` guarda y lee en la base de datos.
* **Frontend:** todas las peticiones pasan por `src/api/client.js` (la URL sale de `VITE_API_URL`).
  La lógica de una pantalla va en `src/composables/` y las piezas visuales en `src/components/`.
* **Estilos:** los colores, textos y radios salen de `src/assets/tokens.css` y `texto.css`; los botones, de `BaseButton.vue`.
* **Ruta de analítica:** se mantiene `/analitics` porque las pruebas E2E dependen de ella; `/analitica` funciona como alias.

## Instrucciones para ejecutar el backend

1. Configurar las variables de entorno:
   Renombra o copia el archivo `example.env` a `.env` y define los valores de las variables requeridas (como `PORT` y `JWT_SECRET`).

   ```bash
   cp example.env .env
   ```

2. Ejecuta en la terminal dentro de la carpeta `backend` los siguientes comandos:

   ```bash
   pnpm install
   pnpm seed
   pnpm dev
   ```

3. Para ejecutar las pruebas unitarias:
   ```bash
   pnpm test
   pnpm test:coverage # Para ver el reporte de cobertura
   ```

El cliente REST para hacer las peticiones al backend está en `backend/api.http`

### Estructura del backend

```
backend/src/
  app.js         # Express, middlewares, rutas y arranque
  database/      # Configuración, conexión SQLite y seed
  models/        # Modelos y relaciones(index.js)
  controllers/   # Lógica de cada endpoint
  routes/        # Definición de rutas
  validators/    # Revisa los datos que llegan en cada petición
  rules/         # Reglas de negocio (qué acciones están permitidas)
  services/      # Consultas y cambios en la base de datos
  middleware/    # verifyToken y manejo central de errores
```



## Instrucciones para ejecutar el frontend
```bash
cd frontend
pnpm dev
```
| Abre en el navegador `http://localhost:5173`.
