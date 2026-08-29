#!/usr/bin/env python3
"""
MongoDB Connection Diagnostic Script
Tests connectivity and identifies issues
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError, ConnectionFailure
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "")
MONGODB_DB = os.getenv("MONGODB_DB", "reminder_db")

print("=" * 70)
print("MongoDB Connection Diagnostic")
print("=" * 70)

print(f"\n📋 Configuration:")
print(f"  URL: {MONGODB_URL[:50]}..." if len(MONGODB_URL) > 50 else f"  URL: {MONGODB_URL}")
print(f"  Database: {MONGODB_DB}")

async def test_connection():
    """Test MongoDB connection with detailed error handling"""
    
    print(f"\n🔍 Testing connection...")
    
    try:
        # Create client with timeout
        client = AsyncIOMotorClient(
            MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000,
            retryWrites=True,
        )
        
        # Try to connect
        await client.admin.command('ping')
        
        print("✅ CONNECTION SUCCESSFUL!")
        
        # Get database info
        db = client[MONGODB_DB]
        collections = await db.list_collection_names()
        
        print(f"\n📊 Database Info:")
        print(f"  Collections: {collections if collections else 'No collections yet'}")
        
        # Try to query students collection
        student_count = await db.students.count_documents({})
        print(f"  Students: {student_count}")
        
        # Try to query review_items collection
        item_count = await db.review_items.count_documents({})
        print(f"  Review Items: {item_count}")
        
        client.close()
        return True
        
    except ServerSelectionTimeoutError as e:
        print(f"\n❌ CONNECTION TIMEOUT!")
        print(f"  Error: {str(e)}")
        print(f"\n💡 Possible causes:")
        print(f"  1. MongoDB cluster not running or deleted")
        print(f"  2. Your IP is not whitelisted on MongoDB Atlas")
        print(f"  3. Network connectivity issue (firewall/DNS)")
        print(f"  4. Connection string credentials invalid")
        return False
        
    except ConnectionFailure as e:
        print(f"\n❌ CONNECTION FAILED!")
        print(f"  Error: {str(e)}")
        return False
        
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR!")
        print(f"  Type: {type(e).__name__}")
        print(f"  Error: {str(e)}")
        return False

# Run test
if __name__ == "__main__":
    result = asyncio.run(test_connection())
    
    print("\n" + "=" * 70)
    if result:
        print("✅ Database is ready to use!")
        print("=" * 70)
    else:
        print("❌ Database connection failed - Backend will crash on startup")
        print("\n🔧 To fix:")
        print("  1. Log in to https://cloud.mongodb.com")
        print("  2. Check if cluster0 is running (should be 'ACTIVE')")
        print("  3. Go to Network Access → IP Whitelist")
        print("  4. Add your current IP (or use 0.0.0.0/0 for testing)")
        print("  5. Verify credentials in .env match MongoDB Atlas user")
        print("=" * 70)
