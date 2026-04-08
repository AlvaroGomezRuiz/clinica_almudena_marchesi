# Manual Maestro de Operaciones: Clínica Almudena


##  Nivel 1: Infraestructura y Control Total (Docker)
**Uso:** Gestión del ciclo de vida del servidor y mantenimiento del motor de base de datos.

| Acción                |         Comando           |            Uso Específico                              |
| :---                  |          :---             |                :---                                    |
| **Encender Búnker**   | `docker-compose up -d`    | Inicia la base de datos en segundo plano.              |
| **Apagar Búnker**     | `docker-compose down`     | Cierra todos los servicios de forma segura.            |
| **Estado de Celdas**  | `docker ps`               | Verifica qué contenedores están activos y sus puertos. |
| **Ver Logs DB**       | `docker logs almudena_db` | Diagnóstico si la base de datos no arranca.            |

---


## 🗄️ Nivel 2: Gestión de Datos (MySQL)
**Contenedor:** `almudena_db` | **Base de Datos:** `almudena_clinic`

🔑 Inventario de Credenciales:
* **Root (Dios del Sistema)**
    * Usuario: `root`
    * Contraseña: `almudena`
    * Uso: Control absoluto del motor MySQL. Solo se usa para mantenimiento crítico o cambios de estructura.

* **API (Usuario Aplicación)**
    * Usuario: `api_almudena`
    * Contraseña: `almudena`
    * Uso: Credenciales que usa el código Python (`.env`) para escribir y leer de la base de datos de forma automática.


* **COMANDOS DE ACCESO A TERMINAL**
    * **Entrar como Root:**
        ```powershell docker exec -it almudena_db mysql -u root -p```
    * **Entrar como Usuario API:**
        ```powershell docker exec -it almudena_db mysql -u api_almudena -p ```

* **COMANDOS DE BLINDAJE (PRIVILEGIOS MÍNIMOS)**
    * **Una vez dentro de MySQL:**
        ```sql REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'api_almudena'@'%'; GRANT SELECT, INSERT, UPDATE, DELETE ON almudena_clinic.* TO 'api_almudena'@'%'; FLUSH PRIVILEGES;```

---


### ⚙️ Nivel 3: El Cerebro (Backend FastAPI)
**Puerto Local:** `8000` | **Documentación:** `http://localhost:8000/docs`

* **COMANDOS BACKEND**
1- cd backend
2- .\venv\Scripts\activate
3- uvicorn main:app --reload --port 8000

 🔐 Seguridad Crítica (.env)
 **SECRET_KEY:** `193b53d679185f62a02ae0191327c478fa9f101d0f0650b8871a6fc090e43a74`
    **Uso:** Firma los tokens JWT. Es la llave que permite a Almudena entrar al Dashboard

---


### 💻 Nivel 4: Interfaz de Usuario (Frontend Next.js)
Puerto Local: 3000 | Acceso: http://localhost:3000/login

    👤 Acceso Humano (Login App)
        Usuario: almudena

        Contraseña: Almudena2026!

Uso: Acceso diario al sistema de gestión para registrar pacientes y citas.

* **COMANDOS FRONTEND**
1- PowerShell
2- cd frontend
3- npm run dev

---


### 🛠️ Nivel 5: Scripts de Mantenimiento y Auditoría
Uso: Verificación de seguridad y copias de seguridad.

* **Test de Criptografía:**
1- PowerShell
2- & .\backend\venv\Scripts\python.exe .\backend\scripts\test_crypto.py
Uso: Verifica que las llaves de cifrado del .env funcionan y los datos se guardan seguros.


* **Backup Real (Exportar Datos):**
1- PowerShell
2- docker exec almudena_db /usr/bin/mysqldump -u root -palmudena almudena_clinic > backup_pacientes.sql
Uso: Genera un archivo con toda la información de la clínica para respaldo externo.

* **Backup Entorno:**
1- .\rebuild_bunker.ps1

###
