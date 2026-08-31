from configurations import profiles_collections
from pymongo.cursor import Cursor
from typing import List

def get_all_data() -> List:

    cursor: Cursor = profiles_collections.find({})
    users = list(cursor)