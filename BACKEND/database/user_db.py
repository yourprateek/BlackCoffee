from configurations import profiles_collections
from schemas.user_schema import User
from pydantic import EmailStr

def get_user_data(email: EmailStr) -> User:

    final_user: User = profiles_collections.find_one({'email': email.lower().strip()})

    if final_user:
        return final_user
    raise ValueError(f"No user exist with email as : {email}")
