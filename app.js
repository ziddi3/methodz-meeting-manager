let attendeeCount = 0;
let taskCount = 0;

window.onload = function () {
  const meetingDate = document.getElementById("meetingDate");
  meetingDate.valueAsDate = new Date();

  document.getElementById("meetingStatus").addEventListener("change", updateStatusPill);

  addAttendee();
  addTask();
  loadSavedRecords();
  updateMeetingNumberLabel();
  updateStatusPill();
};

function createLogoFallback(text) {
  const div = document.createElement("div");
  div.className = "logo-fallback";
  div.textContent = text;
  return div;
}

function updateMeetingNumberLabel() {
  const records = getRecords();
  const nextNumber = String(records.length + 1).padStart(3, "0");
  document.getElementById("meetingNumberLabel").textContent = `Meeting #${nextNumber}`;
}

function updateStatusPill() {
  const status = document.getElementById("meetingStatus").value;
  document.getElementById("statusPill").textContent = status;
}

function addAttendee() {
  attendeeCount++;
  const container = document.getElementById("attendeeList");
  const div = document.createElement("div");
  div.className = "attendee";

  div.innerHTML = `
    <div class="item-header">
      <h3>Attendee ${attendeeCount}</h3>
      <button type="button" class="small-danger" onclick="removeBlock(this)">Remove</button>
    </div>

    <label>Name</label>
    <input type="text" class="attendee-name" placeholder="Full name">

    <label>Organization / Role</label>
    <input type="text" class="attendee-role" placeholder="CSW, Method HVAC, partner, guest...">

    <label>Attendance Type</label>
    <select class="attendee-type">
      <option>In Person</option>
      <option>Remote</option>
      <option>Phone</option>
    </select>

    <label>Digital Signature</label>
    <input type="text" class="attendee-signature" placeholder="Type full legal name as signature">
  `;

  container.appendChild(div);
}

function addTask() {
  taskCount++;
  const container = document.getElementById("taskList");
  const div = document.createElement("div");
  div.className = "task";

  div.innerHTML = `
    <div class="item-header">
      <h3>Task ${taskCount}</h3>
      <button type="button" class="small-danger" onclick="removeBlock(this)">Remove</button>
    </div>

    <label>Task / Follow-Up</label>
    <input type="text" class="task-name" placeholder="What needs to be done?">

    <label>Assigned To</label>
    <input type="text" class="task-assigned" placeholder="Who is handling this?">

    <label>Priority</label>
    <select class="task-priority">
      <option>Normal</option>
      <option>Low</option>
      <option>High</option>
      <option>Critical</option>
    </select>

    <label>Target Date</label>
    <input type="date" class="task-due">

    <label>Progress</label>
    <select class="task-status">
      <option>Pending</option>
      <option>In Progress</option>
      <option>Completed</option>
    </select>
  `;

  container.appendChild(div);
}

function removeBlock(button) {
  const block = button.closest(".attendee, .task");
  if (!block) return;
  block.remove();
}

function getRecords() {
  return JSON.parse(localStorage.getItem("meetingRecords")) || [];
}

function setRecords(records) {
  localStorage.setItem("meetingRecords", JSON.stringify(records));
}

function collectMeetingData() {
  const records = getRecords();
  const meetingNumber = String(records.length + 1).padStart(3, "0");

  const organizations = [];
  document.querySelectorAll(".company-present").forEach((box) => {
    if (box.checked) organizations.push(box.value);
  });

  const attendees = [];
  document.querySelectorAll(".attendee").forEach((item) => {
    attendees.push({
      name: item.querySelector(".attendee-name").value.trim(),
      organizationRole: item.querySelector(".attendee-role").value.trim(),
      attendanceType: item.querySelector(".attendee-type").value,
      signature: item.querySelector(".attendee-signature").value.trim(),
      signedAt: new Date().toISOString()
    });
  });

  const agenda = [];
  document.querySelectorAll("#agendaList input[type='checkbox']").forEach((box) => {
    agenda.push({
      item: box.parentElement.innerText.trim(),
      completed: box.checked
    });
  });

  const tasks = [];
  document.querySelectorAll(".task").forEach((item) => {
    tasks.push({
      task: item.querySelector(".task-name").value.trim(),
      assignedTo: item.querySelector(".task-assigned").value.trim(),
      priority: item.querySelector(".task-priority").value,
      due: item.querySelector(".task-due").value,
      status: item.querySelector(".task-status").value
    });
  });

  return {
    id: `meeting-${Date.now()}`,
    meetingNumber,
    title: document.getElementById("meetingTitle").value.trim(),
    status: document.getElementById("meetingStatus").value,
    date: document.getElementById("meetingDate").value,
    location: document.getElementById("meetingLocation").value.trim(),
    facilitator: document.getElementById("meetingChair").value.trim(),
    organizations,
    attendees,
    agenda,
    notes: document.getElementById("notes").value.trim(),
    decisions: document.getElementById("decisions").value.trim(),
    tasks,
    summary: document.getElementById("summary").value.trim(),
    savedAt: new Date().toISOString()
  };
}

