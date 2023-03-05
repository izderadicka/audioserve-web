export function formatTime(dur: number) {
  if (!isFinite(dur)) return "?";
  if (dur < 0) {
    return "00:00";
  }
  let hours = 0;
  let mins: number | string = Math.floor(dur / 60);
  let secs: number | string = Math.floor(dur % 60);
  secs = ("0" + secs).slice(-2);
  if (mins >= 60) {
    hours = Math.floor(mins / 60);
    mins = mins - hours * 60;
    mins = ("0" + mins).slice(-2);
  }
  if (hours) {
    return `${hours}:${mins}:${secs}`;
  } else {
    return `${mins}:${secs}`;
  }
}

const formatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const DIVISIONS = [
  { amount: 60, name: "seconds" },
  { amount: 60, name: "minutes" },
  { amount: 24, name: "hours" },
  { amount: 7, name: "days" },
  { amount: 4.34524, name: "weeks" },
  { amount: 12, name: "months" },
  { amount: Number.POSITIVE_INFINITY, name: "years" },
];

export function formatTimeAgo(ts: number) {
  let duration = (Date.now() - ts) / 1000;

  for (let i = 0; i <= DIVISIONS.length; i++) {
    const division = DIVISIONS[i];
    if (Math.abs(duration) < division.amount) {
      return formatter.format(-Math.round(duration), division.name as any);
    }
    duration /= division.amount;
  }
}
