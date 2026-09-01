from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from pymongo.server_api import ServerApi

uri = "mongodb+srv://sakshu1807_db_user:la7ksVABU1H0cxJz@blackcoffeecluster.7hefs0v.mongodb.net/?appName=BlackCoffeeCluster"

client = MongoClient(uri, server_api=ServerApi('1'))

users_db: Database = client.users_db

profiles_collections: Collection = users_db.user_profiles

user_chat_collections: Collection = users_db.chats_db

