const Koa = require("koa");
const app = new Koa();

const dayjs = require("dayjs");

const bodyParser = require("koa-bodyparser");
app.use(
  bodyParser({
    enableTypes: ["text"],
  })
);

const compress = require("koa-compress");
app.use(
  compress({
    filter() {
      return true;
    },
    threshold: 2048,
    br: false,
  })
);

const serve = require("koa-static");
app.use(serve("./static"));

const database = require("./database");
database.connect();

const messaging = require("./messaging");
messaging.startMessaging();

// WEB
app.use(async (ctx) => {
  if (ctx.url == "/log") {
    console.log(ctx.request.body);
    save(ctx.request.body);
    console.log();
  } else if (ctx.url.startsWith("/lastmeasurement")) {
    let time = await database.getLastMeasurementTime().catch((err) => {
      ctx.body = JSON.stringify(err);
      console.error(err);
      return null;
    });
    if (time == null) {
      ctx.response.status = 500;
      //ctx.body = ""
    } else {
      ctx.body = "hello";
    }
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

    let dbdata = await database.getSensorData(
      fromDate.unix() * 1000,
      toDate.unix() * 1000
    );
    console.log("done with db, starting JSON", new Date().toISOString());
    ctx.body = JSON.stringify(dbdata);
    console.log("done with JSON", new Date().toISOString());
  } else {
    ctx.response.status = 404;
    ctx.body = "404 Not Found";
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
  database.save(data);
}

function calAbsHum(temp, hum) {
  let abshum =
    (6.112 * Math.exp((17.67 * temp) / (temp + 243.5)) * hum * 2.1674) /
    (273.15 + temp);
  return Math.round(abshum * 10) / 10;
}
