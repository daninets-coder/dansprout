# Connect Railway PostgreSQL To pgAdmin

This guide explains how to connect the Story Sprout Railway PostgreSQL database to pgAdmin from a Windows computer.

## Important Security Rule

Do not put the real database password or complete database connection URL in:

- GitHub
- `AAA_SQL.md`
- `AAA_SQLconnect.md`
- Screenshots
- Email
- Chat messages

Use Railway’s private variables or a password manager for database credentials.

## What You Need

- Railway account access.
- Access to the `cozy-truth` Railway project.
- The `production` environment selected.
- pgAdmin installed on your computer.
- The PostgreSQL username and password from Railway.

## Part 1: Install And Log In To Railway CLI

Open PowerShell and check that Node.js and npm are installed:

```powershell
node --version
npm --version
```

Install the Railway CLI if the `railway` command is not recognized:

```powershell
npm install --global @railway/cli
```

Confirm the installation:

```powershell
railway --version
```

Log in:

```powershell
railway login
```

A browser window should open. Complete the Railway login, then return to PowerShell.

If the browser does not open, use:

```powershell
railway login --browserless
```

## Part 2: Link The Local Terminal To Railway

Move into the Story Sprout project folder:

```powershell
cd C:\DanielBusines\story-sprout-web\story-sprout-web
```

Link the terminal:

```powershell
railway link
```

Choose these values:

```text
Workspace: daninets-coder's Projects
Project: cozy-truth
Environment: production
Service: Postgres
```

The link connects your terminal to the Railway project. It does not change or delete database data.

## Part 3: Preferred Connection Method: Encrypted Tunnel

In Railway, open:

```text
Postgres service -> Settings -> Networking
```

Look for:

```text
Connect without exposing the database
From your machine
```

Railway may show a command to copy. Use the exact command Railway provides. It may be similar to:

```powershell
railway connect Postgres
```

Keep the PowerShell window open while using the connection.

### Important tunnel detail

The Railway CLI may open a direct PostgreSQL terminal session instead of exposing a local host and port. That is useful for command-line SQL, but pgAdmin needs a host and port.

If the Railway tunnel output gives you a local host and port, use those values in pgAdmin:

```text
Host: localhost or 127.0.0.1
Port: the local port shown by Railway
```

If it only opens a `psql` prompt and does not show a local port, use the Public Access method below for pgAdmin.

## Part 4: pgAdmin Public Connection Method

This method is straightforward for pgAdmin but temporarily exposes a public database endpoint. Use it only when needed.

### Enable Public Access

In Railway:

1. Open the `cozy-truth` project.
2. Choose the `production` environment.
3. Select the **Postgres** service.
4. Open **Settings**.
5. Open **Networking**.
6. Under **Public Access**, enable it.
7. Copy the generated `DATABASE_PUBLIC_URL`.

The URL looks like this:

```text
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

Never share the real URL.

### Split The URL

Example only:

```text
postgresql://story_user:REDACTED_PASSWORD@public-host.example:24567/story_sprout
```

The pgAdmin values would be:

| pgAdmin field | Example value |
|---|---|
| Name | `Story Sprout Railway Production` |
| Host name/address | `public-host.example` |
| Port | `24567` |
| Maintenance database | `story_sprout` |
| Username | `story_user` |
| Password | Private Railway password |
| SSL mode | `Require` |

Your real host, port, username, and database name come from Railway. Do not assume the public port is `5432`.

## Part 5: Create The pgAdmin Server Connection

Open pgAdmin.

1. Right-click **Servers**.
2. Choose **Register -> Server**.
3. On the **General** tab:
   - Name: `Story Sprout Railway Production`
4. Open the **Connection** tab.
5. Enter the host, port, database, username, and password.
6. Open the **SSL** tab.
7. Set SSL mode to `Require` if Railway requires SSL.
8. Click **Save**.

If the connection succeeds:

1. Expand the server.
2. Expand **Databases**.
3. Open the Story Sprout database.
4. Open **Tools -> Query Tool**.

## Part 6: Run A Safe Test Query

Start with this read-only query:

```sql
SELECT current_database(), current_user, NOW();
```

Then check that the application tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Check the current account count:

```sql
SELECT COUNT(*) AS account_count
FROM accounts;
```

Use the larger debugging query collection in:

- `AAA_SQL.md`

## Part 7: Common Connection Problems

### `railway` is not recognized

Install the CLI:

```powershell
npm install --global @railway/cli
```

Then verify:

```powershell
railway --version
```

### `Unauthorized. Please login with railway login`

Run:

```powershell
railway login
```

Then run `railway link` again.

### Wrong Railway project

Run:

```powershell
railway link
```

Choose:

```text
Workspace: daninets-coder's Projects
Project: cozy-truth
Environment: production
Service: Postgres
```

### pgAdmin cannot connect to localhost

The tunnel may not be running, or the tunnel may not provide a local pgAdmin port. Keep the Railway terminal open and confirm the host and port shown by Railway.

If Railway only opens a command-line `psql` session, use the Public Access method for pgAdmin.

### Connection timeout

Check:

- Public Access is enabled if using the public method.
- The host is copied exactly.
- The port is copied exactly.
- Your computer’s network allows the connection.
- The Railway Postgres service is online.
- SSL mode is set to `Require` when needed.

### Password authentication failed

Do not guess the password. Copy the current private PostgreSQL password from Railway variables or use the connection details Railway provides. If the password was exposed, rotate it before reconnecting.

### SSL error

In pgAdmin, open the **SSL** tab and try:

```text
SSL mode: Require
```

Use Railway’s documented SSL requirement for the connection you copied.

## Part 8: Disable Public Access After Debugging

When finished:

1. Close pgAdmin.
2. Return to Railway.
3. Open **Postgres -> Settings -> Networking**.
4. Disable **Public Access** if you do not need it.
5. Keep the database password private.

The encrypted tunnel is preferred for occasional debugging. Public Access should not remain enabled without a reason, strong credentials, and a clear security plan.

## Connection Summary

```text
Railway project
  -> production environment
  -> Postgres service
  -> encrypted tunnel OR temporary public connection
  -> pgAdmin server registration
  -> Query Tool
  -> read-only SQL from AAA_SQL.md
```
