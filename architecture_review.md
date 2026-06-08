# QueueFlow — Architecture Review

## What You Built

A production-grade queue management backend. Not a toy project. Real patterns used in real systems.

---

## The Big Picture — Infrastructure Layer

```
                        ┌─────────────────────────────┐
                        │        Docker Network        │
                        │                             │
  Client (Postman/      │  ┌──────────────────────┐   │
  Browser/Phone)  ────────▶│   FastAPI App (:8000) │   │
                        │  └──────────┬───────────┘   │
                        │             │                │
                        │    ┌────────┴────────┐       │
                        │    │                 │       │
                        │  ┌─▼──────────┐ ┌───▼────┐  │
                        │  │ PostgreSQL  │ │ Redis  │  │
                        │  │   (:5432)  │ │ (:6379)│  │
                        │  └────────────┘ └────────┘  │
                        └─────────────────────────────┘
```

Three containers, one Docker network. They talk to each other by service name (`db`, `redis`), not IP addresses.

---

## The Application Layer — How Code is Organized

Every feature follows the exact same 5-layer pattern:

```
HTTP Request
     ↓
┌─────────────┐
│   Router    │  Thin. Only receives request, calls service, returns response.
└──────┬──────┘
       ↓
┌─────────────┐
│   Service   │  Business logic. Validates rules. Orchestrates operations.
└──────┬──────┘
       ↓
┌─────────────┐
│ Repository  │  Database operations only. No business logic here.
└──────┬──────┘
       ↓
┌─────────────┐
│    Model    │  Defines the table schema. SQLAlchemy ORM.
└──────┬──────┘
       ↓
┌─────────────┐
│  PostgreSQL │  Actual data storage.
└─────────────┘
```

**Why this separation matters:** If tomorrow you switch from PostgreSQL to MongoDB, you only change the Repository layer. The Router and Service layers don't care.

---

## Your Endpoints — Complete API Surface

### Auth (`/auth`)
| Method | Endpoint | Auth Required | Rate Limited | What it does |
|--------|----------|:---:|:---:|---|
| POST | `/auth/register` | ❌ | ❌ | Create new user |
| POST | `/auth/login` | ❌ | ✅ (5/min) | Get JWT token |
| GET | `/auth/me` | ✅ | ❌ | Get logged-in user |

### Queues (`/queues`)
| Method | Endpoint | Auth Required | Role | What it does |
|--------|----------|:---:|:---:|---|
| POST | `/queues` | ✅ | Admin | Create a queue |
| GET | `/queues` | ❌ | Any | List all queues |
| GET | `/queues/{id}` | ❌ | Any | Get one queue |
| PATCH | `/queues/{id}` | ✅ | Admin | Update a queue |
| DELETE | `/queues/{id}` | ✅ | Admin | Delete a queue |
| POST | `/queues/{id}/join` | ✅ | Customer | Join a queue |
| POST | `/queues/{id}/leave` | ✅ | Customer | Leave a queue |
| POST | `/queues/{id}/advance` | ✅ | Admin | Call next person |
| WS | `/queues/{id}/ws` | ❌ | Any | Real-time updates |

---

## Two Critical Request Flows — Trace Them

### Flow 1: A Patient Joins a Queue

```
POST /queues/{id}/join
         ↓
[Router] join_queue()
         ↓ Depends(get_current_user)
[Dependency] Decodes JWT → fetches User from DB
         ↓
[Service] join_queue()
   1. Does the queue exist? → 404 if not
   2. Is the queue active? → 400 if paused/disabled
   3. Is user already waiting? → 409 if yes
   4. What's the max token? → SELECT MAX(token_number)
   5. Is queue at capacity? → 409 if full
   6. Create QueueEntry (token = max + 1, status = waiting)
         ↓
[Repository] create_entry() → INSERT into queue_entries
         ↓
[Response] QueueEntryResponse (201 Created)
```

### Flow 2: Admin Calls Next Person

```
POST /queues/{id}/advance
         ↓
[Dependency] get_current_user → validates JWT
         ↓
[Service] advance_queue()
   1. Is user admin? → 403 if not
   2. Find currently serving → UPDATE status = "completed"
   3. Find next waiting (ORDER BY token ASC LIMIT 1)
   4. UPDATE that entry status = "serving"
   5. UPDATE queue.current_token = next_person.token_number
   6. Broadcast to WebSocket → all phones update instantly
         ↓
[Response] Updated QueueEntry
```

