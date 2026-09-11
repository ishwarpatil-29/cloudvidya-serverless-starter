document.getElementById("appTitle").textContent = window.APP_NAME || "EventHub";
document.title = window.APP_NAME || "EventHub";
const listEl = document.getElementById("list");
const modal = document.getElementById("modal");
const eventForm = document.getElementById("eventForm");
const submitBtn = document.getElementById("submitBtn");
let allItems = [];
let activeFilter = "All";
const registeredEvents = new Set(JSON.parse(localStorage.getItem("eventhubRegisteredEvents") || "[]"));
const teamMembers = JSON.parse(localStorage.getItem("eventhubTeamMembers") || "[]");
const savedSession = JSON.parse(sessionStorage.getItem("eventhubSession") || "null");
const crewMessages = JSON.parse(localStorage.getItem("eventhubCrewMessages") || "[]");
const reminders = JSON.parse(localStorage.getItem("eventhubReminders") || "{}");
const firedReminders = JSON.parse(localStorage.getItem("eventhubFiredReminders") || "{}");
const joinRequests = JSON.parse(localStorage.getItem("eventhubJoinRequests") || "[]");
const eventMedia = JSON.parse(localStorage.getItem("eventhubMedia") || "{}");
const firedEventDayAlerts = JSON.parse(localStorage.getItem("eventhubEventDayAlerts") || "{}");
const groupCode = localStorage.getItem("eventhubGroupCode") || `EH-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
localStorage.setItem("eventhubGroupCode", groupCode);
document.getElementById("groupCodeValue").textContent = groupCode;
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.classList.toggle("dark-theme", dark);
  themeIcon.textContent = dark ? "☀" : "☾";
  themeLabel.textContent = dark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

applyTheme(localStorage.getItem("eventhubTheme") || "light");
themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
  localStorage.setItem("eventhubTheme", nextTheme);
  applyTheme(nextTheme);
});

function startSession(user) {
  sessionStorage.setItem("eventhubSession", JSON.stringify(user));
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("appShell").hidden = false;
  document.getElementById("userName").textContent = user.name;
  document.getElementById("userAvatar").textContent = user.name.charAt(0).toUpperCase();
  document.getElementById("crewChatStatus").textContent = user.role === "member" ? `Joined with ${groupCode}` : "Private team space";
  if (user.role === "member" && !teamMembers.some((member) => member.name.toLowerCase() === user.name.toLowerCase())) {
    teamMembers.push({ name: user.name, role: "Group member", email: user.email });
    localStorage.setItem("eventhubTeamMembers", JSON.stringify(teamMembers));
    renderTeam();
  }
  if (user.role === "leader") {
    const request = joinRequests.find((item) => item.leaderName.toLowerCase() === user.name.toLowerCase() && !item.seen);
    if (request) {
      request.seen = true;
      localStorage.setItem("eventhubJoinRequests", JSON.stringify(joinRequests));
      setTimeout(() => showRegistrationNotice(`${request.memberName} joined your team`, `${request.memberRole} · ${request.email}`), 250);
    }
  }
}

document.getElementById("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("loginName").value.trim();
  const email = document.getElementById("loginEmail").value.trim();
  const role = document.getElementById("loginRole").value;
  const enteredCode = document.getElementById("loginGroupCode").value.trim().toUpperCase();
  const leaderName = document.getElementById("loginLeaderName").value.trim();
  if (!name || !email) return;
  const status = document.getElementById("loginStatus");
  if (role === "member" && enteredCode !== groupCode) {
    status.textContent = "That group code does not match. Ask your team leader for the invite code.";
    status.className = "login-status error";
    return;
  }
  if (role === "member" && !leaderName) {
    status.textContent = "Enter the registered name of your team leader.";
    status.className = "login-status error";
    return;
  }
  if (role === "leader") localStorage.setItem("eventhubLeaderName", name);
  if (role === "member") {
    const registeredLeader = localStorage.getItem("eventhubLeaderName") || "";
    if (registeredLeader.toLowerCase() !== leaderName.toLowerCase()) {
      status.textContent = "That team leader name was not found. Check with your organizer.";
      status.className = "login-status error";
      return;
    }
    if (!joinRequests.some((item) => item.memberName.toLowerCase() === name.toLowerCase() && item.leaderName.toLowerCase() === leaderName.toLowerCase())) {
      joinRequests.push({ memberName: name, memberRole: "Group member", email, leaderName, seen: false });
      localStorage.setItem("eventhubJoinRequests", JSON.stringify(joinRequests));
    }
  }
  startSession({ name, email, role, leaderName: role === "member" ? leaderName : name, groupCode: role === "member" ? enteredCode : groupCode });
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("eventhubSession");
  document.getElementById("appShell").hidden = true;
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("loginName").focus();
});

if (savedSession) startSession(savedSession);

function localDateInputValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "Choose a date";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? "Choose a date" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function updateCalendarIllustration(value = localDateInputValue()) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return;
  document.getElementById("calendarMonth").textContent = date.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  document.getElementById("calendarDay").textContent = date.toLocaleDateString(undefined, { day: "2-digit" });
  document.getElementById("calendarWeekday").textContent = date.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
}

function showRegistrationNotice(eventTitle, date, heading = "Registration confirmed") {
  document.getElementById("noticeTitle").textContent = heading;
  const message = date.includes("·") || date.includes(" at ") ? date : formatDate(date);
  document.getElementById("noticeMessage").textContent = `${eventTitle} · ${message}`;
  const notice = document.getElementById("registrationNotice");
  notice.hidden = false;
  notice.classList.remove("notice-visible");
  requestAnimationFrame(() => notice.classList.add("notice-visible"));
}

function checkEventDayAlerts() {
  const today = localDateInputValue();
  allItems.filter((item) => item.eventDate === today && registeredEvents.has(item.id || item.title)).forEach((item) => {
    const key = item.id || item.title;
    if (firedEventDayAlerts[key]) return;
    firedEventDayAlerts[key] = true;
    localStorage.setItem("eventhubEventDayAlerts", JSON.stringify(firedEventDayAlerts));
    showRegistrationNotice(item.title, formatDate(today), "Event today");
  });
}

function hideRegistrationNotice() {
  const notice = document.getElementById("registrationNotice");
  notice.classList.remove("notice-visible");
  setTimeout(() => { notice.hidden = true; }, 220);
}

function daysUntil(value) {
  if (!value) return null;
  const today = new Date(`${localDateInputValue()}T00:00:00`);
  const eventDay = new Date(`${value}T00:00:00`);
  return Math.ceil((eventDay - today) / 86400000);
}

function eventStart(date, time = "18:00") { return new Date(`${date}T${time || "18:00"}`); }

function reminderLabel(value) { return value === "hour" ? "1 hour before" : "1 day before"; }

function checkReminder(event, selectedId) {
  if (!event || !selectedId || !registeredEvents.has(selectedId) || !reminders[selectedId]) return;
  const reminderType = reminders[selectedId];
  const triggerAt = eventStart(event.eventDate, event.eventTime);
  triggerAt.setMinutes(triggerAt.getMinutes() - (reminderType === "hour" ? 60 : 1440));
  const reminderKey = `${selectedId}-${reminderType}`;
  if (new Date() >= triggerAt && !firedReminders[reminderKey]) {
    firedReminders[reminderKey] = true;
    localStorage.setItem("eventhubFiredReminders", JSON.stringify(firedReminders));
    showRegistrationNotice(`Your event starts in ${reminderType === "hour" ? "1 hour" : "1 day"}`, `${event.title} · ${formatDate(event.eventDate)}`);
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

async function loadItems() {
  try {
    const res = await fetch(`${(window.API_BASE || "").trim()}/items`);
    const data = await res.json();
    allItems = data.items || [];
    document.getElementById("eventCount").textContent = String(allItems.length).padStart(2, "0");
    setupCalendar();
    renderItems();
    setupMedia();
    checkEventDayAlerts();
  } catch (err) {
    setupCalendar();
    setupMedia();
    listEl.innerHTML = "<div class='empty-state'>Events are taking a little longer to arrive. Check your API connection and refresh.</div>";
    console.error(err);
  }
}

function renderItems() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  const items = allItems.filter((item) => {
    const matchesFilter = activeFilter === "All" || item.category === activeFilter;
    const matchesQuery = !query || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  if (!items.length) {
    listEl.innerHTML = "<div class='empty-state'>No events match that search yet. Try another path.</div>";
    return;
  }
  listEl.innerHTML = items.map((item) => {
    const dateLabel = item.eventDate ? formatDate(item.eventDate) : "Date coming soon";
    return `<article class="event-card"><div class="event-type"><span>${escapeHtml(item.category || "Community")}</span><button class="save-event" aria-label="Save ${escapeHtml(item.title)}" data-id="${escapeHtml(item.id || item.title)}">♡</button></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><div class="event-meta"><span>${dateLabel}</span><span>Open to all</span></div></article>`;
  }).join("");
  document.querySelectorAll(".save-event").forEach((button) => button.addEventListener("click", () => {
    button.classList.toggle("saved");
    button.textContent = button.classList.contains("saved") ? "♥" : "♡";
  }));
}

function setupCalendar() {
  const today = localDateInputValue();
  const todayDate = document.getElementById("todayDate");
  const select = document.getElementById("calendarEventSelect");
  const datePicker = document.getElementById("eventDatePicker");
  const timePicker = document.getElementById("eventTimePicker");
  const reminderPicker = document.getElementById("reminderPicker");
  todayDate.textContent = formatDate(today);
  updateCalendarIllustration(today);
  datePicker.min = today;
  timePicker.value = timePicker.value || "18:00";
  reminderPicker.value = reminderPicker.value || "day";
  select.innerHTML = allItems.length
    ? `<option value="">Select an event</option>${allItems.map((item) => `<option value="${escapeHtml(item.id || item.title)}">${escapeHtml(item.title)}</option>`).join("")}`
    : "<option value=\"\">No events available</option>";
  select.onchange = () => {
    const item = allItems.find((eventItem) => (eventItem.id || eventItem.title) === select.value);
    datePicker.value = item && item.eventDate ? item.eventDate : today;
    timePicker.value = item && item.eventTime ? item.eventTime : "18:00";
    reminderPicker.value = reminders[select.value] || "day";
    updateCalendarIllustration(datePicker.value);
    updateCalendarStatus();
  };
  datePicker.onchange = () => {
    updateCalendarIllustration(datePicker.value);
    updateCalendarStatus();
  };
  timePicker.onchange = updateCalendarStatus;
  reminderPicker.onchange = updateCalendarStatus;
  updateCalendarStatus();
}

function setupMedia() {
  const select = document.getElementById("mediaEventSelect");
  select.innerHTML = allItems.length
    ? `<option value="">Select an event</option>${allItems.map((item) => `<option value="${escapeHtml(item.id || item.title)}">${escapeHtml(item.title)}</option>`).join("")}`
    : "<option value=\"\">No events available</option>";
  select.onchange = renderMedia;
  renderMedia();
}

function renderMedia() {
  const eventId = document.getElementById("mediaEventSelect").value;
  const gallery = document.getElementById("mediaGallery");
  const files = eventMedia[eventId] || [];
  if (!files.length) {
    gallery.innerHTML = "<div class='media-empty'>Your shared event files will appear here.</div>";
    return;
  }
  gallery.innerHTML = files.map((file) => file.type.startsWith("image/")
    ? `<figure class="media-item"><img src="${file.data}" alt="${escapeHtml(file.name)}" /><figcaption>${escapeHtml(file.name)}</figcaption></figure>`
    : `<div class="media-item file-item"><span>${file.type.startsWith("video/") ? "▶" : "▤"}</span><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.kind)}</small></div>`).join("");
}

document.getElementById("mediaInput").addEventListener("change", (event) => {
  const eventId = document.getElementById("mediaEventSelect").value;
  const status = document.getElementById("uploadStatus");
  if (!eventId) { status.textContent = "Choose an event before uploading files."; event.target.value = ""; return; }
  const files = [...event.target.files];
  const accepted = files.filter((file) => file.size <= 5 * 1024 * 1024);
  if (!accepted.length) { status.textContent = "Files must be 5 MB or smaller."; event.target.value = ""; return; }
  eventMedia[eventId] ||= [];
  Promise.all(accepted.map((file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, kind: file.type.startsWith("image/") ? "Photo" : file.type.startsWith("video/") ? "Video" : "Document", data: file.type.startsWith("image/") ? reader.result : "" });
    reader.readAsDataURL(file);
  }))).then((newFiles) => {
    eventMedia[eventId].push(...newFiles);
    localStorage.setItem("eventhubMedia", JSON.stringify(eventMedia));
    renderMedia();
    status.textContent = `${newFiles.length} file${newFiles.length === 1 ? "" : "s"} shared with the event group.`;
    event.target.value = "";
  });
});

function updateCalendarStatus() {
  const select = document.getElementById("calendarEventSelect");
  const datePicker = document.getElementById("eventDatePicker");
  const timePicker = document.getElementById("eventTimePicker");
  const reminderPicker = document.getElementById("reminderPicker");
  const status = document.getElementById("calendarStatus");
  const action = document.getElementById("calendarAction");
  const selectedId = select.value;
  const remaining = daysUntil(datePicker.value);
  const selectedEvent = allItems.find((item) => (item.id || item.title) === selectedId);
  const registered = selectedId && registeredEvents.has(selectedId);
  action.classList.toggle("active", Boolean(registered));
  action.innerHTML = registered ? "Registered <span>✓</span>" : "Register for event <span>→</span>";
  checkReminder(selectedEvent, selectedId);
  if (!selectedId) {
    status.textContent = "Select an event to see how many days are left.";
  } else if (remaining === null) {
    status.textContent = "Choose a date for this event.";
  } else if (remaining < 0) {
    status.textContent = "This event date has passed. Choose another date.";
  } else if (remaining === 0) {
    status.textContent = `Today · ${formatDate(datePicker.value)}`;
  } else {
    status.textContent = `${remaining} ${remaining === 1 ? "day" : "days"} left · ${formatDate(datePicker.value)} at ${timePicker.value || "18:00"} · ${reminderLabel(reminderPicker.value)}`;
  }
}

function openModal() {
  modal.hidden = false;
  const eventDate = document.getElementById("eventDate");
  eventDate.min = localDateInputValue();
  eventDate.value = localDateInputValue();
  document.getElementById("eventTime").value = "18:00";
  document.getElementById("title").focus();
}
function closeModal() { modal.hidden = true; }
document.getElementById("openModalBtn").addEventListener("click", openModal);
document.getElementById("heroHostBtn").addEventListener("click", openModal);
document.getElementById("closeModalBtn").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
const calendarNav = document.getElementById("calendarNav");
const calendarAction = document.getElementById("calendarAction");
calendarNav.addEventListener("click", () => calendarNav.classList.add("active"));
calendarAction.addEventListener("click", () => {
  const selectedId = document.getElementById("calendarEventSelect").value;
  const date = document.getElementById("eventDatePicker").value;
  const time = document.getElementById("eventTimePicker").value || "18:00";
  const reminder = document.getElementById("reminderPicker").value;
  if (!selectedId || !date || daysUntil(date) < 0) {
    document.getElementById("calendarStatus").textContent = "Choose an upcoming event date before registering.";
    return;
  }
  registeredEvents.add(selectedId);
  reminders[selectedId] = reminder;
  localStorage.setItem("eventhubReminders", JSON.stringify(reminders));
  localStorage.setItem("eventhubRegisteredEvents", JSON.stringify([...registeredEvents]));
  const selectedEvent = allItems.find((item) => (item.id || item.title) === selectedId);
  showRegistrationNotice(selectedEvent ? selectedEvent.title : "Your event", `${formatDate(date)} at ${time} · Reminder set ${reminderLabel(reminder)}`);
  updateCalendarStatus();
});
document.getElementById("noticeAccept").addEventListener("click", hideRegistrationNotice);
document.getElementById("noticeClose").addEventListener("click", hideRegistrationNotice);
document.getElementById("copyGroupCode").addEventListener("click", async () => {
  await navigator.clipboard.writeText(groupCode);
  const button = document.getElementById("copyGroupCode");
  button.textContent = "Copied";
  setTimeout(() => { button.textContent = "Copy"; }, 1400);
});
document.getElementById("searchInput").addEventListener("input", renderItems);
document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelector(".filter.active").classList.remove("active");
  button.classList.add("active");
  renderItems();
}));

function getOrganizerEvent() {
  const selectedId = document.getElementById("calendarEventSelect").value;
  return allItems.find((item) => (item.id || item.title) === selectedId) || allItems[0];
}

document.querySelectorAll(".ai-action").forEach((button) => button.addEventListener("click", () => {
  const event = getOrganizerEvent();
  const output = document.getElementById("aiOutput");
  if (!event) {
    output.textContent = "Choose an event in the calendar first, then ask Event AI for help.";
    return;
  }
  const date = event.eventDate ? formatDate(event.eventDate) : "your event date";
  const responses = {
    plan: `<strong>${escapeHtml(event.title)} run-of-show</strong><br />2 hours before: setup and sound check<br />30 minutes before: welcome desk and team briefing<br />Start: welcome guests and introduce the host<br />Finish: thank people, collect feedback, and pack down`,
    checklist: `<strong>${escapeHtml(event.title)} checklist</strong><br />Confirm venue and date: ${date}<br />Assign welcome desk, tech, and photos<br />Share the final attendee message<br />Prepare sign-in, supplies, and a backup plan`,
    announce: `<strong>Announcement draft</strong><br />Join us for ${escapeHtml(event.title)}. Bring a friend, arrive a little early, and come ready to connect. We’ll see you on ${date}.`,
  };
  output.innerHTML = responses[button.dataset.ai];
}));

function addChatMessage(containerId, text, kind) {
  const container = document.getElementById(containerId);
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${kind}`;
  bubble.textContent = text;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function renderCrewMessages() {
  const container = document.getElementById("crewChatMessages");
  container.innerHTML = crewMessages.length ? crewMessages.map((message) => `<div class="chat-message-group"><small>${escapeHtml(message.sender)}</small><div class="chat-bubble ${message.kind}">${escapeHtml(message.text)}</div></div>`).join("") : '<div class="chat-bubble bot">Welcome the crew. Share a task or an update here.</div>';
  container.scrollTop = container.scrollHeight;
}

