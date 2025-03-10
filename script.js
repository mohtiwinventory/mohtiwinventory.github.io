// ======================================================
// ======= LOCK / EDIT TOGGLE FUNCTIONALITY =============
// ======================================================

// By default, after inserting data the table is locked (read-only).
let isEditing = false;

// Toggle editing mode: unlock (remove disabled attribute) if in edit mode;
// lock (set disabled attribute) if not in edit mode.
function toggleEditMode() {
  const inputs = document.querySelectorAll("#tableBody input");
  isEditing = !isEditing;
  inputs.forEach(input => {
    input.disabled = !isEditing;
  });
  // Optionally update the button text:
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
    // Swap the HTML of the source row and the target row
    dragSrcRow.outerHTML = this.outerHTML;
    this.outerHTML = e.dataTransfer.getData("text/html");
    // Reinitialize event listeners after swapping rows
    makeRowsDraggable();
    // Save the new order to localStorage
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

  // Calculate difference in days between due date and today.
  const diffDays = Math.ceil((dueDateTime - today) / (1000 * 60 * 60 * 24));
  const formattedDueDate = dueDateTime.toLocaleDateString();

  // Remove previous status classes
  row.classList.remove("due-soon", "overdue");

  // Only notify if the due date is in the past or within 7 days.
  if (diffDays > 7) return;

  // Determine status based on due date
  let status = "";
  if (diffDays < 0) {
    row.classList.add("overdue");
    status = "Overdue";
  } else {
    row.classList.add("due-soon");
    status = "To be repaired";
  }

  // Get values from the row inputs.
  const activity = row.cells[0].querySelector("input")?.value || "";
  // Since we've added a new column, assume:
  // Index 0: Activity, 1: Frequency, 2: Worked by, 3: Last Maintenance, 4: Due Date, 5: Location, 6: Remarks, 7: Actions.
  const location = row.cells[5]?.querySelector("input")?.value || "";
  const remarks = row.cells[6]?.querySelector("input")?.value || "";

  // Build the formatted email message.
  const emailMessage = 
`Subject: Friendly Reminder – Due Date for the ${activity}

Item: ${activity}
Location: ${location}
Job Order: ${remarks}
Status: ${status}
Due Date: ${formattedDueDate}`;

  console.log("checkDueDate:", emailMessage);

  // Only notify if this is a new message for this row.
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
    // Save the first 6 input values (skip the Actions cell)
    row.querySelectorAll("input").forEach((input) => {
      rowData.push(input.value);
    });
    // Only add the row if at least one cell is not empty
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

    cellData.forEach((cell, index) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = cell.type;
        input.placeholder = cell.placeholder;
        input.style.textAlign = "center";
        input.disabled = true;

        // Auto-check due date when modified
        if (index === 4) {
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

    // Action Buttons
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
  makeRowsDraggable(); // Enable drag and drop on the new row
}

function loadTableData() {
  const savedData = localStorage.getItem("tableData");
  if (savedData) {
    const data = JSON.parse(savedData);
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";
    data.forEach((rowData, rIndex) => {
      const newRow = document.createElement("tr");
      // Set row editing mode to false by default
      newRow.dataset.editing = "false";
      for (let i = 0; i < 6; i++) {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.style.textAlign = "center";
        input.type = i < 3 ? "text" : "date";
        input.value = rowData[i] || "";
        // Lock inputs by default
        input.disabled = true;
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
      // ---- ACTIONS CELL: EDIT & REMOVE BUTTONS ----
      const actionTd = document.createElement("td");

      // Edit button
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

      // Remove button
      const removeBtn = document.createElement("a");
      removeBtn.textContent = "❌ Remove Row";
      removeBtn.href = "#";
      removeBtn.className = "remove-btn";
      removeBtn.addEventListener("click", function () {
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
      // ------------------------------------------------

      tbody.appendChild(newRow);
      checkDueDate(newRow, rowData[4]);
    });
    makeRowsDraggable(); // Enable drag and drop on all loaded rows
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

// Check due dates every minute
setInterval(checkAllDueDates, 60000);

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
    // Split by tab; if only one value, try comma
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
    // Add an actions cell with a remove button for inserted rows
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
  // Save the inserted data and enable drag & drop on these rows
  saveTableData();
  makeRowsDraggable();
}

// ======================================================
// ======= INITIALIZATION ===============================
// ======================================================

document.addEventListener("DOMContentLoaded", function () {
  loadTableData();
  checkAllDueDates();

  // Setup hamburger and mobile dropdown toggles
  const hamburger = document.querySelector(".hamburger");
  const navContent = document.querySelector(".nav-content");
  if (hamburger && navContent) {
    hamburger.addEventListener("click", function () {
      navContent.classList.toggle("active");
    });
  }

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

  // Add Row button event listener (if exists)
  const addRowBtn = document.getElementById("addRowBtn");
  if (addRowBtn) {
    addRowBtn.addEventListener("click", addRow);
  }

  // Initialize drag and drop on existing rows
  makeRowsDraggable();
});

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
  const notifList = document.getElementById("notification-list");
  if (notifList) {
    const div = document.createElement("div");
    div.className = "notification-item";
    div.textContent = message;
    const dismissBtn = document.createElement("button");
    dismissBtn.textContent = "✖";
    dismissBtn.onclick = function () {
      div.remove();
    };
    div.appendChild(dismissBtn);
    notifList.appendChild(div);
  }
}


// ======================================================
// ======= NOTIFICATION & EMAIL FUNCTIONS =============
// ======================================================

function showNotification(message) {
  console.log("showNotification called with message:", message);
  // Display the popup notification (assumes an element with id "notification" exists)
  const popup = document.getElementById("notification");
  if (popup) {
    popup.textContent = message;
    popup.style.display = "block";
    // Hide the popup after 3 seconds
    setTimeout(() => {
      popup.style.display = "none";
    }, 3000);
  }

  // Append the notification to the notification list (assumes an element with id "notification-list")
  const notifList = document.getElementById("notification-list");
  if (notifList) {
    // Optionally clear previous notifications:
    // notifList.innerHTML = "";
    const div = document.createElement("div");
    div.className = "notification-item";
    div.textContent = message;
    // Create a dismiss button for the notification
    const dismissBtn = document.createElement("button");
    dismissBtn.textContent = "✖";
    // Remove default button styling for a cleaner look (adjust as needed)
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
  // Check if the user is staff or admin.
  if (role === "staff" || role === "admin") {
    // Use staffEmail for staff and ownerEmail for admin.
    const emailAddress = (role === "staff")
      ? localStorage.getItem("staffEmail")
      : localStorage.getItem("ownerEmail");
    if (emailAddress) {
      emailjs.send("service_o5dqsd4", "template_setn93r", {
        to_email: emailAddress,
        message: message,
      }).then(function (response) {
        console.log("Email sent!", response.status, response.text);
      }, function (error) {
        console.error("Failed to send email:", error);
      });
    }
  }
}

// Instead of displaying the notification automatically via hover,
// add a click event listener on the notification icon/container:
document.addEventListener("DOMContentLoaded", function () {
  const notifIcon = document.querySelector(".notification-hover-container");
  const notifContainer = document.getElementById("notification-container");
  if (notifIcon && notifContainer) {
    notifIcon.addEventListener("click", function (e) {
      e.preventDefault();
      // Toggle display between block and none
      if (notifContainer.style.display === "block") {
        notifContainer.style.display = "none";
      } else {
        notifContainer.style.display = "block";
      }
    });
  }
});


// ======================================================
// ======= ADMIN-ONLY INPUT SETUP (UNCHANGED) ===========
// ======================================================

function setupAdminInput(inputId) {
  const adminEmails = ["admin@admin", "superadmin@admin", "anotheradmin@admin"];
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener("change", function () {
    const value = input.value.trim().toLowerCase();
    if (adminEmails.includes(value)) {
      console.log("Admin credentials recognized.");
      enableAdminControls();
      localStorage.setItem("role", "admin");
    } else {
      console.log("Admin credentials not recognized.");
      disableAdminControls();
    }
  });
}

function enableAdminControls() {
  const adminElements = document.querySelectorAll(".admin-only");
  adminElements.forEach(el => el.style.display = "block");
}

function disableAdminControls() {
  const adminElements = document.querySelectorAll(".admin-only");
  adminElements.forEach(el => el.style.display = "none");
}

document.addEventListener("DOMContentLoaded", function () {
  setupAdminInput("adminCode");
});

document.addEventListener("DOMContentLoaded", function () {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.clear();
      alert("You have been logged out.");
      window.location.href = "/login.html";
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const role = localStorage.getItem("role");
  
  if (role === "staff" || role === "student") {
      const maintenanceLink = document.getElementById("maintenanceLink");
      if (maintenanceLink) {
          maintenanceLink.remove(); // Removes the maintenance tab for staff and students
      }
  }
});


document.addEventListener("DOMContentLoaded", function () {
  const role = localStorage.getItem("role");
  if (role === "student") {
    const homeLink = document.getElementById("homeLink");
    if (homeLink) {
      homeLink.querySelector("a").href = "/Student.html";
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const role = localStorage.getItem("role");
  if (role === "admin") {
    const homeLink = document.getElementById("homeLink");
    if (homeLink) {
      homeLink.querySelector("a").href = "/owner.html";
    }
  }
});
