# CDC To-Do DevOps Stack

Complete production-ready Event-Driven CQRS Architecture:
- **Writes:** React -> Node Backend -> PostgreSQL (WAL `wal_level=logical`)
- **Change Data Capture:** Debezium PostgreSQL Connector
- **Event Bus:** Apache Kafka
- **CDC Sync Engine:** Node.js Kafka Consumer -> Elasticsearch Indexer
- **Reads/Search:** React -> Node Backend -> Elasticsearch

---

## How to Run Locally with Docker

1. **Start all 8 services:**
   ```bash
   docker compose up --build -d
   ```

2. **Wait ~20s and register the Debezium Connector:**
   ```bash
   chmod +x register-connector.sh
   ./register-connector.sh
   ```

3. **Open the web application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:5000/api/todos/search](http://localhost:5000/api/todos/search)
   - Elasticsearch Status: [http://localhost:9200/todos/_search](http://localhost:9200/todos/_search)
   - Debezium Status: [http://localhost:8083/connectors/postgres-connector/status](http://localhost:8083/connectors/postgres-connector/status)

---

## Kubernetes Deployment
When you are ready to deploy to K8s:
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/
```
