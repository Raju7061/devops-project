Here is the complete, raw **`README.md`** file ready to copy and paste directly into your project:

```markdown
# Enterprise Change Data Capture (CDC) & CQRS Real-Time Platform

A production-grade, event-driven data streaming platform implementing the **Command Query Responsibility Segregation (CQRS)** pattern. It decouples transactional writes from search queries by streaming database transactions in real time using **PostgreSQL**, **Debezium**, **Apache Kafka**, and **Elasticsearch**.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [CQRS & CDC Design Pattern](#2-cqrs--cdc-design-pattern)
3. [Technology Stack](#3-technology-stack)
4. [Directory & File Tree](#4-directory--file-tree)
5. [End-to-End Data Lifecycle](#5-end-to-end-data-lifecycle)
6. [Step-by-Step Local Deployment (Docker)](#6-step-by-step-local-deployment-docker)
7. [Observability & Web Dashboards](#7-observability--web-dashboards)
8. [Production DevOps Best Practices](#8-production-devops-best-practices)
9. [Troubleshooting & Common Pitfalls](#9-troubleshooting--common-pitfalls)
10. [Kubernetes (K8s) Migration Guide](#10-kubernetes-k8s-migration-guide)

---

## 1. Architecture Overview

Traditional web applications often suffer from dual-write inconsistencies or heavy database query loads when running analytical and full-text search operations directly against relational transactional databases (OLTP). 

This platform resolves that by using **log-based Change Data Capture (CDC)**:


```

```
                        [ WRITE / COMMAND PATH ]
                                   │
                                   ▼

```

┌──────────────────┐          ┌──────────────────┐
│  React Frontend  │ ──POST──►│ Node.js Backend  │
│   (Port 3000)    │          │   (Port 5000)    │
└──────────────────┘          └────────┬─────────┘
▲                             │ (INSERT / UPDATE / DELETE)
│                             ▼
│                    ┌──────────────────┐
│                    │ PostgreSQL 15    │ (Port 5433:5432)
│                    │ (WAL Log Engine) │
│                    └────────┬─────────┘
│                             │ (Logical Replication Stream)
│                             ▼
│                    ┌──────────────────┐
│                    │ Debezium Connect │ (Port 8083)
│                    └────────┬─────────┘
│                             │ (JSON Change Events)
│                             ▼
│                    ┌──────────────────┐ ◄─── [ Redpanda Console / Kowl ]
│                    │   Apache Kafka   │      (Port 8080)
│                    │ (todos topic)    │
│                    └────────┬─────────┘
│                             │ (Event Consumer Stream)
│                             ▼
│                    ┌──────────────────┐
│                    │   CDC Consumer   │
│                    │ (Node.js Worker) │
│                    └────────┬─────────┘
│                             │ (Bulk Index / Upsert / Delete)
│ [ READ / QUERY PATH ]       ▼
│                    ┌──────────────────┐ ◄─── [ Kibana Analytics UI ]
└──────SEARCH────────┤  Elasticsearch   │      (Port 5601)
│  (todos index)   │
└──────────────────┘

