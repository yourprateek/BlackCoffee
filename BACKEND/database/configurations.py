from pymongo import MongoClient
from pymongo.server_api import ServerApi

uri = "mongodb+srv://sakshu1807_db_user:la7ksVABU1H0cxJz@blackcoffeecluster.7hefs0v.mongodb.net/?appName=BlackCoffeeCluster"

client = MongoClient(uri, server_api=ServerApi('1'))

user_db = client.users_db
