# Backups

This directory holds database backups. Dump files are excluded from version control via `.gitignore`.

## Structure

```
backups/
└── postgres/          # PostgreSQL plain-SQL dumps
    ├── .gitkeep       # keeps the folder tracked in git
    └── frameflow_YYYYMMDD_HHmmss.sql
```

## Creating a backup

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$env:PGPASSWORD = "frameflow"
pg_dump --host=localhost --port=5433 --username=frameflow --dbname=frameflow `
        --format=plain --no-owner --no-acl `
        --file="backups/postgres/frameflow_${timestamp}.sql"
```

## Restoring a backup

```powershell
$env:PGPASSWORD = "frameflow"
psql --host=localhost --port=5433 --username=frameflow --dbname=frameflow `
     --file="backups/postgres/frameflow_YYYYMMDD_HHmmss.sql"
```