```

---

## 2. CQRS & CDC Design Pattern

* **Command Path (Writes):** High-integrity ACID writes go directly to PostgreSQL. The backend service does **not** write to Elasticsearch directly.
* **Log-Based CDC (Debezium):** Debezium reads PostgreSQL's internal Write-Ahead Log (`wal_level=logical`) using the native `pgoutput` plugin. Zero database triggers or application polling are required.
* **Message Broker (Kafka):** Kafka provides a persistent, ordered, distributed commit log ensuring events are buffered and durably stored.
* **Query Path (Reads):** When searching or loading tasks, queries hit Elasticsearch directly through the backend. This provides sub-millisecond full-text search without consuming PostgreSQL database connections.

---

## 3. Technology Stack

| Service | Technology | Role & Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Nginx | SPA with real-time CDC visualizer; proxies API calls through Nginx. |
| **Backend API** | Node.js (Express) | Handles command endpoints (`POST`, `PUT`, `DELETE`) and queries Elasticsearch (`GET`). |
| **Primary Database** | PostgreSQL 15 | Primary System of Record with `REPLICA IDENTITY FULL` for WAL extraction. |
| **CDC Engine** | Debezium Connect 2.5 | Captures low-level database mutation logs and publishes to Kafka. |
| **Message Broker** | Apache Kafka 7.6 + ZooKeeper | Distributed event streaming broker. |
| **CDC Consumer** | Node.js Worker (`kafkajs`) | Processes stream events (`op: c, u, d`) and syncs state to Elasticsearch. |
| **Search Engine** | Elasticsearch 8.13 | High-performance document store for full-text queries. |
| **Kafka UI** | Redpanda Console (Kowl) | Web GUI to view topics, messages, offsets, and consumer groups. |
| **Analytics UI** | Kibana 8.13 | Visual interface for index management and Elasticsearch querying. |

---

## 4. Directory & File Tree

```text
todo-cdc-platform/
├── backend/
│   ├── Dockerfile                  # Node.js production container image
│   ├── package.json                # Express, pg, elasticsearch SDK
│   └── src/
│       └── server.js               # Write endpoints (PG) & Search endpoints (ES)
├── frontend/
│   ├── Dockerfile                  # Multi-stage build (Node build -> Nginx Alpine)
│   ├── nginx.conf                  # Reverse proxy proxying /api/ to backend
│   ├── package.json                # React dependencies
│   ├── public/
│   │   └── index.html              # Base HTML template
│   └── src/
│       ├── App.js                  # React UI with Live CDC Pipeline Visualizer
│       └── index.js                # React DOM entrypoint
├── consumer/
│   ├── Dockerfile                  # Lightweight Node worker container
│   ├── package.json                # kafkajs, @elastic/elasticsearch
│   └── src/
│       └── consumer.js             # Event transformer & Elasticsearch indexer
├── postgres-init/
│   └── 01-init.sql                 # Table schema + REPLICA IDENTITY FULL
├── debezium/
│   └── register-postgres.json      # Debezium Postgres connector JSON config
├── k8s/                            # Kubernetes Deployment Manifests
│   ├── 00-namespace.yaml           # Dedicated namespace manifest
│   ├── 01-postgres.yaml            # StatefulSet and Service for PostgreSQL
│   ├── 02-backend.yaml             # Backend Deployment and Service
│   ├── 03-consumer.yaml            # Consumer Deployment
│   └── 04-frontend.yaml            # Frontend Deployment and NodePort Service
├── docker-compose.yml              # Complete 10-container local orchestration
├── register-connector.sh           # Automated healthcheck + registration script
└── README.md                       # Documentation & operations guide

```

---

## 5. End-to-End Data Lifecycle

1. **User Action:** User creates a task via the React UI (`POST /api/todos`).
2. **Postgres Write:** Node.js executes `INSERT INTO todos (...) RETURNING *` in PostgreSQL.
3. **WAL Record:** PostgreSQL commits the transaction to its Write-Ahead Log.
4. **CDC Capture:** Debezium detects the WAL commit and transforms the row data into a JSON event:
```json
{
  "op": "c",
  "before": null,
  "after": {
    "id": 1,
    "title": "Deploy to K8s",
    "description": "Configure Helm charts",
    "completed": false,
    "created_at": "2026-08-19T00:00:00Z"
  }
}

```


5. **Kafka Publish:** The event is written to Kafka topic `postgres.public.todos`.
6. **Consumer Index:** The Node.js worker consumes the message and performs an upsert into Elasticsearch index `todos` (`_id = 1`).
7. **UI Query:** The React app queries `GET /api/todos/search?q=Deploy` which searches Elasticsearch directly.

---

## 6. Step-by-Step Local Deployment (Docker)

### Step 1: Start All Services

From the root directory, launch the entire multi-container environment:

```bash
docker-compose up --build -d

```

Verify that all 10 containers are running:

```bash
docker-compose ps

```

### Step 2: Register Debezium Connector

Wait ~15-20 seconds for the Kafka Connect engine to initialize, then run:

```bash
chmod +x register-connector.sh
./register-connector.sh

```

To verify the connector status manually:

```bash
curl -s http://localhost:8083/connectors/postgres-connector/status

