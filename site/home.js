const STORAGE = "saecora-beta";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const form = document.querySelector("#signup");
const confirmPanel = document.querySelector("#confirm");
const emailInput = document.querySelector("#email");
const errorEl = document.querySelector("#error");
const chips = [...document.querySelectorAll("[data-sport]")];
const sportOut = document.querySelector("#sport-out");
const emailOut = document.querySelector("#email-out");
const invite = document.querySelector("#invite");

let sport = "";

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
  emailInput.setAttribute("aria-invalid", message === "Enter a valid email." ? "true" : "false");
}

function showForm() {
  form.hidden = false;
  confirmPanel.hidden = true;
}

function showConfirm(record) {
  sportOut.textContent = String(record.sport || "").toUpperCase();
  emailOut.textContent = record.email;
  form.hidden = true;
  confirmPanel.hidden = false;
}

function selectSport(next) {
  sport = next;
  showError("");
  for (const chip of chips) {
    chip.setAttribute("aria-pressed", chip.dataset.sport === sport ? "true" : "false");
  }
}

for (const chip of chips) {
  chip.addEventListener("click", () => selectSport(chip.dataset.sport));
}

emailInput.addEventListener("input", () => showError(""));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  if (!emailRe.test(email)) {
    showError("Enter a valid email.");
    emailInput.focus();
    return;
  }
  if (!sport) {
    showError("Pick your primary sport.");
    chips[0].focus();
    return;
  }
  const submit = form.querySelector("[type=submit]");
  submit.disabled = true;
  try {
    const response = await fetch("/api/beta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, sport }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showError(data.error || "We couldn’t save that. Try again.");
      return;
    }
    const record = { email, sport };
    try {
      localStorage.setItem(STORAGE, JSON.stringify(record));
    } catch {
      /* confirmation still shows for this visit */
    }
    showConfirm(record);
  } catch {
    showError("We couldn’t save that. Try again.");
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("#reset").addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE);
  } catch {
    /* ignore */
  }
  emailInput.value = "";
  selectSport("");
  showForm();
  emailInput.focus();
});

if (window.SAECORA && window.SAECORA.testflightUrl) {
  invite.href = window.SAECORA.testflightUrl;
}

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
  if (saved && saved.email && saved.sport) showConfirm(saved);
} catch {
  /* ignore a broken saved signup */
}
