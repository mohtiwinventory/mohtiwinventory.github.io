document.addEventListener("DOMContentLoaded", function () {
  // === Request Push Notification Permission ===
  if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        console.log("Notification permission:", permission);
      });
    }
  }

  // === Hamburger Menu Toggle for Responsive Navigation ===
  const hamburger = document.querySelector(".hamburger");
  const navContent = document.querySelector(".nav-content");
  if (hamburger && navContent) {
    hamburger.addEventListener("click", function () {
      navContent.classList.toggle("active");
    });
  }

  // === Role-based Modifications ===
  const role = localStorage.getItem("role");
  // Remove maintenance link for non-admin roles.
  if (role === "staff" || role === "student") {
    const maintenanceLink = document.getElementById("maintenanceLink");
    if (maintenanceLink) {
      maintenanceLink.remove();
    }
  }
  // Update home link depending on role.
  const homeLink = document.getElementById("homeLink");
  if (homeLink) {
    if (role === "admin") {
      homeLink.querySelector("a").href = "/owner.html";
    } else if (role === "student") {
      homeLink.querySelector("a").href = "/Student.html";
    }
    // For other roles (like staff), you can leave the default as index.html.
  }

  // === Existing Initialization ===
  loadTableData();
  checkAllDueDates();

  const dropdowns = document.querySelectorAll(".dropdown");
  dropdowns.forEach(function (dropdown) {
    const dropbtn = dropdown.querySelector(".dropbtn");
    if (dropbtn) {
      dropbtn.addEventListener("click", function (e) {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          dropdown.classList.toggle("active");
        }
      });
    }
  });

  // Notification toggle for in-page notifications
  const notifIcon = document.querySelector(".notification-hover-container");
  const notifContainer = document.getElementById("notification-container");
  if (notifIcon && notifContainer) {
    notifIcon.addEventListener("click", function (e) {
      e.preventDefault();
      notifContainer.style.display = notifContainer.style.display === "block" ? "none" : "block";
    });
  }

  // Setup admin input if exists (assuming you have a function for that)
  setupAdminInput("adminCode");

  // Logout button functionality
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.clear();
      alert("You have been logged out.");
      window.location.href = "/login.html";
    });
  }

  // === Initialize Drag and Drop on Rows ===
  makeRowsDraggable();
});

// ======================================================
// ======= LOCK / EDIT TOGGLE FUNCTIONALITY =============
// ======================================================

let isEditing = false;

function toggleEditMode() {
  const inputs = document.querySelectorAll("#tableBody input");
  isEditing = !isEditing;
  inputs.forEach(input => {
    input.disabled = !isEditing;
  });
  const btn = document.getElementById("toggleEditBtn");
  if (btn) {
    btn.textContent = isEditing ? "Lock" : "Edit";
  }
}

// ======================================================
// ======= DRAG & DROP FUNCTIONALITY ====================
// ======================================================

function makeRowsDraggable() {
  const rows = document.querySelectorAll("#tableBody tr");
  rows.forEach(row => {
    row.setAttribute("draggable", true);
    row.addEventListener("dragstart", dragStart);
    row.addEventListener("dragover", dragOver);
    row.addEventListener("drop", drop);
    row.addEventListener("dragend", dragEnd);
  });
}

let dragSrcRow = null;
function dragStart(e) {
  dragSrcRow = this;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", this.outerHTML);
  this.classList.add("dragElem");
}
function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  return false;
}
function drop(e) {
  e.stopPropagation();
  if (dragSrcRow !== this) {
    dragSrcRow.outerHTML = this.outerHTML;
    this.outerHTML = e.dataTransfer.getData("text/html");
    makeRowsDraggable();
    saveTableData();
  }
  return false;
}
function dragEnd(e) {
  const rows = document.querySelectorAll("#tableBody tr");
  rows.forEach(row => row.classList.remove("dragElem"));
}

// ======================================================
// ======= TABLE DATA FUNCTIONS =========================
// ======================================================

function checkDueDate(row, dueDate) {
  if (!dueDate) return;
  const today = new Date();
  const dueDateTime = new Date(dueDate);
  if (isNaN(dueDateTime)) return;

  const diffDays = Math.ceil((dueDateTime - today) / (1000 * 60 * 60 * 24));
  const formattedDueDate = dueDateTime.toLocaleDateString();

  row.classList.remove("due-soon", "overdue");
  if (diffDays > 7) return;

  let status = "";
  if (diffDays < 0) {
    row.classList.add("overdue");
    status = "Overdue";
  } else {
    row.classList.add("due-soon");
    status = "To be repair";
  }

  const activity = row.cells[0].querySelector("input")?.value || "";
  const location = row.cells[5]?.querySelector("input")?.value || "";
  const jobOrder = row.cells[6]?.querySelector("input")?.value || "";

  const emailMessage =
`Subject: Friendly Reminder – Due Date for the ${activity.toUpperCase()}

Item: ${activity}
Location: ${location}
Job Order: ${jobOrder}
Status: ${status}
Due Date: ${formattedDueDate}`;

  console.log("checkDueDate:", emailMessage);
  if (emailMessage && row.dataset.lastNotification !== emailMessage) {
    row.dataset.lastNotification = emailMessage;
    showNotification(emailMessage);
    sendEmailNotification(emailMessage);
  }
}