```

*Expected output:* Both `connector` and `tasks[0]` will report `"state": "RUNNING"`.

---

## 7. Observability & Web Dashboards

| Service | Access URL | Features |
| --- | --- | --- |
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) | Live interactive UI with animated CDC pipeline visualizer. |
| **Redpanda Console (Kowl)** | [http://localhost:8080](http://localhost:8080) | Inspect topics (`postgres.public.todos`), consumer lag, and raw payloads. |
| **Kibana UI** | [http://localhost:5601](http://localhost:5601) | Elasticsearch dashboarding, Data Views, and Dev Tools (`GET todos/_search`). |
| **Debezium REST API** | [http://localhost:8083/connectors](http://localhost:8083/connectors) | Connector health, task statuses, and configuration parameters. |
| **Elasticsearch API** | [http://localhost:9200/todos/_search](http://localhost:9200/todos/_search) | Direct REST access to raw search documents. |

---

## 8. Production DevOps Best Practices

When migrating this stack from local Docker Compose to an enterprise Kubernetes or cloud setup:

1. **Schema Registry & Serialization:** Replace raw JSON with **Apache Avro** or **Protobuf** using a Schema Registry (Confluent/Apicurio) to enforce strict schema governance and versioning.
2. **High Availability:**
* **Kafka:** Deploy minimum 3 brokers with `min.insync.replicas=2` and topic replication factor 3. Migrate from ZooKeeper to KRaft.
* **Elasticsearch:** Deploy 3 master-eligible nodes and dedicated data nodes with replica indices $\ge 1$.
* **PostgreSQL:** Use HA solutions such as Patroni or AWS RDS Multi-AZ.


3. **Dead Letter Queues (DLQ):** Route corrupted or unparseable messages to a dedicated DLQ topic (`postgres.public.todos.dlq`) instead of halting the consumer group.
4. **Security & Secrets:**
* Enable mTLS/SASL authentication across Kafka, PostgreSQL, and Elasticsearch.
* Store credentials in Kubernetes Secrets or external secret managers (HashiCorp Vault, AWS Secrets Manager).



---

## 9. Troubleshooting & Common Pitfalls

| Issue | Root Cause | Resolution |
| --- | --- | --- |
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | A local PostgreSQL service is already bound to host port 5432. | The `docker-compose.yml` maps PostgreSQL to host port `5433:5432`. |
| `Bind for 0.0.0.0:9200 failed: port is already allocated` | A local Elasticsearch/OpenSearch instance is running on port 9200. | Change host mapping to `9201:9200` in `docker-compose.yml` or stop the host service. |
| Debezium returns `404 Not Found` for connector status | Connect container is still completing initialization. | Wait 15 seconds and re-run `./register-connector.sh`. |
| Tasks added in UI do not appear in search | Consumer crashed or Debezium connector stopped. | Check logs via `docker-compose logs -f consumer` and inspect topic messages in Kowl at `http://localhost:8080`. |

---

## 10. Kubernetes (K8s) Migration Guide

All production Kubernetes manifests are located in the `k8s/` directory.

### Deploying to Kubernetes:

```bash
# 1. Create the dedicated namespace
kubectl apply -f k8s/00-namespace.yaml

# 2. Apply StatefulSets, Deployments, and Services
kubectl apply -f k8s/

# 3. Monitor rollout status
kubectl get pods,svc -n cdc-todo-app -w

```

```

```

....................................................................................................
 BELOW IS K8S PART 
.................................................................................................


# Real-Time Event-Driven CDC & CQRS Platform with GitOps (Flux CD & Kubernetes)

This repository contains an end-to-end event-driven Change Data Capture (CDC) and Command Query Responsibility Segregation (CQRS) pipeline deployed entirely via **GitOps (Flux CD v2)** on **Kubernetes (K3s/Colima)**, monitored with **Prometheus, Grafana, Alertmanager**, and integrated with **Slack incident alerting**.

---

## 1. Architecture & System Design

