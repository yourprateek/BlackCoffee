from configurations import profiles_collections
from pymongo.cursor import Cursor
from schema.user_schema import User
from pydantic import EmailStr
from typing import List

def get_all_data() -> List[User]:

    cursor: Cursor = profiles_collections.find({})
    users = list(cursor)

    return users

def get user_data(email: EmailStr) -> User:

    all_users = get_all_data()
    final_user = user for user in users if user['email'] == email

    return final_user
