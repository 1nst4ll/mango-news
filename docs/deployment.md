# Deployment Instructions

This document provides guidance on deploying the Mango News application to various server environments.

## Prerequisites

*   Access to a PostgreSQL database server.
*   Necessary environment variables configured on the server(s).

## Database Deployment

1.  **Set up PostgreSQL Database:** Ensure you have a PostgreSQL database set up on your server or a managed database service (like Render's PostgreSQL service). Note the database credentials (host, name, user, password).
2.  **Apply Schema:** Apply the database schema defined in [`../db/schema.sql`](../db/schema.sql) to your database. You can typically do this using a database management tool or the `psql` command-line utility.

## Backend Deployment (Node.js/Express)

The backend can be deployed to various Node.js compatible hosting environments.

### General Node.js Server Deployment

1.  **Transfer Backend Files:** Transfer the contents of the `backend/` directory to your server.
2.  **Install Dependencies:** Navigate to the backend directory on your server using the terminal and install dependencies:
    ```bash
    cd /path/to/your/backend
    npm install --production
    ```
    Using `--production` ensures only production dependencies are installed.
3.  **Configure Environment Variables:** Configure the necessary environment variables for the backend on your server. The required variables are listed in `backend/.env.example`. The method for setting environment variables varies depending on your server setup (e.g., using a process manager like PM2, systemd service files, or your hosting control panel's configuration).
    *   `DB_HOST`
    *   `DB_NAME`
    *   `DB_USER`
    *   `DB_PASSWORD`
    *   `GROQ_API_KEY`
    *   `IDEOGRAM_API_KEY`
    *   (Optional) `FIRECRAWL_API_KEY` (if not using the MCP server)
4.  **Start the Backend Process:** Start the backend application. For production environments, it's recommended to use a process manager like PM2 to keep the application running and manage restarts.
    ```bash
    # Example using PM2
    npm install -g pm2 # Install PM2 globally if not already installed
    pm2 start index.js --name mango-news-backend
    pm2 save # Save the process list to restart on boot
    ```
5.  **Configure Web Server (Reverse Proxy):** Configure your web server (like Nginx or Apache) to proxy requests to your running Node.js backend process. This typically involves setting up a server block that listens on a public port (e.g., 80 or 443) and forwards requests to the port your Node.js application is listening on (default 3000).

### Render Web Service Deployment (Backend)

1.  **Create a New Web Service:** In your Render dashboard, create a new Web Service.
2.  **Connect Repository:** Connect your Git repository containing the Mango News code.
3.  **Root Directory:** Specify the `backend` directory as the Root Directory for this service.
4.  **Build Command:** Set the Build Command to `npm install`.
5.  **Start Command:** Set the Start Command to `node src/index.js`.
6.  **Environment Variables:** Add the required environment variables listed in `backend/.env.example` to the service's environment settings in Render.
7.  **Deploy:** Render will automatically build and deploy your backend service. Note the public URL provided by Render for your backend service.

## Frontend Deployment (Astro)

The frontend is configured for server-side rendering (SSR) using the `@astrojs/node` adapter, requiring a Node.js compatible server environment.

### General Node.js Server Deployment (Frontend)

1.  **Install Server Adapter:** Ensure the `@astrojs/node` adapter is installed and configured in `frontend/astro.config.mjs` with `output: 'server'` and the adapter added to `integrations`. This was done by running `npx astro add node` previously.
2.  **Build the Astro Project:** On your local machine or a build server, build the Astro frontend project for production:
    ```bash
    cd frontend
    npm install # Ensure dependencies are installed
    npm run build
    ```
    This will generate a `dist/` directory containing the server build output.
3.  **Transfer Frontend Files:** Transfer the contents of the `dist/` directory from your local machine to your server.
4.  **Configure Environment Variables:** Ensure the `PUBLIC_API_URL` environment variable is set to the public URL of your deployed backend API. This is typically handled by your hosting environment's configuration.
    *   `PUBLIC_API_URL=https://your-backend-api-url.com`
    Replace `https://your-backend-api-url.com` with the public URL of your deployed backend API.
5.  **Run the Node.js server:** The Astro build for the Node adapter in standalone mode generates a server entrypoint at `./dist/server/entry.mjs`. To run this server and ensure it binds to the correct network interface and port for your hosting environment, use the following command:
    ```bash
    HOST=0.0.0.0 PORT=$PORT node ./dist/server/entry.mjs
    ```
    Replace `$PORT` with the actual environment variable name provided by your hosting provider if it's not `PORT`. You will need to configure your hosting environment to run this command to start the application.
6.  **Configure Web Server (Reverse Proxy):** Configure your web server (like Nginx or Apache) to act as a reverse proxy, forwarding incoming requests to the port your Node.js server is listening on.

### Render Web Service Deployment (Frontend)

1.  **Create a New Web Service:** In your Render dashboard, create a new Web Service.
2.  **Connect Repository:** Connect your Git repository containing the Mango News code.
3.  **Root Directory:** Specify the `frontend` directory as the Root Directory for this service.
4.  **Build Command:** Set the Build Command to `npm install && npm run build`.
5.  **Start Command:** Set the Start Command to `node ./dist/server/entry.mjs`.
6.  **Environment Variables:** Add the `PUBLIC_API_URL` environment variable to the service's environment settings in Render. The value should be the public URL of your deployed backend service.
    *   **Key:** `PUBLIC_API_URL`
    *   **Value:** `https://your-backend-api-url.com` (Replace with your actual backend URL)
7.  **Deploy:** Render will automatically build and deploy your frontend service.

## Inmotion Hosting Specifics (WP Launch)

*   **Environment:** Inmotion Hosting often uses cPanel. You can typically manage databases (PostgreSQL via phpPgAdmin or similar), set up Node.js applications (sometimes via a "Setup Node.js App" tool), and configure Nginx/Apache via `.htaccess` files or cPanel's "Indexes" or "Directory Privacy" tools, although direct Nginx configuration might require contacting support or using advanced features.
*   **WP Launch:** If using a WP Launch package, the environment is primarily optimized for WordPress. Deploying a custom Node.js backend and Astro frontend might require using a subdomain or a separate directory outside the main WordPress installation and potentially more advanced server configuration than readily available through standard cPanel. Consult Inmotion Hosting's documentation or support for the best approach for deploying custom applications.

## Updating Documentation

After successfully deploying, remember to update the `PROGRESS.md` and potentially other documentation files to reflect the deployment status and any specific server configurations or notes relevant to your setup.

## Further Documentation

*   [Backend Setup and Configuration](./backend-setup.md)
*   [Frontend UI Styling and Stack](./frontend-ui.md)
*   [Troubleshooting Common Issues](./troubleshooting.md)