```text
[ React Frontend ] (Port 3000)
       │
       ▼
[ Node/Express Backend ] (Port 5000)
       │
       ▼
[ PostgreSQL 15 ] (wal_level=logical)
       │
       ▼ (WAL Replication via pgoutput)
[ Debezium Connect ] (Port 8083)
       │
       ▼ (CDC Stream: postgres.public.todos)
[ Apache Kafka & ZooKeeper ] (Port 9092) ──► [ Redpanda Console / Kowl ] (Port 8080)
       │
       ▼
[ Node Consumer Service ]
       │
       ▼ (Sync CQRS Read Model)
[ Elasticsearch ] (Port 9200) ──► [ Kibana ] (Port 5601)
       │
═════════════════════════════════════════════════════════════════════════════
                       OBSERVABILITY & MONITORING LAYER
═════════════════════════════════════════════════════════════════════════════
  [ Postgres Exporter ]      [ Kafka Exporter ]      [ ES Exporter ]      [ Blackbox Exporter ]
             │                       │                      │                     │
             └───────────────────────┴──────────┬───────────┴─────────────────────┘
                                                ▼
                                    [ Prometheus Server ]
                                                │
                                ┌───────────────┴───────────────┐
                                ▼                               ▼
                        [ Alertmanager ]                [ Grafana 10 ]
                                │                       (Port 3001)
                                ▼
                       [ Slack Notifications ]
                        (#all-devops-alerts)

```

---

## 2. Core Components & Tech Stack

* **Primary Database (Write Model):** PostgreSQL 15 (configured with `wal_level=logical` and `REPLICA IDENTITY FULL`).
* **Change Data Capture (CDC):** Debezium Connect (captures row-level database WAL changes and streams JSON events to Kafka).
* **Message Broker:** Apache Kafka 7.6.0 & ZooKeeper.
* **Search / Read Model (CQRS):** Elasticsearch 8.13.1 (stores denormalized read-optimized todo documents).
* **Consumer Service:** Custom Node.js microservice syncing Kafka CDC events directly to Elasticsearch.
* **Web UI & API:** React Frontend & Node.js/Express Backend.
* **Observability Stack:**
* **kube-prometheus-stack:** Prometheus Operator, Prometheus Server, Grafana, Alertmanager.
* **Metric Exporters:** `prometheus-kafka-exporter`, `postgres-exporter`, `elasticsearch-exporter`, `blackbox-exporter`.
* **Alert Routing:** Automated Slack notifications for high Kafka consumer lag thresholds (`lag >= 5000`).


* **GitOps Engine:** Flux CD v2 syncing declarative Helm Charts and Kubernetes manifests automatically from GitHub.

---

## 3. GitOps Repository Layout

```text
todo-gitops/
├── apps/
│   ├── kustomization.yaml              # Root App Kustomization entrypoint
│   ├── base/
│   │   ├── 00-namespace.yaml           # cdc-todo-app Namespace
│   │   ├── helm-release-app.yaml       # Flux HelmRelease for custom app
│   │   └── cdc-platform/               # Custom Application Helm Chart
│   │       ├── Chart.yaml
│   │       ├── values.yaml
│   │       └── templates/
│   │           ├── 01-configmaps.yaml  # DB Init Scripts & Configs
│   │           ├── 02-data-layer.yaml  # StatefulSets: Postgres, Kafka, ZK, ES, Debezium
│   │           └── 03-apps.yaml        # Deployments: Backend, Consumer, Frontend, Kowl
│   └── monitoring/
│       ├── helm-repositories.yaml      # Flux HelmRepository sources (Prometheus/Grafana)
│       └── helm-release-monitoring.yaml# kube-prometheus-stack + Kafka Exporter HelmReleases
└── clusters/
    └── staging/
        ├── flux-system/                # Flux CD core controllers & sync manifests
        └── apps.yaml                   # Root Cluster Kustomization targeting ./apps

```

---

## 4. Key Troubleshooting & Fixes Implemented

**1. Kafka CrashLoopBackOff (`port is deprecated`)**

* **Root Cause:** Kubernetes automatically injected a cluster environment variable `KAFKA_PORT=tcp://<IP>:9092` into pods because a service was named `kafka`. Confluent Kafka treated this as a legacy port flag and terminated.
* **Resolution:** Configured `enableServiceLinks: false` under the `kafka` pod template spec, and explicitly defined `KAFKA_LISTENERS` and `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP`.

**2. GitOps Chart Parsing Error in Flux Kustomize**

* **Root Cause:** Flux's Kustomize controller attempted to parse `Chart.yaml` as a standard Kubernetes YAML object.
* **Resolution:** Added an explicit `apps/kustomization.yaml` containing only the specific `HelmRelease` and `HelmRepository` manifests, excluding raw Helm chart files from direct Kustomize parsing.

**3. Namespace Dependency Timing**

