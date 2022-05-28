// import * as agendajs from "agenda";
const Agenda = require("agenda");

module.exports = () => {
  return new Agenda({ db: { address: process.env.MONGO_URI } });
};
