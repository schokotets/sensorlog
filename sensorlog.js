const Koa = require("koa");
const app = new Koa();
const dayjs = require("dayjs");

const bodyParser = require("koa-bodyparser");
app.use(
  bodyParser({
    enableTypes: ["text"],
  })
);

const serve = require("koa-static");
app.use(serve("./static"));

const sqlite3 = require("sqlite3");
let connected = false;
var db = new sqlite3.Database("./sensordata.sql", (err) => {
  if (err) {
    console.log(err);
  } else {
    connected = true;
  }
});
db.run(
  "CREATE TABLE IF NOT EXISTS sensordata (unixtime INTEGER, id INTEGER, temp REAL, relhum REAL, abshum REAL)"
);

console.log("database tables created");

let lines = [];

app.use(async (ctx) => {
  if (ctx.url == "/log") {
    console.log(ctx.request.body);
    save(ctx.request.body);
    console.log();
    lines.push(ctx.request.body);
  } else if (ctx.url.startsWith("/data")) {
    let mode = ctx.request.query.mode;

    let nhoursQuery = ctx.request.query.nhours;

    let fromDateQuery = ctx.request.query.from;
    let toDateQuery = ctx.request.query.to;

    let fromDate;
    let toDate;

    if (nhoursQuery && mode != "dates")
      fromDate = dayjs().add(-parseInt(nhoursQuery), "hours");
    else if (fromDateQuery) fromDate = dayjs(fromDateQuery);
    else fromDate = dayjs().add(-36, "hours");

    if (toDateQuery) toDate = dayjs(toDateQuery).endOf("day");
    else toDate = dayjs();

    console.log(toDate);
    let dbdata = await getSensorData(
      fromDate.unix() * 1000,
      toDate.unix() * 1000
    );
    console.log("done with db, starting JSON", new Date().toISOString());
    ctx.body = JSON.stringify(dbdata);
    console.log("done with JSON", new Date().toISOString());
  } else {
    ctx.body = "Hello World\n" + lines.join("\n");
  }
});

app.listen(8090);
console.log("app listening on :8090");

function save(str) {
  let lines = str.split("\n");
  data = [];
  for (l of lines) {
    let [pin, th] = l.split(":");
    let [temp, hum] = th.split(";");
    pin = parseInt(pin);
    temp = parseFloat(temp);
    relhum = parseFloat(hum);
    abshum = calAbsHum(temp, relhum);
    data.push({ pin, temp, relhum, abshum });
  }
  if (connected) {
    for (s of data) {
      let time = Date.now();
      let querystring = `INSERT INTO sensordata(unixtime,id,temp,relhum,abshum) VALUES(${time},${s.pin},${s.temp},${s.relhum},${s.abshum})`;
      db.run(querystring);
    }
    console.log(`${new Date().toISOString()} inserted data`);
  }
}

function calAbsHum(temp, hum) {
  let abshum =
    (6.112 * Math.exp((17.67 * temp) / (temp + 243.5)) * hum * 2.1674) /
    (273.15 + temp);
  return Math.round(abshum * 10) / 10;
}

async function getSensorData(from, to) {
  return new Promise((resolve, reject) => {
    let rows = [];
    console.log("getting from db", new Date().toISOString());
    let query = `SELECT * FROM sensordata WHERE unixtime >= ${from} AND unixtime <= ${to}`;
    db.each(
      query,
      (err, row) => {
        if (err) reject(err);
        else rows.push(Object.values(row));
      },
      (err, n) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}
