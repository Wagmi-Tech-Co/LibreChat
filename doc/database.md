# LibreChat & RAG API Database Documentation

## Overview

LibreChat uses MongoDB to store conversations and messages, and PostgreSQL (with pgvector extension) to store vector embeddings for Retrieval-Augmented Generation RAG API.

## MongoDB Schema

### conversations

* **\_id** (ObjectId): MongoDB internal ID.
* **conversationId** (string): Unique conversation identifier.
* **user** (string): Reference to the user who owns the conversation.
* **createdAt** (ISODate): Timestamp when conversation was created.
* **updatedAt** (ISODate): Timestamp when conversation was last updated.
* **endpoint** (string): LLM endpoint used (e.g., openAI, google, agents).
* **endpointType** (string, optional): Subtype of endpoint, such as custom configurations.
* **model** (string, optional): Model name or version.
* **isArchived** (boolean): Whether the conversation is archived.
* **resendFiles** (boolean): Flag to resend file attachments.
* **files** (array of IDs): Attached file references.
* **messages** (array of ObjectId): References to messages documents.
* **title** (string): Conversation title.
* **tags** (array of strings): User-defined tags.
* **Additional fields**: \_meiliIndex (boolean), expiredAt (ISODate), \_\_v (number), greeting (string), iconURL (string), temperature (number), agent\_id (string).

### messages

* **\_id** (ObjectId): MongoDB internal ID.
* **messageId** (string): Unique message identifier.
* **conversationId** (string): Back-reference to conversation.
* **isCreatedByUser** (boolean): Whether message was sent by user.
* **sender** (string): Sender name.
* **parentMessageId** (string): Reference to parent message.
* **text** (string): Message content.
* **attachments** (array, optional): File attachments metadata.
* **content** (array, optional): Structured content for agent responses.
* **createdAt** (ISODate): Timestamp when message was created.
* **updatedAt** (ISODate): Timestamp when message was last updated.
* **endpoint** (string): Endpoint used.
* **model** (string, optional): Model name.
* **error** (boolean): Whether message processing resulted in error.
* **tokenCount** (number): Token usage.
* **unfinished** (boolean): Whether response was truncated.
* **Additional fields**: \_meiliIndex (boolean), expiredAt (ISODate), \_\_v (number).

## PostgreSQL Schema (RAG Vector Store)

### pg\_collection

* **uuid** (UUID, PRIMARY KEY): Unique identifier for the collection.
* **name** (text): Collection name.
* **cmetadata** (JSONB, optional): Collection metadata.

### pg\_embedding

* **uuid** (UUID, PRIMARY KEY): Unique identifier for the embedding.
* **collection\_id** (UUID, FOREIGN KEY → pg\_collection.uuid): Parent collection reference.
* **document** (text): Original document or text snippet.
* **embedding** (vector): Vector embedding representation.
* **cmetadata** (JSONB, optional): Embedding metadata.
* **custom\_id** (UUID, optional): User-supplied identifier.

## Entity Relationships

* One conversation has many messages (MongoDB).
* One collection has many embeddings (PostgreSQL).

## Sample Queries

### MongoDB

```js
// Fetch a conversation and its messages
const conv = db.conversations.findOne({ conversationId: '...' });
const msgs = db.messages.find({ _id: { $in: conv.messages } }).sort({ createdAt: 1 });
```

### PostgreSQL with pgvector

```sql
-- Insert a new collection
INSERT INTO pg_collection (uuid, name) VALUES ('...', 'my_collection');

-- Add an embedding
INSERT INTO pg_embedding (uuid, collection_id, document, embedding)
VALUES ('...', '...', 'Some text', '[0.1, 0.2, ...]');

-- Search nearest neighbors
SELECT *, embedding <-> '[0.1, 0.2, ...]' AS distance
FROM pg_embedding
WHERE collection_id = '...'
ORDER BY distance
LIMIT 5;
```

