
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


def deleteBefore(y, m, d):

    # Get the database
    dbname = get_database()

    feedbackColl = dbname['feedback']
    tweetsColl = dbname['tweets']

    id_to_skip = set()
    for i in feedbackColl.find({}):
        id_to_skip.add(i["tweet_id"])

    all_id = set()
    threshold = datetime.datetime(y, m, d)
    print("Threshold date:", threshold)
    for i in tweetsColl.find({"updatedAt": {"$lt": threshold}}):
        all_id.add(i["tweet_id"])

    delete_id = all_id.difference(id_to_skip)

    print("All ID count:", len(all_id))
    print("Skip ID count:", len(id_to_skip))
    print("ID to delete:", len(delete_id))

    arr = list(delete_id)

    print(tweetsColl.delete_many(
        {"tweet_id": {"$in": arr}}).deleted_count)


deleteBefore(2021, 10, 15)
