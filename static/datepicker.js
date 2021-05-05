let nhoursinput = document.getElementById("nhours");
let daterange = document.getElementById("daterange");
let from = document.getElementById("from");
let to = document.getElementById("to");

function showcaseDates(startDate, endDate) {
  if (!startDate) startDate = picker.getStartDate();
  if (!endDate) endDate = picker.getEndDate();
  daterange.value = `${formatDate(startDate, true)} bis ${formatDate(
    endDate,
    true
  )}`;
  from.value = `${formatDate(startDate, false)}`;
  to.value = `${formatDate(endDate, false)}`;
}

var queryParams = {};

function loadQueryParamsWithDefaults() {
  if (Object.keys(queryParams).length > 0) return;

  let initNHours = 36;
  let qsNHours = /nhours=([0-9]*)/.exec(window.location.search);
  if (qsNHours && "1" in qsNHours) {
    initNHours = parseInt(qsNHours[1]);
  }
  queryParams.nhours = initNHours;

  let initStartDate = new Date(new Date().valueOf() - 2 * 1000 * 60 * 60 * 24);
  let initEndDate = new Date();

  let qsStartDate = /from=([0-9]*-[0-9]*-[0-9]*)/.exec(window.location.search);
  let qsEndDate = /to=([0-9]*-[0-9]*-[0-9]*)/.exec(window.location.search);

  if (qsStartDate && "1" in qsStartDate) {
    initStartDate = new Date(qsStartDate[1]);
    queryParams.min = initStartDate;
    queryParams.mode = "dates";
  }
  queryParams.startDate = initStartDate;
  queryParams.fromDate = formatDate(initStartDate);

  if (qsEndDate && "1" in qsEndDate) initEndDate = new Date(qsEndDate[1]);
  queryParams.endDate = initEndDate;
  queryParams.toDate = formatDate(initEndDate);

  if (!("mode" in queryParams)) {
    queryParams.min = dayjs().add(-initNHours, "hours");
    queryParams.mode = "hours";
    nhoursinput.value = initNHours;
  } else {
    loadDatepicker();
  }
}

function isHoursMode() {
  loadQueryParamsWithDefaults();
  return queryParams.mode == "hours";
}

var picker;

function loadDatepicker() {
  if (picker) return;
  loadQueryParamsWithDefaults();

  picker = new Litepicker({
    element: document.getElementById("litepicker"),
    singleMode: false,
    startDate: queryParams.startDate,
    endDate: queryParams.endDate,
    maxDate: new Date(),
    setup: (picker) => {
      showcaseDates(queryParams.startDate, queryParams.endDate),
        picker.on("selected", (startDate, endDate) => {
          console.log("selected", startDate, endDate);
          showcaseDates(startDate, endDate);
        });
    },
  });

  daterange.addEventListener("click", () => picker.show());
}

function loadNHours() {
  loadQueryParamsWithDefaults();

  if (nhoursinput.value) return;
  nhoursinput.value = queryParams.nhours;
}

function twoDigit(n) {
  if (n < 10) return "0" + n;
  else return n;
}

function formatDate(date, hr) {
  d = date;
  if ("dateInstance" in date) {
    d = date.dateInstance;
  }
  if (hr) {
    return `${twoDigit(d.getDate())}.${twoDigit(
      d.getMonth() + 1
    )}.${d.getFullYear()}`;
  } else {
    return `${d.getFullYear()}-${twoDigit(d.getMonth() + 1)}-${twoDigit(
      d.getDate()
    )}`;
  }
}

function getStartDate(hr) {
  return formatDate(picker.getStartDate(), hr);
}

function getEndDate(hr) {
  return formatDate(picker.getEndDate(), hr);
}
