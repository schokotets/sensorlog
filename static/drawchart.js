/*
let nhoursQS = /nhours=([0-9.,]*)/.exec(window.location.search)
let nhours = 24
if (nhoursQS && "1" in nhoursQS) {
  let parsednhours = parseFloat(nhoursQS[1])
  if (!isNaN(parsednhours)) {
    nhours = parsednhours;
  }
}
document.getElementById('currentNHours').innerText = `Letzten ${nhours} h.`
*/

function loadData() {
  loadQueryParamsWithDefaults();
  console.log("loading data");

  document.getElementById("spinner").style.display = "unset";
  let queryString;
  if (queryParams.mode == "hours") {
    queryString = `/data?nhours=${queryParams.nhours}`;
  } else {
    queryString = `/data?from=${queryParams.fromDate}&to=${queryParams.endDate}`;
  }
  let datapromise = fetch(queryString).then((resp) => resp.json());

  let names = ["oben", "draußen", "unten / Rohr"];

  datapromise.then((data) =>
    setupChart(
      queryParams.min,
      queryParams.endDate,
      data,
      "tempChart",
      "Temperatur",
      names,
      "°C",
      2,
      ["#E83B27", "#2f2c78", "#e687e4"]
    )
  );
  datapromise.then((data) =>
    setupChart(
      queryParams.min,
      queryParams.endDate,
      data,
      "relHumChart",
      "relative Luftfeuchtigkeit",
      names,
      "%",
      3,
      ["#E83B27", "#2f2c78", "#e687e4"]
    )
  );
  datapromise.then((data) =>
    setupChart(
      queryParams.min,
      queryParams.endDate,
      data,
      "absHumChart",
      "absolute Luftfeuchtigkeit",
      names,
      "g/m³",
      4,
      ["#E83B27", "#2f2c78", "#e687e4"]
    )
  );

  datapromise.then((data) => (window.data = data));
}

async function setupChart(
  min,
  endDate,
  data,
  chartid,
  title,
  names,
  unit,
  dataindex,
  colors
) {
  document.getElementById("spinner").style.display = "none";
  min = dayjs(min).unix() * 1000;
  let max = dayjs(endDate).endOf("day").unix() * 1000;

  let ctx = document.getElementById(chartid).getContext("2d");
  let chartdata = {
    type: "line",
    data: {
      datasets: colors.map((color, index) => {
        return {
          label: `#${index + 1} (${names[index]})`,
          data: data
            .filter((r) => r[1] == index + 1)
            .filter((r) => (min ? r[0] >= min : true))
            .map((r) => {
              return {
                x: r[0],
                y: r[dataindex] < 200 ? r[dataindex] : undefined,
              };
            }),
          backgroundColor: color,
          fill: false,
          borderColor: color,
          borderWidth: 3,
          pointHitRadius: 9,
          pointHoverRadius: 2,
          pointRadius: 0,
        };
      }),
    },
    options: {
      title: {
        text: title,
        padding: 0,
        display: true,
      },
      legendCallback: function (chart) {
        var text = [];
        text.push('<div class="list">');
        for (var i = 0; i < chart.data.datasets.length; i++) {
          text.push(
            '<span style="background-color:' +
              chart.data.datasets[i].backgroundColor +
              '">'
          );
          if (chart.data.datasets[i].label) {
            text.push(chart.data.datasets[i].label);
          }
          text.push("</span>");
        }
        text.push("</div>");
        return text.join("");
      },
      maintainAspectRatio: false,
      scales: {
        xAxes: [
          {
            type: "linear",
            ticks: {
              callback: (value, index, values) => formatTime(value),
              stepSize: 5 * 60 * 1000,
              min: min,
              //max: 1609613343950,
            },
          },
        ],
        yAxes: [
          {
            type: "linear",
          },
        ],
      },
      tooltips: {
        mode: "index",
        itemSort: (a, b, data) => b.yLabel - a.yLabel,
        callbacks: {
          title: (tooltipItem, data) => formatTime(tooltipItem[0].xLabel, true),
          label: function (tooltipItem, data) {
            var label = data.datasets[tooltipItem.datasetIndex].label || "";

            if (label) {
              label += ": ";
            }
            label += tooltipItem.yLabel;
            label += unit;
            return label;
          },
        },
      },
    },
  };

  if (title == "Temperatur") {
    let color = "green";
    chartdata.data.datasets.push({
      label: `Taupunkt #3 (unten / Rohr)`,
      data: data
        .filter((r) => r[1] == 3)
        .filter((r) => (min ? r[0] >= min : true))
        .map((r) => {
          return { x: r[0], y: r[2] < 200 ? dewPoint(r[2], r[3]) : undefined };
        }),
      backgroundColor: color,
      fill: false,
      borderColor: color,
      borderWidth: 3,
      pointHitRadius: 9,
      pointHoverRadius: 2,
      pointRadius: 0,
    });
  }

  let chart = new Chart(ctx, chartdata);
  //document.getElementById(chartid+"-legend").innerHTML = chart.generateLegend()
}

function formatTime(unix, precise) {
  return dayjs(unix).format(precise ? "D. MMM H:mm:ss" : "D. MMM H:mm");
}

function dewPoint(temp, rhum) {
  let dewTemp = -5423 / (Math.log(rhum / 100) - 5432 / (273 + temp)) - 273;
  return Math.round(dewTemp * 10) / 10;
}
