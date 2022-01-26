const axios = require("axios");
const database = require("./database");

var tag, chatid;

function loadMessagingParams() {
  tag = process.env["BOT_TAG"];
  if (!tag) {
    console.error(
      "missing BOT_TAG environment variable, unable to send messages"
    );
  }
  chatid = process.env["CHAT_ID"];
  if (!chatid) {
    console.error(
      "missing CHAT_ID environment variable, unable to send messages"
    );
  }
}

function sendMessage(contents) {
  if (!tag || !chatid) return;

  contents += "\n\n[Nachschauen](" + process.env["HOST_URL"] + ")";
  console.log("sending message:", contents.replace(/\n/g, "<br>"));

  axios
    .post(
      `https://api.telegram.org/bot${tag}/sendMessage`,
      {},
      {
        params: {
          chat_id: process.env.CHAT_ID,
          text: contents,
          parse_mode: "markdown",
        },
      }
    )
    .catch(console.error);
}

let lastMessage = undefined;
let init = true;

exports.startMessaging = function () {
  loadMessagingParams();
  notifyIfNeeded();
  setInterval(notifyIfNeeded, 180000);
};

async function notifyIfNeeded() {
  console.log("checking if notification is needed");

  let delta = await database.getDelta();
  if (delta == 99999) {
    // invalid measurement
    if (init) {
      // lastMessage is undefined in this case
      sendMessage(
        "Keine Empfehlung möglich, weil mindestens ein Sensor ausgefallen ist."
      );
    } else if (lastMessage) {
      // so it doesn't repeat itself
      sendMessage("mindestens ein Sensor ist ausgefallen");
    }
    lastMessage = undefined;
    init = false;
    return;
  }
  delta = Math.round(delta * 1000) / 1000;

  if (delta < 0.2 && (!lastMessage || lastMessage == "open")) {
    sendMessage(
      "*Fenster schließen*,\ndenn (obere abs. LF) - (äußere abs. LF) = " +
        delta +
        "g/m³ < 0,2 g/m³"
    );
    lastMessage = "close";
  }
  if (delta > 0.6 && (!lastMessage || lastMessage == "close")) {
    sendMessage(
      "*Fenster öffnen*,\ndenn (obere abs. LF) - (äußere abs. LF) = " +
        delta +
        "g/m³ > 0,6 g/m³"
    );
    lastMessage = "open";
  }

  if (
    delta <= 0.6 &&
    delta >= 0.2 &&
    !lastMessage &&
    process.env["INITIAL_MESSAGE"] != "false"
  ) {
    sendMessage(
      "*Fenster: unsicher*,\ndenn (obere abs. LF) - (äußere abs. LF) = " +
        delta +
        "g/m³ liegt zwischen 0,2 g/m³ und 0,6 g/m³"
    );
    lastMessage = "open";
  }

  init = false;
}
