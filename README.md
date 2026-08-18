Here is a complete, production-grade **`README.md`** documentation file. It covers everything built in this project, explaining the architecture, every single step taken, the underlying DevOps concepts, and how these systems operate in real enterprise production environments.

---

# Real-Time Event-Driven CQRS Platform with Change Data Capture (CDC)

An enterprise-grade, event-driven data streaming platform utilizing **PostgreSQL**, **Debezium**, **Apache Kafka**, and **Elasticsearch** under the **CQRS (Command Query Responsibility Segregation)** pattern. Containerized with Docker and structured for Kubernetes deployment.

---

## 1. Executive Summary & Architecture

Modern scalable applications separate transactional writes (OLTP) from analytics and search reads (OLAP / CQRS) without dual-writing from the application layer. Dual-writes create race conditions, partial failures, and data inconsistencies.

This architecture leverages **Change Data Capture (CDC)** at the database log level (PostgreSQL WAL) to reliably stream database events asynchronously through a distributed message broker into a search-optimized datastore.

### Architecture Topology

```
                                  [ WRITE PATH (OLTP) ]
                                            │
                                            ▼
┌──────────────────┐               ┌──────────────────┐
│  React Frontend  │ ──(HTTP POST)─►│ Node.js Backend  │
│   (Port 3000)    │               │   (Port 5000)    │
└──────────────────┘               └────────┬─────────┘
         ▲                                  │ (SQL INSERT/UPDATE/DELETE)
         │                                  ▼
         │                         ┌──────────────────┐
         │                         │ PostgreSQL (WAL) │ (Port 5432/5433)
         │                         └────────┬─────────┘
         │                                  │ (Logical Replication - pgoutput)
         │ [ READ PATH (CQRS) ]             ▼
         │                         ┌──────────────────┐
         │                         │ Debezium Connect │ (Port 8083)
         │                         └────────┬─────────┘
         │                                  │ (JSON Event Streams)
         │                                  ▼
         │                         ┌──────────────────┐ ◄── [ Kowl Console ]
         │                         │   Apache Kafka   │     (Port 8080)
         │                         │  (Topic: todos)  │
         │                         └────────┬─────────┘
         │                                  │ (Consume Stream)
         │                                  ▼
         │                         ┌──────────────────┐
         │                         │   CDC Consumer   │
         │                         │  (Node.js Worker)│
         │                         └────────┬─────────┘
         │                                  │ (Bulk Upsert / Delete)
         │                                  ▼
         │                         ┌──────────────────┐ ◄── [ Kibana ]
         └───────(Search / Read)───┤  Elasticsearch   │     (Port 5601)
                                   │  (Index: todos)  │
                                   └──────────────────┘

```

---

## 2. Technology Stack & DevOps Roles

| Component | Technology | Production Role & Responsibility |
| --- | --- | --- |
| **Frontend** | React 18 + Nginx | Serves SPA static assets and proxies `/api/*` traffic to the backend.

 |
| **Backend API** | Node.js + Express | Handles write commands directly into PostgreSQL and search queries from Elasticsearch.

 |
| **Primary Database** | PostgreSQL 15 | System of Record (SoR) configured with `wal_level=logical` for change-log streaming.

 |
| **CDC Engine** | Debezium 2.5 | Reads PostgreSQL WAL changes using `pgoutput` plugin and writes structured events to Kafka.

 |
| **Message Broker** | Kafka 7.6 + ZooKeeper | High-throughput distributed message log ensuring durable, ordered event delivery.

 |
| **CDC Consumer** | Node.js Worker | Consumes CDC events (`op: c, u, d`) from Kafka and maintains Elasticsearch document state.

 |
| **Search Engine** | Elasticsearch 8.13 | Inverted-index read datastore enabling sub-millisecond full-text queries.

 |
| **Kafka Observability** | Kowl (Redpanda Console) | Real-time Kafka topic inspection, consumer lag monitoring, and partition debugging. |
| **Data Visualization** | Kibana 8.13 | Elasticsearch dashboarding, index management, and document querying. |

---

## 3. Directory Structure

