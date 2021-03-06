const {
  getCategoriesFromRoles,
  parseJobType,
  parseURLs,
  normalizeURLs,
  parseEmails,
  parseRoles,
  parseLocation,
  parseAdtFilters,
} = require("./parser");
const { fetchTweetAst } = require("static-tweets");
const Tweet = require("../models/Tweet.schema");
const Meta = require("../models/Meta.schema");

const Logger = require("./logger");

const verifyTweet = require("./verifyTweet");
const fetchSearchResults = require("./twitter");
const fs = require("fs");

const isValid = (tweet) => {
  const followers = tweet.user.followers_count;
  // const accountAge = Date.now() - new Date(status.created_at).getTime();
  // return (followers > 30 && accountAge > 1000 * 60 * 60 * 24 * 30) || followers > 200;
  return !tweet.in_reply_to_status_id && followers > 50;
};

const isValid2 = (tweet) => {
  if (tweet.roles.length == 0) {
    return false;
  }
  const r = verifyTweet(tweet);

  if (r == -1) {
    return false;
  }
  tweet.need_manual_verification = r == 0 ? "true" : "false";

  if (tweet.need_manual_verification === "true") return false; // remove this line to store need_manual_verification:true tweets

  return true;
};

const hasTweetAST = (tweet) => Boolean(tweet.value.tweet_ast);

const buildTweetObject = (tweet) => {
  const text = tweet.full_text || tweet.text;

  const roles = parseRoles(text);
  const categories = getCategoriesFromRoles(roles);
  const emails = parseEmails(text);
  const type = parseJobType(text);
  const urls = parseURLs(text);
  const location = parseLocation(text);

  const obj = {
    type: type,
    categories: categories,
    roles: roles,
    email: emails,
    text: text,
    urls: urls,
    additionalFilters: parseAdtFilters(text),
    location: location,
    created_by: tweet.user.name,
    created_on: new Date(tweet.created_at).getTime(),

    tweet_id: tweet.id_str,
    tweet_url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
    author_id: tweet.user.id_str,
    likes: tweet.favorite_count,
    retweets: tweet.retweet_count,
    author_followers: tweet.user.followers_count,
  };

  return obj;
};

const buildTweetObject2 = async (tweet) => {
  const urls = await normalizeURLs(tweet.urls);
  let tweetAst = await fetchTweetAst(tweet.tweet_id);

  let retries = 0;

  while (retries < 6 && !tweetAst) {
    console.log(`TWEET_AST retrying: ${retries}`);
    tweetAst = await fetchTweetAst(tweet.tweet_id);
    retries++;
  }

  if (!tweetAst) {
    console.log(`TWEET_AST_NULL for tweet: ${tweet.tweet_id}`);
  }

  return {
    ...tweet,
    urls: urls,
    tweet_ast: tweetAst,
  };
};

const getSinceId = () => {
  return Meta.findOne({})
    .then((doc) => doc.sinceId)
    .catch(() => {
      console.error(
        'Failed!\nPlease make a "meta" collection and then create a "sinceId" placeholder in the DB in meta collection and init with 0'
      );
      process.exit(0);
    });
};

const fetchTweets = async () => {
  const newestID = await getSinceId();
  const apiRes = await fetchSearchResults(newestID); // get tweets from the Twitter API

  // console.log("Tweets fetched: ", apiRes.statuses.length);

  // The buildTweetObject process is split into two phases, the first one does only the parsing, the second one fetches tweet AST and normalizes t.co URLs to where they redirect. Doing this is a huge performmance boost.
  let tweets = await Promise.allSettled(
    apiRes.statuses
      .filter(isValid)
      .map(buildTweetObject)
      .filter(isValid2)
      .map(buildTweetObject2)
  );

  // Discard any tweets that fail the `buildTweetObject2` process, without throwing any error
  tweets = tweets.filter((result) => result.status == "fulfilled")
  tweets = tweets.map((result) => result.value);

  // let tweets = await Promise.all(
  //   apiRes.statuses
  //     .filter(isValid)
  //     .map(buildTweetObject)
  //     .filter(isValid2)
  //     .map(buildTweetObject2)
  // );

  const tweetsWithAst = tweets.filter(hasTweetAST)

  const tweetsFetched = apiRes.statuses.length;
  const tweetsDiscarded = apiRes.statuses.length - tweets.length;
  const nullAstDiscarded = tweets.length - tweetsWithAst.length;
  const maxId = apiRes.search_metadata.max_id;

  console.log("\n### Tweet fetch cycle summary ###");
  Logger.log("api_fetch_count", tweetsFetched);
  Logger.log("filter_discarded_count", tweetsDiscarded);
  Logger.log("null_ast_discarded_count", nullAstDiscarded)

  return { tweets: tweetsWithAst, maxId };
};

const saveTweets = async ({ tweets, maxId }) => {
  const ops = [];

  if (tweets.length == 0) {
    return;
  }
  // This query is ok because the number to tweets to write after all filtering will be fairly low, so the size of query won't get too large even tho we're iterating over all the tweets
  const duplicates = await Tweet.find({
    $or: tweets.map(({ text }) => ({ text })),
  });
  const index = {}; // index `duplicates` for constant time lookups, tho the performance difference would be negligible, it does make the code look nicer

  for (let tweet of duplicates) {
    index[tweet.text] = tweet;
  }
  for (let tweet of tweets) {
    if (index[tweet.text]) {
      ops.push({
        updateOne: {
          filter: { text: tweet.text },
          update: { created_on: tweet.created_on },
        },
      });
    } else {
      ops.push({
        insertOne: { document: tweet },
      });
    }
  }
  Logger.log("db_write_count", tweets.length - duplicates.length);

  await Promise.all([
    Tweet.bulkWrite(ops),
    Meta.updateOne(
      {},
      { sinceId: String(BigInt(maxId) - (BigInt(1000 * 60 * 2) << BigInt(22))) }
    ),
  ]);
};

module.exports.fetchAndSaveTweets = () => fetchTweets().then(saveTweets);
