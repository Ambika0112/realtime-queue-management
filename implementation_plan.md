# Historical Tracking Architectural Design

Before we write a single line of code, let's put on our Senior Backend Architect hats. You've identified a classic database design dilemma for transactional systems: **Should active, high-throughput data live in the same table as cold, historical data?**

To fulfill your requirements (Customer history view, Admin analytics/filtering), we essentially have two structural approaches. 

Here is the tradeoff analysis for QueueFlow v1.

---

## Approach A: The "Single Table" Strategy (Reuse QueueEntry)

In this approach, `QueueEntry` acts as the source of truth for both active waiters and historical records. When someone finishes, we just change their `status` to `COMPLETED` or `LEFT`, and leave the row exactly where it is.

### Pros:
1. **Simplicity (Perfect for v1):** No new tables, no complex data-migration transactions. 
2. **Built-in Timestamps:** We already have `created_at` (join time) and `updated_at` (completion/exit time).
3. **Single Source of Truth:** Querying "All tokens ever issued for Queue X" is a simple `SELECT *`.

### Cons:
1. **Table Bloat:** The table will grow infinitely. If a hospital sees 500 patients a day, `QueueEntry` gets 15,000 rows a month. 
2. **Active Performance Impact:** Critical active queries (like "Find the next person in line") will scan a table where 99% of the rows are historical junk.
3. **Referential Integrity Risks:** If an Admin deletes a `Queue` because a doctor retired, the SQL `CASCADE` delete might wipe out all historical `QueueEntry` records tied to it!

---

## Approach B: The "Archive Table" Strategy (QueueEntry + QueueHistory)

In this approach, `QueueEntry` ONLY holds people whose status is `WAITING` or `SERVING`. The moment a status changes to `COMPLETED`, `SKIPPED`, or `LEFT`, we copy the record into a new `QueueHistory` table and `DELETE` the row from `QueueEntry`.

### Pros:
1. **Blazing Fast Queues:** The `QueueEntry` table remains incredibly small (only the 10-50 people currently in line). Database locks, inserts, and reads on the active queue are lightning fast.
2. **Dedicated Analytics Indexing:** The `QueueHistory` table can be heavily indexed for complex Admin date-based filtering without slowing down the active queue.
3. **Safe Deletions:** If a Queue or User is deleted, the `QueueHistory` table can safely retain the data for legal/auditing purposes by storing the snapshot data.

### Cons:
1. **Transactional Complexity:** Every time someone finishes, we must open a database transaction to `INSERT` into history and `DELETE` from active. If the transaction fails midway, the system breaks.
2. **Overengineering for v1:** Unless we expect tens of thousands of users immediately, modern PostgreSQL can easily query a table with a million rows in milliseconds if properly indexed.

---

## 🏛️ Architect's Recommendation for QueueFlow v1

For Version 1, I strongly recommend **Approach A (The Single Table Strategy)**, but with architectural safeguards.

While "Archive Tables" (Approach B) are necessary for massive enterprise systems, they introduce too much friction for a startup/v1 product. Modern PostgreSQL can comfortably handle a single `QueueEntry` table up to 10-50 million rows without breaking a sweat, **IF we do the following:**

1. **Add Partial Indexes:** We add a B-Tree index on `QueueEntry` specifically for active statuses: 
   `CREATE INDEX idx_active_entries ON queue_entries (queue_id) WHERE status IN ('waiting', 'serving');`
   This ensures that "finding the next person" searches a virtually tiny table of only active users, completely ignoring the historical bloat.
2. **Soft Deletes / Nullable Foreign Keys:** We change `ON DELETE CASCADE` for queues so that if a Queue is deleted, we don't accidentally wipe out the history.

### Open Questions for You:
1. **Do you agree with the Approach A recommendation for v1, or do you have strict compliance/analytics needs that mandate Approach B?**
2. **If an Admin deletes a Queue, should we keep the historical records of the people who waited in it?**
