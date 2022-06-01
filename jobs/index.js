const agendaInstance = require("../lib/agenda");
const TweetSchema = require("../models/Tweet.schema");
const Logger = require("./logger");
const { fetchTweetAst } = require("static-tweets");

module.exports = async () => {
  agendaInstance.define("refetch-null-asts", async () => {

    console.log("\n### AST_REFETCH job started ###");

    const nullAsts = await TweetSchema.find({ tweet_ast: { $eq: null } });

    const TOTAL_NULL = nullAsts.length();
    let TOTAL_FETCHED = 0;
    let TOTAL_FAILED = 0;

    for (const tweet of nullAsts) {
      let tweetAst = await fetchTweetAst(tweet.tweet_id);

      if (tweetAst) {
        tweetAst && (tweet.tweet_ast = tweetAst);
        await tweet.save();
        TOTAL_FETCHED++
        Logger.log(`[AST_REFETCH] id: ${tweet.tweet_id} fetched successfully`);
      } else {
        TOTAL_FAILED++
        Logger.log(`[AST_REFETCH] id: ${tweet.tweet_id} fetch failed`);
      }
    }

    console.log("\n---### AST_REFETCH job summary ###---");
    
    Logger.log("total_null_asts", TOTAL_NULL);
    Logger.log("total_succesfully_fetched", TOTAL_FETCHED);
    Logger.log("total_failed", TOTAL_FAILED);
  });

  await agendaInstance.start();

  await agendaInstance.every("30 minutes", "refetch-null-asts");
};
