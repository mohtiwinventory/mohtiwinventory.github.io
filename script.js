// Firebase App + Firestore modular imports via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, getDoc, updateDoc } 
  from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Your web app's Firebase configuration (as you provided)
const firebaseConfig = {
  apiKey: "AIzaSyA6dDhSyaRxBnv9cIRaI9-M3ocxANHm62s",
  authDomain: "mohtiw-web.firebaseapp.com",
  projectId: "mohtiw-web",
  storageBucket: "mohtiw-web.firebasestorage.app",
  messagingSenderId: "188249513580",
  appId: "1:188249513580:web:8a7a5e002c3a19c1058249",
  measurementId: "G-EX4JBWFTEM"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);


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
  // setupAdminInput("adminCode");

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

function addNewRoomButton() {
  // Prompt the user for the new room's details.
  let roomName = prompt("Enter the room name:");
  if (!roomName) return;
  
  let roomLink = prompt("Enter the room link (URL):");
  if (!roomLink) return;
  
  let floorInput = prompt("Enter the floor (ground, second, third):");
  if (!floorInput) return;
  floorInput = floorInput.trim().toLowerCase();
  
  // Determine the full heading text based on input.
  let floorHeadingText = "";
  if (floorInput === "ground") {
    floorHeadingText = "MM GROUND FLOOR";
  } else if (floorInput === "second") {
    floorHeadingText = "MM SECOND FLOOR";
  } else if (floorInput === "third") {
    floorHeadingText = "MM THIRD FLOOR";
  } else {
    alert("Invalid floor entered. Please enter 'ground', 'second', or 'third'.");
    return;
  }
  
  // Create a new button element (styled as you need it).
  const newButton = document.createElement("button");
  newButton.textContent = roomName;
  newButton.onclick = function() {
    window.location.href = roomLink;
  };
  newButton.className = "room-button"; // Add a class if you want to style it via CSS.
  
  // Find the container that holds the floor sections.
  const mmContent = document.querySelector(".mm-content");
  if (!mmContent) {
    alert("MM content container not found.");
    return;
  }
  
  // Look for the floor heading that matches our floor.
  let targetHeading = null;
  const headings = mmContent.querySelectorAll("h2");
  headings.forEach(heading => {
    if (heading.textContent.trim().toUpperCase() === floorHeadingText.toUpperCase()) {
      targetHeading = heading;
    }
  });
  
  if (!targetHeading) {
    alert("Could not find the specified floor section.");
    return;
  }
  
  // Insert the new button after the target floor heading.
  // If there are existing buttons immediately after the heading,
  // this code will append the new button after them.
  let insertAfterElem = targetHeading;
  let nextElem = targetHeading.nextElementSibling;
  while (nextElem && nextElem.tagName === "BUTTON") {
    insertAfterElem = nextElem;
    nextElem = nextElem.nextElementSibling;
  }
  insertAfterElem.insertAdjacentElement("afterend", newButton);
  
  alert("New room button added successfully!");
}


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
  if (!tbody) {
    console.error("Table body not found");
    return;
  }
  const newRow = document.createElement("tr");
  newRow.dataset.editing = "false";
  
  // Define the 8 columns with types and placeholders
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
  
  // Create each cell with an input element
  cellData.forEach(cell => {
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = cell.type;
    input.placeholder = cell.placeholder;
    input.style.textAlign = "center";
    if (cell.placeholder === "Enter Location" || cell.placeholder === "Enter Status") {
      input.required = true;
    }
    input.disabled = true; // Start disabled
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
  
  // Create the Actions cell
  const actionTd = document.createElement("td");
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "edit-btn";
  editBtn.onclick = function () {
    const inputs = newRow.querySelectorAll("input");
    inputs.forEach(input => {
      input.disabled = !input.disabled;
    });
    editBtn.textContent = (editBtn.textContent === "Edit") ? "Lock" : "Edit";
  };
  actionTd.appendChild(editBtn);
  
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remove";
  removeBtn.className = "remove-btn";
  removeBtn.onclick = function () {
    if (confirm("Are you sure you want to remove this row?")) {
      addDeletedRowHistory(newRow);
      newRow.remove();
      saveTableData();
      showNotification("Row removed successfully");
    }
  };
  actionTd.appendChild(removeBtn);
  newRow.appendChild(actionTd);
  
  tbody.appendChild(newRow);
  saveTableData();
  makeRowsDraggable();
}

// Expose addRow to the global scope so inline onclick handlers can find it.
window.addRow = addRow;


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

      // ---- Modified Remove Button in loadTableData ----
      const removeBtn = document.createElement("a");
      removeBtn.textContent = "❌ Remove Row";
      removeBtn.href = "#";
      removeBtn.className = "remove-btn";
      removeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (confirm("Are you sure you want to remove this row?")) {
          const tbody = document.getElementById("tableBody");
          const rows = Array.from(tbody.children);
          const index = rows.indexOf(newRow);
          if (index > -1) {
            let tableData = JSON.parse(localStorage.getItem("tableData")) || [];
            tableData.splice(index, 1);
            localStorage.setItem("tableData", JSON.stringify(tableData));
            addDeletedRowHistory(newRow); // Save deleted row data
            newRow.remove();
            saveTableData();
            showNotification("Row removed successfully");
          }
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
  if (!tbody) return; // 💡 Skip if not on maintenance page
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
    // ---- Modified Remove Button in insertTable ----
    const removeBtn = document.createElement("a");
    removeBtn.textContent = "❌ Remove Row";
    removeBtn.href = "#";
    removeBtn.className = "remove-btn";
    removeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (confirm("Are you sure you want to remove this row?")) {
        addDeletedRowHistory(tr); // Save deleted row data
        tr.remove();
      }
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
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.clear();  // Clears all user data
      alert("You have been logged out.");
      window.location.href = "/login.html";  // Redirect to login page
    });
  }
}

