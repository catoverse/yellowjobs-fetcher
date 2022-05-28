const agenda = require("../lib/agenda");
const TweetSchema = require("../models/Tweet.schema");
const { fetchTweetAst } = require("static-tweets");

module.exports = async () => {
  const agendaInstance = agenda();

  agendaInstance.define("refetch null asts", async () => {
    const nullAsts = await TweetSchema.find({ tweet_ast: { $eq: null } });

    for (const tweet of nullAsts) {
      let tweetAst = await fetchTweetAst(tweet.tweet_id);
      tweetAst && (tweet.tweet_ast = tweetAst);

      await tweet.save();
    }
  });

  await agenda.start();

  await agenda.every("2 days", "refetch null asts");
};