```text
todo-cdc-platform/
├── backend/
│   ├── Dockerfile                  # Production Node.js container image[cite: 4]
│   ├── package.json                # Express, pg, elasticsearch SDK[cite: 14]
│   └── src/
│       └── server.js               # Write endpoints (PG) & Search endpoints (ES)[cite: 20]
├── frontend/
│   ├── Dockerfile                  # Multi-stage build (Node build -> Nginx Alpine)[cite: 1]
│   ├── nginx.conf                  # Nginx reverse proxy configuration[cite: 11]
│   ├── package.json                # React dependencies[cite: 12]
│   ├── public/
│   │   └── index.html              # HTML root shell[cite: 18]
│   └── src/
│       ├── App.js                  # React UI with Live CDC Pipeline Visualizer[cite: 16]
│       └── index.js                # React DOM entrypoint[cite: 17]
├── consumer/
│   ├── Dockerfile                  # Lightweight Node.js worker image[cite: 1]
│   ├── package.json                # kafkajs, @elastic/elasticsearch[cite: 13]
│   └── src/
│       └── consumer.js             # Event transformer & indexer[cite: 19]
├── postgres-init/
│   └── 01-init.sql                 # Table schema + REPLICA IDENTITY FULL[cite: 15]
├── debezium/
│   └── register-postgres.json      # Debezium Postgres connector JSON config[cite: 10]
├── k8s/                            # Kubernetes Deployment Manifests[cite: 9]
│   ├── 00-namespace.yaml           # Dedicated namespace manifest[cite: 9]
│   ├── 01-postgres.yaml            # StatefulSet and Service for PostgreSQL[cite: 8]
│   ├── 02-backend.yaml             # Backend Deployment and Service[cite: 7]
│   ├── 03-consumer.yaml            # Consumer Deployment[cite: 6]
│   └── 04-frontend.yaml            # Frontend Deployment and NodePort Service[cite: 5]
├── docker-compose.yml              # Complete 10-container local orchestration[cite: 3]
├── register-connector.sh           # Automated healthcheck + registration script[cite: 4]
└── README.md                       # Complete operations & architecture manual[cite: 2]

```

---

## 4. How Everything Works Under the Hood

### Step 1: The Write Path (PostgreSQL WAL)

1. A user submits a task via the UI.


2. The Backend executes `INSERT INTO todos (...)` into PostgreSQL.


3. PostgreSQL records this change in its **Write-Ahead Log (WAL)**.


4. By configuring `wal_level = logical` and `REPLICA IDENTITY FULL`, Postgres includes both previous (`before`) and new (`after`) row states in the transaction log.



### Step 2: Change Data Capture (Debezium)

1. Debezium connects to PostgreSQL via a logical replication slot using the native `pgoutput` plugin.


2. It parses the binary WAL stream and converts row changes into JSON event envelopes containing:
* `op`: Operation type (`c` = create, `u` = update, `d` = delete, `r` = read snapshot).


* `before`: State of row before change (for updates/deletes).


* `after`: State of row after change (for creates/updates).




3. Debezium writes these records to the Kafka topic: `postgres.public.todos`.



### Step 3: Stream Processing & Indexing (Consumer)

1. The CDC Consumer service joins the Kafka consumer group `es-cdc-group`.


2. Upon receiving a message:
* If `op` is `c` or `u`, it executes an upsert to Elasticsearch index `todos` with `_id = after.id`.


* If `op` is `d`, it executes a document delete in Elasticsearch using `before.id`.




3. Elasticsearch immediately updates its inverted index.



### Step 4: The Read Path (Elasticsearch CQRS)

1. When users search or load the task list, requests go to `GET /api/todos/search?q=...`.


2. The Backend routes this query directly to **Elasticsearch**, completely offloading read pressure from PostgreSQL.



---

## 5. Step-by-Step Setup & Operations Guide

### Prerequisites

* Docker & Docker Compose installed


* Ports available: `3000` (Frontend), `5000` (Backend), `5433` (Postgres), `8080` (Kowl), `8083` (Debezium), `9092` (Kafka), `9200` (Elasticsearch), `5601` (Kibana)



### Step 1: Start All Services