function saveTableData() {
  const tbody = document.getElementById("tableBody");
  const data = [];
  tbody.querySelectorAll("tr").forEach((row) => {
    const rowData = [];
    row.querySelectorAll("input").forEach((input) => {
      rowData.push(input.value);
    });
    if (rowData.some(cell => cell.trim() !== "")) {
      data.push(rowData);
    }
  });
  
  if (data.length > 0) {
    localStorage.setItem("tableData", JSON.stringify(data));
  } else {
    localStorage.removeItem("tableData");
  }
  
  checkAllDueDates();
}

function addRow() {
  const tbody = document.getElementById("tableBody");
  const newRow = document.createElement("tr");

  const cellData = [
    { type: "text", placeholder: "Enter activity" },
    { type: "text", placeholder: "Enter frequency" },
    { type: "text", placeholder: "Enter worked by" },
    { type: "date", placeholder: "Last Maintenance" },
    { type: "date", placeholder: "Due Date" },
    { type: "text", placeholder: "Enter Location" },
    { type: "text", placeholder: "Enter Job Order" },
    { type: "text", placeholder: "Enter Status" }
  ];

  cellData.forEach((cell) => {
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = cell.type;
    input.placeholder = cell.placeholder;
    input.style.textAlign = "center";
    if (cell.placeholder === "Enter Location" || cell.placeholder === "Enter Status") {
      input.required = true;
    }
    input.disabled = true;
    if (cell.placeholder === "Due Date") {
      input.addEventListener("change", () => {
        checkDueDate(newRow, input.value);
        saveTableData();
      });
    } else {
      input.addEventListener("change", saveTableData);
    }
    td.appendChild(input);
    newRow.appendChild(td);
  });

  const actionTd = document.createElement("td");
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "edit-btn";
  editBtn.onclick = function () {
    const inputs = newRow.querySelectorAll("input");
    inputs.forEach(input => input.disabled = !input.disabled);
    editBtn.textContent = editBtn.textContent === "Edit" ? "Lock" : "Edit";
  };

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remove";
  removeBtn.className = "remove-btn";
  removeBtn.onclick = function () {
    newRow.remove();
    saveTableData();
  };

  actionTd.appendChild(editBtn);
  actionTd.appendChild(removeBtn);
  newRow.appendChild(actionTd);

  tbody.appendChild(newRow);
  saveTableData();
  makeRowsDraggable();
}

function loadTableData() {
  const savedData = localStorage.getItem("tableData");
  if (savedData) {
    const data = JSON.parse(savedData);
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";
    data.forEach((rowData) => {
      const newRow = document.createElement("tr");
      newRow.dataset.editing = "false";
      for (let i = 0; i < 8; i++) {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.style.textAlign = "center";
        input.type = (i === 3 || i === 4) ? "date" : "text";
        input.value = rowData[i] || "";
        input.disabled = true;
        if (i === 5 || i === 7) {
          input.required = true;
        }
        if (i === 4) {
          input.addEventListener("change", () => {
            const parsedDate = new Date(input.value);
            if (!isNaN(parsedDate)) {
              input.value = parsedDate.toISOString().slice(0, 10);
            }
            checkDueDate(newRow, input.value);
            saveTableData();
          });
        } else {
          input.addEventListener("change", saveTableData);
        }
        td.appendChild(input);
        newRow.appendChild(td);
      }
      const actionTd = document.createElement("td");
      const editBtn = document.createElement("a");
      editBtn.textContent = "Edit";
      editBtn.href = "#";
      editBtn.className = "edit-btn";
      editBtn.addEventListener("click", function (e) {
        e.preventDefault();
        const isEditing = newRow.dataset.editing === "true";
        const inputs = newRow.querySelectorAll("input");
        if (isEditing) {
          inputs.forEach(input => input.disabled = true);
          newRow.dataset.editing = "false";
          editBtn.textContent = "Edit";
        } else {
          inputs.forEach(input => input.disabled = false);
          newRow.dataset.editing = "true";
          editBtn.textContent = "Lock";
        }
      });
      actionTd.appendChild(editBtn);

      const removeBtn = document.createElement("a");
      removeBtn.textContent = "❌ Remove Row";
      removeBtn.href = "#";
      removeBtn.className = "remove-btn";
      removeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        const tbody = document.getElementById("tableBody");
        const rows = Array.from(tbody.children);
        const index = rows.indexOf(newRow);
        if (index > -1) {
          let tableData = JSON.parse(localStorage.getItem("tableData")) || [];
          tableData.splice(index, 1);
          localStorage.setItem("tableData", JSON.stringify(tableData));
          newRow.remove();
          saveTableData();
          showNotification("Row removed successfully");
        }
      });
      actionTd.appendChild(removeBtn);
      newRow.appendChild(actionTd);
      tbody.appendChild(newRow);
      checkDueDate(newRow, rowData[4]);
    });
    makeRowsDraggable();
  }
}

