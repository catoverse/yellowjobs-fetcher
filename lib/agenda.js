// import * as agendajs from "agenda";
const Agenda = require("agenda");

module.exports = new Agenda({ db: { address: process.env.MONGO_URI } });
