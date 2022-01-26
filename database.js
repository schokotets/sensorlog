const dayjs = require("dayjs");

const sqlite3 = require("sqlite3");
let connected = false;

var db;

exports.connect = function () {
  db = new sqlite3.Database("./sensordata.sql", (err) => {
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
};

exports.save = function (data) {
  if (connected) {
    for (s of data) {
      let time = Date.now();
      let querystring = `INSERT INTO sensordata(unixtime,id,temp,relhum,abshum) VALUES(${time},${s.pin},${s.temp},${s.relhum},${s.abshum})`;
      db.run(querystring);
    }
    console.log(`${new Date().toISOString()} inserted data`);
  }
};

exports.getSensorData = async function (from, to) {
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
};

exports.getDelta = async function () {
  from = dayjs().add(-30, "minutes").unix() * 1000;

  return new Promise((resolve, reject) => {
    let rows = [];

    let query = `SELECT id, SUM(abshum)/COUNT(abshum) FROM sensordata WHERE unixtime >= ${from} AND abshum <= 1000 GROUP BY id ORDER BY id ASC`;
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
  }).then(function (rows) {
    if (
      !rows ||
      !(0 in rows) ||
      !(1 in rows[0]) ||
      !(1 in rows) ||
      !(1 in rows[1])
    ) {
      return 99999;
    }
    let delta = rows[0][1] - rows[1][1]; // #1 - #2
    return delta;
  });
};

exports.getLastMeasurementTime = async function () {
  return new Promise((resolve, reject) => {
    let rows = [];

    let query = `SELECT unixtime FROM sensordata ORDER BY unixtime DESC LIMIT 1`;
    db.get(query, (err, row) => {
      if (err) reject(err);
      else resolve(Object.values(row)[1]);
    });
  });
};