function validateMeeting(meeting) {
  if (!meeting.title) return "Please enter a meeting title.";
  if (!meeting.date) return "Please choose a meeting date.";
  return null;
}

function saveMeeting() {
  const meeting = collectMeetingData();
  const error = validateMeeting(meeting);

  if (error) {
    alert(error);
    return;
  }

  const records = getRecords();
  records.push(meeting);
  setRecords(records);

  alert("Meeting record saved.");
  loadSavedRecords();
  updateMeetingNumberLabel();
}

function loadSavedRecords() {
  const container = document.getElementById("savedRecords");
  container.innerHTML = "";

  const records = getRecords();

  if (records.length === 0) {
    container.innerHTML = "<p>No saved records yet.</p>";
    return;
  }

  records.forEach((record, index) => {
    const div = document.createElement("div");
    div.className = "saved-record";

    div.innerHTML = `
      <strong>Meeting #${record.meetingNumber || index + 1}: ${record.title || "Untitled Meeting"}</strong><br>
      Date: ${record.date || "No date"}<br>
      Status: ${record.status || "No status"}<br>
      Saved: ${new Date(record.savedAt).toLocaleString()}<br>
      <button type="button" onclick="viewRecord(${index})">View</button>
      <button type="button" onclick="deleteRecord(${index})">Delete</button>
    `;

    container.appendChild(div);
  });
}

function viewRecord(index) {
  const records = getRecords();
  const record = records[index];

  const existing = document.getElementById(`record-view-${index}`);
  if (existing) {
    existing.remove();
    return;
  }

  const container = document.querySelectorAll(".saved-record")[index];
  const pre = document.createElement("pre");
  pre.id = `record-view-${index}`;
  pre.textContent = JSON.stringify(record, null, 2);
  container.appendChild(pre);
}

function deleteRecord(index) {
  const confirmDelete = confirm("Delete this saved meeting record?");
  if (!confirmDelete) return;

  const records = getRecords();
  records.splice(index, 1);
  setRecords(records);
  loadSavedRecords();
  updateMeetingNumberLabel();
}

function printMeeting() {
  window.print();
}

function downloadMeeting() {
  const meeting = collectMeetingData();
  const text = JSON.stringify(meeting, null, 2);
  const blob = new Blob([text], { type: "text/plain" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `meeting-record-${meeting.date || "undated"}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function clearMeeting() {
  const confirmClear = confirm("Clear the current meeting form? Save first if needed.");
  if (!confirmClear) return;

  document.getElementById("meetingTitle").value = "";
  document.getElementById("meetingStatus").value = "Scheduled";
  document.getElementById("meetingDate").valueAsDate = new Date();
  document.getElementById("meetingLocation").value = "";
  document.getElementById("meetingChair").value = "";
  document.getElementById("notes").value = "";
  document.getElementById("decisions").value = "";
  document.getElementById("summary").value = "";

  document.getElementById("attendeeList").innerHTML = "";
  document.getElementById("taskList").innerHTML = "";

  document.querySelectorAll("#agendaList input[type='checkbox'], .company-present").forEach((box) => {
    box.checked = false;
  });

  attendeeCount = 0;
  taskCount = 0;

  addAttendee();
  addTask();
  updateStatusPill();
}
