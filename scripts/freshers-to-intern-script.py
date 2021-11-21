
from pymongo.message import update
import datetime

MONGO_URI = ""


def get_database():
    from pymongo import MongoClient
    import pymongo

    # Provide the mongodb atlas url to connect python to mongodb using pymongo
    CONNECTION_STRING = MONGO_URI

    # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
    from pymongo import MongoClient
    client = MongoClient(CONNECTION_STRING)

    # Create the database for our example (we will use the same database throughout the tutorial
    return client['prod']


def update():
    # Get the database
    dbname = get_database()

    tweetsColl = dbname['tweets']

    query = {"type": "freshers"}
    tweetsColl.update_many({"type": "freshers"}, {
        "$set": {"type": "internship"}})

    tot = tweetsColl.find(query).count()
    print("All ID count:", tot)


update()