// Run the function when the page loads
document.addEventListener("DOMContentLoaded", setupLogoutButton);

document.addEventListener("DOMContentLoaded", function () {
  const openModal = document.getElementById("openReportModal");
  const closeModal = document.getElementById("closeReportModal");
  const modal = document.getElementById("reportModal");

  if (openModal && closeModal && modal) {
    openModal.addEventListener("click", () => {
      modal.style.display = "block";
    });

    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }
});


// Initialize EmailJS
emailjs.init("DnwwPqkATU2LJzBVY");

// Modal logic
document.addEventListener("DOMContentLoaded", function () {
  const openModal = document.getElementById("openReportModal");
  const closeModal = document.getElementById("closeReportModal");
  const modal = document.getElementById("reportModal");
  const form = document.getElementById("issueReportForm");

  if (openModal && closeModal && modal) {
    openModal.addEventListener("click", () => {
      modal.style.display = "block";
    });

    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  // Handle form submission
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const report = {
      name: document.getElementById("reporterName").value,
      role: document.getElementById("reporterRole").value,
      item: document.getElementById("itemName").value,
      location: document.getElementById("itemLocation").value,
      status: "Pending", // Always start with Pending
      issuedescription: document.getElementById("issueDescription").value,
      date: new Date().toLocaleString(),
      };



      // Save to Firestore instead of localStorage
      try {
        await addDoc(collection(db, "reports"), report);
        console.log("Report saved to Firestore");
      } catch (err) {
        console.error("Firestore error:", err);
        alert("Failed to save report – please try again.");
        return;    // abort email/send if save fails
      }


      // Format message
      const emailMessage =
`New Damage Report Submitted:

Object: ${report.item}
Location: ${report.location}
Status: ${report.status}
Issue Description: ${report.issuedescription}
Date: ${report.date}

Reported by: ${report.name} (${report.role})`;

      // Send via EmailJS
      emailjs.send("service_o5dqsd4", "template_setn93r", {
  message: emailMessage,
  to_email: "mohtiwinventory@gmail.com"
})
.then(function(response) {
  console.log("✅ EmailJS sent:", response.status, response.text);
  alert("Report submitted and emailed to admin!");
  modal.style.display = "none";
  form.reset();
}, function(error) {
  console.error("❌ EmailJS error:", error);
  alert("Failed to send email. Check console for details.");
});

    });
  }
});

