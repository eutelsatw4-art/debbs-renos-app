<<<<<<< HEAD
# Debbs Renos - React + Node.js Prototype

This prototype contains a React frontend and an Express backend with a simple admin API and SQLite storage. It's designed as an editable site you can extend.

Quick start (from project root):

1. Install dependencies

```bash
cd debbs-renos-app
npm install
```

2. Start backend (port 4000) and frontend (port 3000)

```bash
# terminal 1
npm run server

# terminal 2
npm run client
```

Open http://localhost:3000

Admin UI
---------
After starting the server and client, open `http://localhost:3000/admin` to access the simple admin interface where you can edit site title, tagline, services and projects and upload images. Changes are saved to `server/data.json`.

Email (contact) configuration
-----------------------------
To enable real email sending, create a `.env` file in `server/` (not checked into source) using values from `.env.example` and restart the server. If SMTP is not configured, contact submissions are saved into the prototype data file under `_contacts`.

Docker Deployment
-----------------
For easy deployment to any host, use Docker and Docker Compose.

1. Install Docker and Docker Compose on your host machine

2. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your admin password and SMTP settings
```

3. Build and start the containers
```bash
docker-compose up -d --build
```

4. Access the application
- Frontend: http://localhost (port 80)
- Admin Panel: http://localhost/admin
- Backend API: http://localhost:4000

5. Useful commands
```bash
# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart containers
docker-compose restart

# Remove volumes (deletes database and uploads)
docker-compose down -v
```

The Docker setup includes:
- **Server container**: Node.js backend with SQLite database
- **Client container**: React frontend served by nginx
- **Persistent volumes**: Database and uploaded files are preserved across container restarts
- **Network**: Services communicate via internal Docker network
=======
# Debbs Renos - React + Node.js Prototype

This prototype contains a React frontend and an Express backend with a simple admin API and SQLite storage. It's designed as an editable site you can extend.

Quick start (from project root):

1. Install dependencies

```bash
cd debbs-renos-app
npm install
```

2. Start backend (port 4000) and frontend (port 3000)

```bash
# terminal 1
npm run server

# terminal 2
npm run client
```

Open http://localhost:3000

Admin UI
---------
After starting the server and client, open `http://localhost:3000/admin` to access the simple admin interface where you can edit site title, tagline, services and projects and upload images. Changes are saved to `server/data.json`.

Email (contact) configuration
-----------------------------
To enable real email sending, create a `.env` file in `server/` (not checked into source) using values from `.env.example` and restart the server. If SMTP is not configured, contact submissions are saved into the prototype data file under `_contacts`.

Docker Deployment
-----------------
For easy deployment to any host, use Docker and Docker Compose.

1. Install Docker and Docker Compose on your host machine

2. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your admin password and SMTP settings
```

3. Build and start the containers
```bash
docker-compose up -d --build
```

4. Access the application
- Frontend: http://localhost (port 80)
- Admin Panel: http://localhost/admin
- Backend API: http://localhost:4000

5. Useful commands
```bash
# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart containers
docker-compose restart

# Remove volumes (deletes database and uploads)
docker-compose down -v
```

The Docker setup includes:
- **Server container**: Node.js backend with SQLite database
- **Client container**: React frontend served by nginx
- **Persistent volumes**: Database and uploaded files are preserved across container restarts
- **Network**: Services communicate via internal Docker network
>>>>>>> 66ae0d1569fb70eb9cdbbeeabd7b31332c83ad4d
