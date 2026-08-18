#!/bin/bash
set -e

echo "Waiting for Debezium Connect API to become ready..."
until curl -s http://localhost:8083/connectors > /dev/null; do
  echo "Debezium Connect not ready yet, sleeping 5s..."
  sleep 5
done

echo "Registering PostgreSQL Debezium Connector..."
curl -i -X POST -H "Accept:application/json" -H "Content-Type:application/json" \
  http://localhost:8083/connectors/ -d @debezium/register-postgres.json

echo ""
echo "Connector status:"
curl -s http://localhost:8083/connectors/postgres-connector/status
echo ""
echo "Setup completed successfully!"
