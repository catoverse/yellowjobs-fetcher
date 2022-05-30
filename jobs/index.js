const agenda = require("../lib/agenda");
const TweetSchema = require("../models/Tweet.schema");
const { fetchTweetAst } = require("static-tweets");

module.exports = async () => {
  const agendaInstance = agenda();

  agendaInstance.define("refetch-null-asts", async () => {
    const nullAsts = await TweetSchema.find({ tweet_ast: { $eq: null } });

    for (const tweet of nullAsts) {
      let tweetAst = await fetchTweetAst(tweet.tweet_id);

      if (tweetAst) {
        tweetAst && (tweet.tweet_ast = tweetAst);
        await tweet.save();
        console.log(`[AST_REFETCH] id: ${tweet.tweet_id} fetched successfully`);
      } else {
        console.error(`[AST_REFETCH] id: ${tweet.tweet_id} fetch failed`);
      }
    }
  });

  await agendaInstance.start();

  await agendaInstance.every("1 days", "refetch-null-asts");
};
