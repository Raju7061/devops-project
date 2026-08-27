const { Kafka } = require('kafkajs');
const { Client } = require('@elastic/elasticsearch');

const kafka = new Kafka({
  clientId: 'todo-sync-consumer',
  brokers: [(process.env.KAFKA_BROKER || 'kafka:9092')],
  retry: {
    initialRetryTime: 1000,
    retries: 20
  }
});

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200'
});

const consumer = kafka.consumer({ groupId: 'es-cdc-group' });

async function initElasticsearch() {
  let retries = 15;
  while (retries > 0) {
    try {
      const exists = await esClient.indices.exists({ index: 'todos' });
      if (!exists) {
        await esClient.indices.create({
          index: 'todos',
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: { type: 'text' },
                description: { type: 'text' },
                completed: { type: 'boolean' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' }
              }
            }
          }
        });
        console.log('Elasticsearch index "todos" created successfully.');
      }
      break;
    } catch (e) {
      console.log('Waiting for Elasticsearch to be ready...', e.message);
      retries--;
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

async function run() {
  await initElasticsearch();
  
  let connected = false;
  while (!connected) {
    try {
      await consumer.connect();
      connected = true;
      console.log('Connected to Kafka.');
    } catch (err) {
      console.log('Waiting for Kafka broker...', err.message);
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  const topicName = process.env.KAFKA_TOPIC || 'postgres.public.todos';
  await consumer.subscribe({ topic: topicName, fromBeginning: true });
  console.log(`Subscribed to topic: ${topicName}`);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;
      try {
        const raw = JSON.parse(message.value.toString());
        const payload = raw.payload ? raw.payload : raw;
        const op = payload.op;
        const after = payload.after;
        const before = payload.before;

        if (op === 'c' || op === 'u' || op === 'r') {
          if (after && after.id) {
            await esClient.index({
              index: 'todos',
              id: after.id.toString(),
              document: {
                id: after.id,
                title: after.title,
                description: after.description,
                completed: after.completed,
                created_at: after.created_at,
                updated_at: after.updated_at
              }
            });
            console.log(`[CDC Sync] Upserted Todo ID: ${after.id} (op: ${op})`);
          }
        } else if (op === 'd') {
          if (before && before.id) {
            await esClient.delete({
              index: 'todos',
              id: before.id.toString()
            }).catch(() => {});
            console.log(`[CDC Sync] Deleted Todo ID: ${before.id}`);
          }
        }
      } catch (err) {
        console.error('Error processing Kafka event:', err.message);
      }
    }
  });
}

run().catch(console.error);