---

## Security Architecture

```
Every sensitive request:

Token in Header: "Authorization: Bearer eyJ..."
         ↓
get_current_user dependency
         ↓
decode_access_token() → JWT verified with SECRET_KEY
         ↓
Payload: { "sub": "user-uuid", "role": "admin" }
         ↓
Fetch User from DB by UUID
         ↓
User object injected into route handler
```

**Three layers of security you built:**
1. **Authentication** — JWT proves who you are
2. **Authorization** — Role check (`admin` vs `customer`) controls what you can do
3. **Rate Limiting** — Redis blocks brute force attacks on login

---

## Database Schema — The Tables and Their Relationships

```
users
├── id (UUID PK)
├── full_name
├── phone_number (UNIQUE)
├── hashed_password
├── role (admin | customer)
├── is_active
├── created_at
└── updated_at

queues
├── id (UUID PK)
├── name
├── description
├── status (active | paused | disabled)
├── current_token        ← what's showing on the TV screen
├── last_reset_date
├── max_capacity
├── created_by (FK → users.id)
├── created_at
└── updated_at

queue_entries
├── id (UUID PK)
├── queue_id (FK → queues.id)   ← which queue
├── user_id (FK → users.id)     ← which person
├── token_number                ← their position
├── status (waiting | serving | completed | skipped | left)
├── created_at
└── updated_at
```

---

## Real-Time Architecture (WebSocket)

```
Phone 1  ──────────────────────┐
Phone 2  ──────────────────────┤──▶ ConnectionManager (in memory)
Phone 50 ──────────────────────┘         │
                                          │  Dict: queue_id → [ws1, ws2, ws50]
                                          │
Admin clicks "Next" ──▶ advance_queue() ──┘
                              │
                    manager.broadcast_to_queue()
                              │
                    ┌─────────┴──────────┐
                    ▼         ▼          ▼
                  Phone1   Phone2     Phone50
               {current_token: 7}  (instant)
```

> **Note:** This works for one server. If you had multiple servers, each would have its own `ConnectionManager` in memory. To scale, you'd replace this with **Redis Pub/Sub** — a message bus that all servers listen to. That's the next level.

---

## Migration Strategy — Alembic

```
Old way (create_all):           New way (Alembic):
App starts                      Developer changes model
    ↓                               ↓
create_all runs             alembic revision --autogenerate
    ↓                               ↓
Tables created (if missing)   Migration file generated
    ↓                               ↓
Can NEVER modify existing    alembic upgrade head
tables!                             ↓
                            Precise SQL applied
                            (with rollback support)
```

---

## What You Learned Building This

| Concept | Where You Used It |
|---|---|
| Layered Architecture | Models → Repos → Services → Routers |
| Async/Await | Every DB and Redis operation |
| JWT Authentication | `get_current_user` dependency |
| Role-based Authorization | Admin checks in queue service |
| UUID Primary Keys | All 3 tables |
| Foreign Keys | `created_by`, `queue_id`, `user_id` |
| Pydantic Validation | All schemas (input/output) |
| Database Migrations | Alembic |
| Atomic Operations | Redis `INCR` for rate limiting |
| WebSockets | Real-time token broadcasting |
| Docker Networking | 3 containers, 1 network |
| Connection Pooling | SQLAlchemy engine, Redis client |
| Race Conditions | Why INCR beats check-then-set |

---

## What's Missing for Production

These are the honest gaps between what you built and a fully production-ready system:

| Gap | What it means |
|---|---|
| No HTTPS | All traffic is unencrypted (needs Nginx + SSL) |
| No refresh tokens | JWT expires, user must re-login every 30 min |
| Single server WebSocket | Can't scale horizontally without Redis Pub/Sub |
| No input sanitization beyond Pydantic | SQL injection is handled by ORM, but extra layer helps |
| No logging framework | `print()` instead of structured logs |
| No monitoring | No Prometheus/Grafana metrics |
| Secrets in `.env` file | Production needs a secrets manager (Vault, AWS Secrets) |

These aren't failures — they're the next chapters.
