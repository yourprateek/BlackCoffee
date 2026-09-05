from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from motor.motor_asyncio import AsyncIOMotorClient

uri = "mongodb+srv://sakshu1807_db_user:la7ksVABU1H0cxJz@blackcoffeecluster.7hefs0v.mongodb.net/?appName=BlackCoffeeCluster"

client = AsyncIOMotorClient(uri)

users_db: Database = client.users_database

profiles_collections: Collection = users_db.user_profiles

user_chat_collections: Collection = users_db.chats_collections

user_docs_collection: Collection = users_db.docs_collections

recruiters_db: Database = client.recruiter_database

company_profile_collections: Collection = recruiters_db.cm_profiles
