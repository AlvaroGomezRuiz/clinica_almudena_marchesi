almudena/                   <-- Carpeta raíz (el "Universo")
├── .gitignore              <-- El archivo que acabamos de configurar
├── docker-compose.yml      <-- El director de orquesta de Docker
│
├── BACKEND/                <-- El cerebro y la base de datos
│   ├── alembic/            # Historial de cambios de la base de datos
│   ├── api/                # Las rutas (pacientes, citas, auth...)
│   ├── core/               # Configuración central (seguridad, JWT)
│   ├── db/                 # Conexión y sesión de base de datos
│   ├── models/             # Estructura de las tablas (SQLAlchemy)
│   ├── venv/               # Tu entorno virtual (Movido aquí)
│   ├── .env                # Secretos del backend (DB_PASSWORD, etc.)
│   ├── alembic.ini         # Configuración de migraciones
│   ├── main.py             # Punto de entrada de la API
│   ├── requirements.txt    # Lista de librerías Python
│   └── Dockerfile          # Instrucciones para meter el backend en una ballena
│
└── FRONTEND/               <-- La cara visual (Next.js)
    ├── node_modules/       # Librerías de JavaScript (Se crean solas)
    ├── public/             # Imágenes, logos y fuentes
    ├── src/                # El código de la web (App Router)
    │   ├── app/            # Páginas (login, dashboard, admin...)
    │   ├── components/     # Piezas reutilizables (Botones, Inputs)
    │   └── lib/            # Funciones para hablar con el Backend
    ├── package.json        # Configuración de la web
    ├── tailwind.config.ts  # Estilos de la clínica
    └── next.config.js      # Configuración de Next.js
