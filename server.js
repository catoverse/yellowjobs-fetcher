require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { fetchAndSaveTweets } = require("./lib/fetchTweets");
const agenda = require("./lib/agenda");
const setupJobs = require("./jobs");
const { connect: connectDB } = require("./lib/db");

const app = express();

const PORT = process.env.PORT || 4000;

app.use(morgan(process.env.NODE_ENV == "production" ? "common" : "dev"));
app.use(express.json());

app.options("/volunteer/*", cors());
app.use(cors());

console.log(
  "⚠️Starting ",
  process.env.NODE_ENV == "production" ? "prod" : "staging",
  " Environment"
);

connectDB()
  .then(() => {
    console.log("✅ Database Connected!");

    fetchAndSaveTweets();

    setupJobs()
      .then(() => {})
      .catch((err) => console.error(`Agenda Error: ${err}`));

    const app = new require("express")();
    const Agendash = require("agendash");

    app.use("/", Agendash(agenda));

    if (
      process.env.NODE_ENV === "production" ||
      process.env.NODE_ENV == "staging"
    ) {
      setInterval(async () => {
        console.log("Fetching Tweets...");
        console.time("fetchTweets");

        await fetchAndSaveTweets();

        console.timeEnd("fetchTweets");
        console.log("Done Fetching Tweets!");
      }, 3000);
      setInterval(async () => {
        console.log("Deleting Tweets...");

        await fetchAndSaveTweets();

        console.log("Done Deleting Tweets!");
      }, 3000);
    }

    app.listen(PORT, () => {
      console.log(`Agenda dashboard on http:localhost:${PORT}`);
    });
  })
  .catch(console.error);
