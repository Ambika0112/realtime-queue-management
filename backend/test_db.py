import asyncio
import asyncpg

async def main():
    try:
        url = "postgresql://postgres:lylXmWfClxPuBSuxoJmpuvmPkCtgGOrX@acela.proxy.rlwy.net:11416/railway"
        print(f"Connecting to {url}...")
        conn = await asyncpg.connect(url)
        print("Successfully connected!")
        
        # Check tables
        tables = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        print("Tables:", [t['table_name'] for t in tables])
        
        await conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