// Admin Report Management //
const reportsTbody = document.querySelector("#reportsTable tbody");
const userRole = localStorage.getItem("role"); // 'admin' or 'student' or 'staff'

const q = query(collection(db, "reports"), orderBy("date", "desc"));

onSnapshot(q, snapshot => {
  reportsTbody.innerHTML = "";
  // inside onSnapshot
snapshot.forEach(docSnap => {
  const report = docSnap.data();
  const status = report.status || "Pending";
  const isAdmin = userRole === "admin";
  const tr = document.createElement("tr");

  let actionsHTML = "";

  if (isAdmin) {
    actionsHTML = `
      <select class="status-dropdown" data-id="${docSnap.id}">
        <option value="Pending" ${status === "Pending" ? "selected" : ""}>Pending</option>
        <option value="In Progress" ${status === "In Progress" ? "selected" : ""}>In Progress</option>
        <option value="Resolved" ${status === "Resolved" ? "selected" : ""}>Resolved</option>
      </select>
    `;
  } else {
    let color = {
      "Pending": "red",
      "In Progress": "orange",
      "Resolved": "green"
    }[status] || "gray";

    actionsHTML = `<span style="color: ${color}; font-weight: bold;">${status}</span>`;
  }

  tr.innerHTML = `
    <td>${report.name}</td>
    <td>${report.role}</td>
    <td>${report.item}</td>
    <td>${report.location}</td>
    <td>${status}</td>
    <td>${new Date(report.date).toLocaleString()}</td>
    <td>${report.issuedecription}</td>
    <td class="actions">${actionsHTML}</td>
  `;

  reportsTbody.appendChild(tr);
});
});


// Action buttons
// Listen to changes in dropdown (admin only)
reportsTbody.addEventListener("change", async (e) => {
  if (e.target.classList.contains("status-dropdown")) {
    const newStatus = e.target.value;
    const id = e.target.dataset.id;

    if (!id) return;

    const docRef = doc(db, "reports", id);
    if (newStatus === "Resolved") {
      const reportSnap = await getDoc(docRef);
      const reportData = reportSnap.data();
      await addDoc(collection(db, "resolvedReports"), { ...reportData, status: "Resolved" });
      await deleteDoc(docRef);
      alert("Marked as resolved and moved to archive.");
    } else {
      await updateDoc(docRef, { status: newStatus });
    }
  }
});

// Fetch & Render Resolved Reports
const resolvedModal = document.getElementById("resolvedModal");
const resolvedBody = document.getElementById("resolvedReportsBody");

document.getElementById("openResolvedModal").onclick = () => {
  resolvedModal.style.display = "block";
  fetchResolvedReports();
};

document.getElementById("closeResolvedModal").onclick = () => {
  resolvedModal.style.display = "none";
};

window.onclick = function(event) {
  if (event.target === resolvedModal) {
    resolvedModal.style.display = "none";
  }
};

async function fetchResolvedReports() {
  resolvedBody.innerHTML = "";
  const q = query(collection(db, "resolvedReports"), orderBy("date", "desc"));
  onSnapshot(q, (snapshot) => {
    resolvedBody.innerHTML = "";
    snapshot.forEach(doc => {
      const r = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${r.name}</td>
        <td>${r.role}</td>
        <td>${r.item}</td>
        <td>${r.location}</td>
        <td>${r.status}</td>
        <td>${new Date(r.date).toLocaleString()}</td>
        <td>${r.issuedecription}</td>
      `;
      resolvedBody.appendChild(row);
    });
  });
}

console.log(localStorage.getItem("role")); // should be "admin", "staff", or "student"