document.getElementById("aiChatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("aiChatInput");
  const question = input.value.trim();
  if (!question) return;
  addChatMessage("aiChatMessages", question, "user");
  const eventItem = getOrganizerEvent();
  const date = eventItem && eventItem.eventDate ? formatDate(eventItem.eventDate) : "your selected date";
  let answer = `For ${eventItem ? eventItem.title : "your event"}, start with a simple timeline: confirm the venue, assign a welcome lead, and send the final reminder 24 hours before ${date}.`;
  if (/team|member|crew/i.test(question)) answer = "Give every teammate one clear owner task: welcome desk, tech, speaker care, or photos. Keep one leader available for surprises.";
  if (/date|time|schedule/i.test(question)) answer = `Your current event date is ${date}. Plan setup 2 hours before doors, a team check-in 30 minutes before, and a short wrap-up after guests leave.`;
  setTimeout(() => addChatMessage("aiChatMessages", answer, "bot"), 180);
  input.value = "";
});

document.getElementById("crewChatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("crewChatInput");
  const message = input.value.trim();
  if (!message) return;
  const session = JSON.parse(sessionStorage.getItem("eventhubSession") || "null");
  const sender = session ? session.name : "Team member";
  crewMessages.push({ sender, text: message, kind: "user" });
  localStorage.setItem("eventhubCrewMessages", JSON.stringify(crewMessages));
  renderCrewMessages();
  document.getElementById("crewChatStatus").textContent = "Just now";
  input.value = "";
});

