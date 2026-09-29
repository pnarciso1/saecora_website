const eventLabels = {
  hyrox: "HYROX",
  "5k": "5K",
  "10k": "10K",
  half: "Half marathon",
  marathon: "Marathon",
  ultra: "Ultra",
  triathlon: "Triathlon",
  strength: "Strength peak",
  other: "Event",
};

const activityLabels = {
  run: "Run",
  bike: "Bike",
  swim: "Swim",
  strength: "Strength",
  hyrox: "HYROX",
  row: "Row",
  ski_erg: "SkiErg",
  walk: "Walk",
  mobility: "Mobility",
  other: "Other",
};

const bandLabels = { ready: "READY", caution: "CAUTION", recover: "RECOVER" };

const state = document.querySelector("#state");
const stateTitle = document.querySelector("#state-title");
const stateCopy = document.querySelector("#state-copy");
const retry = document.querySelector("#retry");
const report = document.querySelector("#report");

function showState(title, copy, canRetry) {
  report.hidden = true;
  state.hidden = false;
  stateTitle.textContent = title;
  stateCopy.textContent = copy || "";
  stateCopy.hidden = !copy;
  retry.hidden = !canRetry;
}

function codeFromPath() {
  const match = location.pathname.match(/^\/coach\/([A-Za-z0-9-]{4,12})\/?$/);
  return match ? match[1].toUpperCase() : "";
}

function unwrap(payload) {
  const body = Array.isArray(payload) ? payload[0] : payload;
  if (body && body.error) {
    const error = body.error.json || body.error;
    const message = error.message || "This report didn’t load.";
    const status = error.data && error.data.httpStatus;
    const err = new Error(message);
    err.status = status;
    throw err;
  }
  const data = body && body.result && body.result.data;
  if (data && typeof data === "object" && "json" in data) return data.json;
  return data;
}

function formatDate(ms) {
  return new Date(Number(ms)).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDistance(hundredths, unit) {
  if (hundredths == null) return "";
  const km = Number(hundredths) / 100;
  if (unit === "mi") {
    const miles = km * 0.621371;
    const digits = miles >= 10 ? 1 : 2;
    return `${miles.toFixed(digits)} mi`;
  }
  return `${km.toFixed(km % 1 === 0 ? 0 : 1)} km`;
}

function add(parent, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  parent.append(node);
  return node;
}

function render(data) {
  document.title = `${data.athleteName} · Saecora`;
  document.querySelector("#athlete").textContent = data.athleteName || "Saecora athlete";
  document.querySelector("#shared").textContent = data.coachName
    ? `Shared with ${data.coachName}`
    : "Read-only athlete snapshot";

  const readiness = data.readiness;
  document.querySelector("#score").textContent = readiness ? String(readiness.score) : "—";
  document.querySelector("#band").textContent = readiness ? bandLabels[readiness.band] || readiness.band : "";
  document.querySelector("#summary").textContent = readiness ? readiness.summary || "" : "No readiness score yet.";

  const unit = data.profile && data.profile.distanceUnit === "mi" ? "mi" : "km";
  const events = document.querySelector("#event-list");
  events.replaceChildren();
  const eventSection = document.querySelector("#events");
  if (data.events && data.events.length) {
    eventSection.hidden = false;
    for (const event of data.events) {
      const row = add(events, "div", "event");
      const tag = add(row, "span", event.priority === "A" ? "tag tag-a" : "tag tag-b");
      tag.textContent = `${event.priority}-RACE`;
      add(row, "div", "race-name", event.name);
      const detail = [eventLabels[event.type] || event.type, formatDate(event.dateMs)].filter(Boolean).join(" · ");
      add(row, "div", "race-note", detail);
    }
  } else {
    eventSection.hidden = true;
  }

  const planSection = document.querySelector("#plan");
  const sessions = document.querySelector("#sessions");
  sessions.replaceChildren();
  if (data.plan) {
    planSection.hidden = false;
    document.querySelector("#plan-title").textContent = data.plan.title || "Plan";
    document.querySelector("#plan-copy").textContent = data.plan.rationale || "";
    for (const session of data.plan.upcoming || []) {
      const row = add(sessions, "div", "session dated");
      add(row, "span", "when", formatDate(session.dateMs));
      const title = add(row, "span");
      title.append(document.createTextNode(session.title || "Session"));
      const dim = add(title, "span", "dim");
      dim.textContent = ` · ${session.durationMin} min`;
    }
    document.querySelector("#calibration").textContent = data.plan.calibrationNotes || "";
  } else {
    planSection.hidden = true;
  }

  const workoutSection = document.querySelector("#workouts");
  const workoutList = document.querySelector("#workout-list");
  workoutList.replaceChildren();
  if (data.recentWorkouts && data.recentWorkouts.length) {
    workoutSection.hidden = false;
    for (const workout of data.recentWorkouts) {
      const row = add(workoutList, "div", "workout");
      add(row, "div", "workout-title", workout.title || "Session");
      const felt = workout.howItFelt == null ? "—" : `${workout.howItFelt}/10`;
      add(row, "div", "race-note", `${formatDate(workout.dateMs)} · felt ${felt}`);
      for (const activity of workout.activities || []) {
        const distance = formatDistance(activity.distanceKm, unit);
        const bits = [activityLabels[activity.type] || activity.type, `${activity.durationMin} min`];
        if (distance) bits.push(distance);
        add(row, "div", "race-note", bits.join(" · "));
      }
    }
  } else {
    workoutSection.hidden = true;
  }

  state.hidden = true;
  report.hidden = false;
}

async function load() {
  const code = codeFromPath();
  if (!code) {
    showState("Link inactive", "This share code is unknown.", false);
    return;
  }
  showState("Opening the report.", "", false);
  const input = encodeURIComponent(JSON.stringify({ json: { code } }));
  try {
    const response = await fetch(`/api/trpc/coach.report?input=${input}`);
    const payload = await response.json();
    const data = unwrap(payload);
    if (!data || data.error) {
      showState("Link inactive", (data && data.error) || "This share code is unknown.", false);
      return;
    }
    render(data);
  } catch (error) {
    const offline = error.status === 503 || /not configured/i.test(error.message || "");
    showState(
      offline ? "Reports aren’t connected." : "This report didn’t load.",
      offline
        ? "The training service isn’t linked to this site yet."
        : "Try again in a moment.",
      !offline,
    );
  }
}

retry.addEventListener("click", () => {
  load();
});

load();
