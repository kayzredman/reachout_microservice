#!/bin/bash
set -e

# Create all FaithReach service databases
for db in faithreach_user faithreach_post faithreach_billing faithreach_notification faithreach_platform faithreach_payment faithreach_support; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE $db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
done