function renderTeam() {
  const list = document.getElementById("memberList");
  const session = JSON.parse(sessionStorage.getItem("eventhubSession") || "null");
  const leaderName = session && session.role === "leader" ? session.name : "Team leader";
  list.innerHTML = `<div class="member-row"><span class="avatar avatar-lead">${escapeHtml(leaderName.charAt(0).toUpperCase())}</span><span><strong>${escapeHtml(leaderName)}</strong><small>Team leader</small></span><span class="role-tag">Lead</span></div>${teamMembers.filter((member) => member.name.toLowerCase() !== leaderName.toLowerCase()).map((member) => `<div class="member-row"><span class="avatar">${escapeHtml(member.name.charAt(0).toUpperCase())}</span><span><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.role)}</small></span><button class="remove-member" data-name="${escapeHtml(member.name)}" type="button" aria-label="Remove ${escapeHtml(member.name)}">×</button></div>`).join("")}`;
  document.getElementById("memberCount").textContent = `${teamMembers.length + 1} ${teamMembers.length === 0 ? "member" : "members"}`;
  document.querySelectorAll(".remove-member").forEach((button) => button.addEventListener("click", () => {
    const index = teamMembers.findIndex((member) => member.name === button.dataset.name);
    if (index >= 0) teamMembers.splice(index, 1);
    localStorage.setItem("eventhubTeamMembers", JSON.stringify(teamMembers));
    renderTeam();
  }));
}

document.getElementById("memberForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const nameInput = document.getElementById("memberName");
  teamMembers.push({ name: nameInput.value.trim(), role: document.getElementById("memberRole").value });
  localStorage.setItem("eventhubTeamMembers", JSON.stringify(teamMembers));
  nameInput.value = "";
  renderTeam();
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const statusEl = document.getElementById("status");
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value;
  const participantName = document.getElementById("participantName").value.trim();
  const eventDate = document.getElementById("eventDate").value;
  const eventTime = document.getElementById("eventTime").value;
  submitBtn.disabled = true;
  statusEl.textContent = "Publishing...";
  statusEl.className = "";
  try {
    const res = await fetch(`${(window.API_BASE || "").trim()}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, participantName, eventDate, eventTime }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Submission failed.");
    statusEl.textContent = "Published. Your event is now on the board.";
    statusEl.className = "ok";
    eventForm.reset();
    await loadItems();
    setTimeout(closeModal, 900);
  } catch (err) {
    statusEl.textContent = err.message || "Something went wrong.";
    statusEl.className = "err";
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});

setupCalendar();
renderTeam();
renderCrewMessages();
setupMedia();
loadItems();
setInterval(checkEventDayAlerts, 60000);