* **Root Cause:** `HelmRelease` CRDs failed because the destination namespace `cdc-todo-app` was missing prior to installation.
* **Resolution:** Created `apps/base/00-namespace.yaml` and loaded it first in the Kustomize resource chain.

**4. GitHub Secret Scanning Push Protection**

* **Root Cause:** Push blocked due to an exposed Slack Incoming Webhook URL in `alertmanager.yml`.
* **Resolution:** Masked webhook endpoints in version control and configured GitOps release secrets safely.

---

## 5. Local Setup & Bootstrap Guide

### Step 1: Start Local Kubernetes Engine (Colima)

```bash
# Start Colima with Kubernetes enabled
colima start --cpu 4 --memory 8 --kubernetes

# Verify cluster node status
kubectl get nodes

```

### Step 2: Bootstrap Flux CD

```bash
export GITHUB_TOKEN="<YOUR_GITHUB_PAT>"

flux bootstrap github \
  --owner=Raju7061 \
  --repository=todo-gitops \
  --branch=main \
  --path=clusters/staging \
  --personal

```

### Step 3: Trigger Reconcile & Verify Pods

```bash
# Force immediate sync
flux reconcile source git flux-system
flux reconcile kustomization apps-sync --with-source

# Verify that all pods reach Running status
kubectl get pods -n cdc-todo-app -w

```

---

## 6. Registering the Debezium Postgres CDC Connector

Once the `debezium` pod is `Running`, register the PostgreSQL connector:


run below command inside debezium pod 

```bash
curl -i -X POST http://localhost:8083/connectors/ \
  -H "Accept:application/json" \
  -H "Content-Type:application/json" \
  -d '{
    "name": "postgres-connector",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "tasks.max": "1",
      "plugin.name": "pgoutput",
      "database.hostname": "postgres",
      "database.port": "5432",
      "database.user": "postgres",
      "database.password": "postgres",
      "database.dbname": "tododb",
      "database.server.name": "postgres",
      "topic.prefix": "postgres",
      "table.include.list": "public.todos",
      "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
      "schema.history.internal.kafka.topic": "schema-changes.todos"
    }
  }'

```

Verify connector state:

```bash
kubectl exec -it deployment/debezium -n cdc-todo-app -- curl -s http://localhost:8083/connectors/postgres-connector/status

```

---

## 7. Accessing Application & Monitoring UIs

Open terminal sessions to port-forward the services:

```bash
# Frontend Web UI
kubectl port-forward svc/frontend 3000:80 -n cdc-todo-app &

# Redpanda Console / Kafka UI
kubectl port-forward svc/kowl 8080:8080 -n cdc-todo-app &

# Grafana Dashboards
kubectl port-forward svc/kube-prometheus-stack-grafana 3001:80 -n cdc-todo-app &

# Prometheus
kubectl port-forward svc/prometheus-kube-prometheus-stack-prometheus 9090:9090 -n cdc-todo-app &

# Alertmanager
kubectl port-forward svc/kube-prometheus-stack-alertmanager 9093:9093 -n cdc-todo-app &

```

| Application / Tool | URL | Credentials | Purpose |
| --- | --- | --- | --- |
| **Frontend UI** | `http://localhost:3000` | *None* | Todo app CRUD operations |
| **Redpanda Console** | `http://localhost:8080` | *None* | View Kafka topics & CDC event payloads |
| **Grafana** | `http://localhost:3001` | `admin` / *(retrieved via secret)* | Visualize consumer lag & cluster health |
| **Prometheus** | `http://localhost:9090` | *None* | Query PromQL metrics & check active alert rules |
| **Alertmanager** | `http://localhost:9093` | *None* | Manage alert silences & inspect Slack routing |

---

## 8. Managing Local Machine Resource Consumption

Running 15+ workloads locally inside a Linux VM consumes noticeable CPU and memory. Use these controls when developing locally:

* **Stop Cluster:** Run `colima stop` when finished testing to free up CPU and battery.
* **Scrape Intervals:** Set Prometheus scrape intervals to `30s` or `60s` instead of `5s` to reduce continuous CPU evaluation cycles.
* **Java Heap Size:** Keep `ES_JAVA_OPTS="-Xms256m -Xmx256m"` and `KAFKA_HEAP_OPTS="-Xms256m -Xmx256m"` configured for local lightweight execution.