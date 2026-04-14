// ── SUPABASE CONFIG ──────────────────────────────────────────
const SUPABASE_URL = "https://rwhegncozcvjjdxlxgpy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3aGVnbmNvemN2ampkeGx4Z3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzY4NjAsImV4cCI6MjA5MTc1Mjg2MH0.4y2jtBp_PnwkJGYVfGCvW16vWeAcxBLMM6-Lst4r1Jc";
const HOST_PASSWORD = "callum2025";

// ── STATE ────────────────────────────────────────────────────
let attending = null;
let guestCount = 1;

// ── SUPABASE HELPERS ─────────────────────────────────────────
async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "resolution=merge-duplicates,return=representation" : "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── FORM INTERACTIONS ────────────────────────────────────────
function selectAttending(val) {
  attending = val;
  document.getElementById("btn-yes").classList.toggle("selected", val === true);
  document.getElementById("btn-no").classList.toggle("selected", val === false);
  document.getElementById("guest-count-section").style.display = val ? "block" : "none";
  document.getElementById("form-error").style.display = "none";
}

function selectGuests(n) {
  guestCount = n;
  document.querySelectorAll(".guest-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i + 1 === n);
  });
}

async function submitRsvp() {
  const name = document.getElementById("name-input").value.trim();
  if (!name || attending === null) {
    document.getElementById("form-error").style.display = "block";
    return;
  }

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "Sending…";

  try {
    await supabase("POST", "rsvps", {
      name,
      attending,
      guests: attending ? guestCount : 0,
    });

    // Show success
    document.getElementById("rsvp-form").style.display = "none";
    document.getElementById("rsvp-success").style.display = "block";
    document.getElementById("success-emoji").textContent = attending ? "🎮" : "😢";
    document.getElementById("success-title").textContent = attending
      ? "Game on! See you there!"
      : "Sorry you can't make it!";
    document.getElementById("success-msg").textContent = attending
      ? `We'll see you May 9th at 1PM${guestCount > 1 ? ` — saving ${guestCount} spots!` : "!"}`
      : "Thanks for letting us know. Callum will miss you!";

  } catch (err) {
    btn.disabled = false;
    btn.textContent = "SEND RSVP";
    alert("Something went wrong — please try again.");
    console.error(err);
  }
}

function editRsvp() {
  document.getElementById("rsvp-success").style.display = "none";
  document.getElementById("rsvp-form").style.display = "block";
  document.getElementById("submit-btn").disabled = false;
  document.getElementById("submit-btn").textContent = "SEND RSVP";
}

// ── HOST LOGIN ───────────────────────────────────────────────
function toggleHostLogin() {
  const form = document.getElementById("host-login-form");
  form.style.display = form.style.display === "none" ? "flex" : "none";
}

function checkPassword() {
  const pwd = document.getElementById("host-pwd").value;
  const err = document.getElementById("host-error");
  if (pwd === HOST_PASSWORD) {
    err.style.display = "none";
    showDashboard();
  } else {
    err.style.display = "block";
    setTimeout(() => err.style.display = "none", 2000);
  }
}

// ── DASHBOARD ────────────────────────────────────────────────
async function showDashboard() {
  document.getElementById("invite-page").style.display = "none";
  document.getElementById("host-page").style.display = "block";
  await loadRsvps();
}

function showInvite() {
  document.getElementById("host-page").style.display = "none";
  document.getElementById("invite-page").style.display = "block";
}

async function loadRsvps() {
  const list = document.getElementById("rsvp-list");
  list.innerHTML = `<div style="text-align:center;color:#9e8e7e;padding:20px;">Loading…</div>`;

  try {
    const data = await supabase("GET", "rsvps?order=created_at.desc");

    const yes = data.filter(r => r.attending);
    const no = data.filter(r => !r.attending);
    const heads = yes.reduce((s, r) => s + r.guests, 0);

    document.getElementById("stat-heads").textContent = heads;
    document.getElementById("stat-yes").textContent = yes.length;
    document.getElementById("stat-no").textContent = no.length;

    if (data.length === 0) {
      list.innerHTML = `<div style="text-align:center;color:#9e8e7e;padding:40px;background:#fff;border-radius:8px;">No RSVPs yet — share the link!</div>`;
      return;
    }

    list.innerHTML = [...yes, ...no].map(r => `
      <div class="rsvp-row ${r.attending ? "attending" : "declined"}">
        <div>
          <div class="rsvp-name">${r.name}</div>
          <div class="rsvp-time">${new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        <div style="text-align:right">
          <div class="rsvp-status ${r.attending ? "yes" : "no"}">${r.attending ? "ATTENDING" : "DECLINED"}</div>
          ${r.attending ? `<div class="rsvp-guests">${r.guests} ${r.guests === 1 ? "guest" : "guests"}</div>` : ""}
        </div>
      </div>
    `).join("");

  } catch (err) {
    list.innerHTML = `<div style="text-align:center;color:#e53935;padding:20px;">Error loading RSVPs. Check your Supabase connection.</div>`;
    console.error(err);
  }
}