function checkAllDueDates() {
  const tbody = document.getElementById("tableBody");
  tbody.querySelectorAll("tr").forEach(row => {
    const dueDateInput = row.cells[4].querySelector("input");
    if (dueDateInput && dueDateInput.value) {
      checkDueDate(row, dueDateInput.value);
    }
  });
}
setInterval(checkAllDueDates, 60000);

// ======================================================
// ======= EXPORT & CLEAR FUNCTIONS =====================
// ======================================================

function exportToCSV() {
  const rows = document.querySelectorAll("table tr");
  let csv = [];
  rows.forEach(row => {
    let rowData = [];
    row.querySelectorAll("th, td").forEach(cell => {
      rowData.push('"' + cell.textContent.replace(/"/g, '""') + '"');
    });
    csv.push(rowData.join(","));
  });
  const csvString = csv.join("\n");
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", "maintenance_data.csv");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function exportToExcel() {
  const table = document.getElementById("activityTable");
  const html = table.outerHTML;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "maintenance_data.xls";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function clearTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  localStorage.removeItem("tableData");
}

// ======================================================
// ======= EXCEL DATA INSERTION FUNCTIONALITY ===========
// ======================================================

function insertTable() {
  const excelData = document.getElementById("excelData").value.trim();
  if (!excelData) {
    alert("Please paste some data first.");
    return;
  }
  const rows = excelData.split("\n");
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  rows.forEach(rowText => {
    let cells = rowText.split("\t");
    if (cells.length === 1) {
      cells = rowText.split(",");
    }
    const tr = document.createElement("tr");
    cells.forEach(cellData => {
      const td = document.createElement("td");
      td.textContent = cellData.trim();
      tr.appendChild(td);
    });
    const actionTd = document.createElement("td");
    const removeBtn = document.createElement("a");
    removeBtn.textContent = "❌ Remove Row";
    removeBtn.href = "#";
    removeBtn.className = "remove-btn";
    removeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      tr.remove();
    });
    actionTd.appendChild(removeBtn);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
  saveTableData();
  makeRowsDraggable();
}

// ======================================================
// ======= NOTIFICATION & EMAIL FUNCTIONS =============
// ======================================================

function showNotification(message) {
  console.log("showNotification called with message:", message);

  const popup = document.getElementById("notification");
  if (popup) {
    popup.textContent = message;
    popup.style.display = "block";
    setTimeout(() => {
      popup.style.display = "none";
    }, 3000);
  }
  
  // Show a push notification using the Notification API.
  showPushNotification(message);
  
  const notifList = document.getElementById("notification-list");
  if (notifList) {
    const div = document.createElement("div");
    div.className = "notification-item";
    div.textContent = message;
    const dismissBtn = document.createElement("button");
    dismissBtn.textContent = "✖";
    dismissBtn.style.border = "none";
    dismissBtn.style.background = "transparent";
    dismissBtn.style.cursor = "pointer";
    dismissBtn.onclick = function () {
      div.remove();
    };
    div.appendChild(dismissBtn);
    notifList.appendChild(div);
  }
}

function sendEmailNotification(message) {
  const role = localStorage.getItem("role");
  if (role === "admin") {
    const emailAddress = localStorage.getItem("adminEmail");
    if (!emailAddress) {
      console.error("Admin email not found in localStorage.");
      return;
    }
    console.log("Admin email retrieved:", emailAddress);
    emailjs.send("service_o5dqsd4", "template_setn93r", {
      to_email: emailAddress,
      message: message
    })
    .then(function(response) {
      console.log("Email sent successfully!", response.status, response.text);
    }, function(error) {
      console.error("Failed to send email:", error);
    });
  }
}

// ======================================================
// ======= PUSH NOTIFICATION FUNCTION ===================
// ======================================================

function showPushNotification(message) {
  if (!("Notification" in window)) {
    console.error("This browser does not support desktop notifications.");
    return;
  }
  if (Notification.permission === "granted") {
    new Notification("Maintenance Alert", {
      body: message,
      icon: "/img/notification-icon.png"
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("Maintenance Alert", {
          body: message,
          icon: "/img/notification-icon.png"
        });
      }
    });
  }
}