```bash
docker-compose up --build -d

```

Verify that all containers are healthy:

```bash
docker-compose ps

```

### Step 2: Register the Debezium Postgres Connector

Run the automated script to wait for the Connect API and register the connector:

```bash
chmod +x register-connector.sh
./register-connector.sh

```

Verify connector and task status:

```bash
curl -s http://localhost:8083/connectors/postgres-connector/status

```

*Expected output: Both `connector` and `tasks[0]` must show `"state": "RUNNING"`.*

### Step 3: Access Dashboards & UI

* **Application UI:** [http://localhost:3000](http://localhost:3000)

* **Kafka UI (Kowl / Redpanda Console):** [http://localhost:8080](http://localhost:8080)
* View topics: Click on `postgres.public.todos` to inspect real-time JSON CDC envelopes.


* **Elasticsearch Search API:** [http://localhost:9200/todos/_search](http://localhost:9200/todos/_search)

* **Kibana:** [http://localhost:5601](http://localhost:5601)
* Go to **Stack Management → Data Views** → Create view for index `todos` with timestamp field `created_at`.





---

## 6. Real-World Production DevOps Considerations

When transitioning this architecture from Docker Compose to a production Kubernetes environment (e.g., AWS EKS, GCP GKE, Bare-Metal K8s), consider the following operational requirements:

### 1. Schema Evolution & Serialization

* **Current:** Plain JSON over Kafka.


* **Production:** Use **Apache Avro** or **Protobuf** with a **Confluent Schema Registry**. This prevents breaking downstream consumers when database schemas change (forward and backward schema compatibility).

### 2. High Availability & Data Durability

* **Kafka:** Run a minimum 3-broker cluster with `min.insync.replicas=2` and topic replication factor of `3`. Replace ZooKeeper with KRaft mode.
* **PostgreSQL:** Use HA replicas with Patroni / Stolon. Configure separate replication slots for Debezium to prevent WAL truncation.
* **Elasticsearch:** Deploy minimum 3 master-eligible nodes and 2 data nodes with index replica count $\ge 1$.

### 3. Error Handling & Dead Letter Queues (DLQ)

* Configure Debezium and Consumer to route malformed or poison-pill messages to a Dead Letter Queue topic (`postgres.public.todos.dlq`) rather than crashing the consumer group.

### 4. Security & Compliance

* **Transport:** Enforce TLS encryption for all container-to-container communication.
* **Authentication:** Use SASL/SCRAM or mTLS for Kafka and RBAC for Elasticsearch (X-Pack Security).
* **Secrets:** Store database passwords and tokens in Kubernetes Secrets or HashiCorp Vault, rather than environment variables in plain text.

---

## 7. Troubleshooting Runbook

### Common Issues & Solutions

| Symptom | Cause | Solution |
| --- | --- | --- |
| `Bind for 0.0.0.0:5432 failed: port is already allocated`<br> | Local Postgres running on host machine.

 | Map host port to `5433:5432` in `docker-compose.yml` or stop local Postgres with `brew services stop postgresql`.

 |
| `Bind for 0.0.0.0:9200 failed: port is already allocated` | Local Elasticsearch or OpenSearch running on host. | Map host port to `9201:9200` in `docker-compose.yml` or stop the host service. |
| Connector status shows `404 Not Found`<br> | Debezium connector hasn't finished initial setup.

 | Wait 10-15 seconds and re-run `curl http://localhost:8083/connectors/postgres-connector/status`.

 |
| Consumer does not sync records to Elasticsearch | Topic does not exist or consumer group is stuck. | Open Kowl ([http://localhost:8080](http://localhost:8080)), verify the topic `postgres.public.todos` exists, and check consumer group `es-cdc-group` lag.

 |

---

## 8. Kubernetes Deployment (Next Step)

Deploy all manifests to your target Kubernetes cluster:

```bash
# 1. Create the dedicated namespace
kubectl apply -f k8s/00-namespace.yaml

# 2. Deploy database, backend, consumer, and frontend
kubectl apply -f k8s/

# 3. Verify Pod and Service health
kubectl get pods,svc -n cdc-todo-app

```
