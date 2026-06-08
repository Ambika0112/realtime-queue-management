import asyncio
from datetime import datetime, timezone, timedelta
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.queue import Queue
from app.models.queue_entry import QueueEntry, EntryStatus
from app.core.security import hash_password

async def seed_data():
    async with AsyncSessionLocal() as db:
        print("Starting database seed...")
        
        # 1. Create Demo Users
        admin_pass = hash_password("password123")
        
        admin_user = User(
            phone_number="1111111111",
            full_name="Admin User",
            hashed_password=admin_pass,
            role=UserRole.admin
        )
        
        operator_user = User(
            phone_number="2222222222",
            full_name="Dr. Sarah Jenkins",
            hashed_password=admin_pass,
            role=UserRole.operator
        )
        
        customer_user = User(
            phone_number="3333333333",
            full_name="John Doe",
            hashed_password=admin_pass,
            role=UserRole.customer
        )
        
        db.add_all([admin_user, operator_user, customer_user])
        await db.commit()
        await db.refresh(admin_user)
        await db.refresh(operator_user)
        await db.refresh(customer_user)
        print("Created Admin, Operator, and Customer accounts.")

        # 2. Create Sample Queues
        cardiology_queue = Queue(
            name="Cardiology Dept",
            description="Dr. Sarah Jenkins - Room 104",
            created_by=admin_user.id,
            max_capacity=50,
            current_token=0,
            status="active"
        )
        
        general_queue = Queue(
            name="General Consulting",
            description="Walk-in consultations",
            created_by=admin_user.id,
            max_capacity=100,
            current_token=5,
            status="active"
        )
        
        pharmacy_queue = Queue(
            name="Pharmacy Pickup",
            description="Prescription collection",
            created_by=admin_user.id,
            max_capacity=200,
            current_token=12,
            status="active"
        )
        
        db.add_all([cardiology_queue, general_queue, pharmacy_queue])
        await db.commit()
        await db.refresh(cardiology_queue)
        print("Created 3 Sample Queues.")

        # 3. Create Historical Queue Data (Analytics Seed)
        now = datetime.now(timezone.utc)
        entries = []
        
        # 5 completed patients from yesterday
        for i in range(1, 6):
            join_time = now - timedelta(days=1, hours=i)
            serve_time = join_time + timedelta(minutes=15)
            resolve_time = serve_time + timedelta(minutes=10)
            
            entry = QueueEntry(
                queue_id=cardiology_queue.id,
                user_id=customer_user.id,
                token_number=i,
                status=EntryStatus.completed,
                created_at=join_time,
                served_at=serve_time,
                resolved_at=resolve_time
            )
            entries.append(entry)
            
        db.add_all(entries)
        await db.commit()
        print("Created Historical Analytics Data.")
        print("Seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
