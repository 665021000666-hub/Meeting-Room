document.addEventListener("DOMContentLoaded", () => {
  const calendarEl = document.getElementById("calendar");
  let calendar;

  const buildingSelect = document.getElementById("buildingSelect");
  const floorSelect = document.getElementById("floorSelect");
  const roomSelect = document.getElementById("roomSelect");
  const addBookingBtn = document.getElementById("addBookingBtn");
  const checkStatusBtn = document.getElementById("checkStatusBtn");
  const manageBookingsBtn = document.getElementById("manageBookingsBtn");

  const modal = document.getElementById("bookingModal");
  const backdrop = document.getElementById("modalBackdrop");
  const cancelBookingBtn = document.getElementById("cancelBookingBtn");
  const saveBookingBtn = document.getElementById("saveBookingBtn");

  const manageModal = document.getElementById("manageModal");
  const closeManageBtn = document.getElementById("closeManageBtn");
  const bookingsTable = document.getElementById("bookingsTable").querySelector("tbody");

  const approveBookingsBtn = document.getElementById("approveBookingsBtn");

  // ===== Modal แก้ไขเวลา (Dropdown 24 ชั่วโมง) =====
  const editModal = document.createElement("div");
  editModal.classList.add("modal");
  editModal.style.display = "none";
  editModal.innerHTML = `
    <div class="modal-content">
      <h3>🕒 แก้ไขเวลาการจอง</h3>

      <label>วันที่เริ่มต้น:</label>
      <input type="date" id="editStartDate">

      <label>เวลาเริ่มต้น:</label>
      <select id="editStartTime"></select>

      <label>วันที่สิ้นสุด:</label>
      <input type="date" id="editEndDate">

      <label>เวลาสิ้นสุด:</label>
      <select id="editEndTime"></select>

      <div style="margin-top: 10px; text-align: right;">
        <button id="saveEditBtn" class="btn btn-green">บันทึก</button>
        <button id="cancelEditBtn" class="btn btn-danger">ยกเลิก</button>
      </div>
    </div>
  `;
  document.body.appendChild(editModal);
  const saveEditBtn = editModal.querySelector("#saveEditBtn");
  const cancelEditBtn = editModal.querySelector("#cancelEditBtn");
  let currentEditId = null;

  function populateEditTimeOptions() {
    const startSelect = document.getElementById("editStartTime");
    const endSelect = document.getElementById("editEndTime");
    startSelect.innerHTML = "";
    endSelect.innerHTML = "";
    for (let h = 8; h <= 16; h++) {
      for (let m = 0; m < 60; m += 30) {
        const t = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const opt1 = document.createElement("option");
        const opt2 = document.createElement("option");
        opt1.value = t;
        opt1.textContent = t;
        opt2.value = t;
        opt2.textContent = t;
        startSelect.appendChild(opt1);
        endSelect.appendChild(opt2);
      }
    }
  }

  // ==============================
  // 🔹 สร้าง Dropdown อาคาร / ชั้น / ห้อง
  // ==============================
  const buildingData = {
    "อาคารเฉลิมพระเกียรติ 80 พรรษา": {
      "ชั้น 1": ["ห้องประชุม 1", "ห้องประชุม 2", "ห้องประชุม 3", "ห้องประชุม 4"],
      "ชั้น 3": ["ห้องประชุม 1", "ห้องประชุม 2", "ห้องประชุม 3"]
    },
    "อาคารครีเอทีฟ": {
      "ชั้น 9": ["ห้องประชุม 1", "ห้องประชุม 2", "ห้องประชุม 3"]
    }
  };

  Object.keys(buildingData).forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    buildingSelect.appendChild(opt);
  });

  buildingSelect.addEventListener("change", () => {
    floorSelect.innerHTML = '<option value="">เลือกชั้น</option>';
    roomSelect.innerHTML = '<option value="">เลือกห้องประชุม</option>';
    if (buildingSelect.value) {
      Object.keys(buildingData[buildingSelect.value]).forEach(floor => {
        const opt = document.createElement("option");
        opt.value = floor;
        opt.textContent = floor;
        floorSelect.appendChild(opt);
      });
    }
  });

  floorSelect.addEventListener("change", () => {
    roomSelect.innerHTML = '<option value="">เลือกห้องประชุม</option>';
    const b = buildingSelect.value;
    const f = floorSelect.value;
    if (b && f) {
      buildingData[b][f].forEach(r => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        roomSelect.appendChild(opt);
      });
    }
  });

  // ==============================
  // 🔹 โหลดข้อมูลทั้งหมด
  // ==============================
  async function loadBookings() {
    try {
      const res = await axios.get("/api/bookings");
      const bookings = res.data;

      const events = bookings.map(b => {
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        const startH = start.getHours().toString().padStart(2, "0");
        const endH = end.getHours().toString().padStart(2, "0");
        return {
          title: `${startH}-${endH} ${b.room_name}`,
          start: b.start_time,
          end: b.end_time
        };
      });

      if (calendar) calendar.destroy();
      calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "th",
        height: 650,
        events: events,
        displayEventTime: true,
        eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false }
      });
      calendar.render();
    } catch (err) {
      console.error("โหลดข้อมูลการจองล้มเหลว:", err);
      alert("ไม่สามารถโหลดข้อมูลการจองได้");
    }
  }

  // ==============================
  // 🔹 จองห้องประชุม
  // ==============================
  function populateTimeOptions() {
    const startSelect = document.getElementById("startTime");
    const endSelect = document.getElementById("endTime");
    startSelect.innerHTML = "";
    endSelect.innerHTML = "";
    for (let h = 8; h <= 16; h++) {
      for (let m = 0; m < 60; m += 30) {
        const t = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const opt1 = document.createElement("option");
        const opt2 = document.createElement("option");
        opt1.value = t;
        opt1.textContent = t;
        opt2.value = t;
        opt2.textContent = t;
        startSelect.appendChild(opt1);
        endSelect.appendChild(opt2);
      }
    }
  }

  addBookingBtn.addEventListener("click", () => {
    populateTimeOptions();
    modal.style.display = "block";
    backdrop.style.display = "block";
  });

  cancelBookingBtn.addEventListener("click", () => {
    modal.style.display = "none";
    backdrop.style.display = "none";
  });

  saveBookingBtn.addEventListener("click", async () => {
    const building = buildingSelect.value;
    const floor = floorSelect.value;
    const room = roomSelect.value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    if (!building || !floor || !room || !startDate || !endDate || !startTime || !endTime) {
      alert("⚠️ กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    const start = `${startDate}T${startTime}:00`;
    const end = `${endDate}T${endTime}:00`;

    try {
      const res = await axios.post("/api/bookings", {
        building,
        floor,
        room,
        start_time: start,
        end_time: end
      });
      alert(res.data.message);
      modal.style.display = "none";
      backdrop.style.display = "none";
      loadBookings();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการจอง");
    }
  });

  // ==============================
  // 🔹 จัดการการจอง (แก้ไข + ลบ)
  // ==============================
  manageBookingsBtn.addEventListener("click", async () => {
    try {
      const res = await axios.get("/api/bookings");
      const bookings = res.data;

      bookingsTable.innerHTML = "";
      bookings.forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${b.id}</td>
          <td>${b.building_name}</td>
          <td>${b.floor_name}</td>
          <td>${b.room_name}</td>
          <td>${new Date(b.start_time).toLocaleString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          })}</td>
          <td>${new Date(b.end_time).toLocaleString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          })}</td>
          <td>
            <button class="btn btn-blue edit" data-id="${b.id}">แก้ไข</button>
            <button class="btn btn-danger delete" data-id="${b.id}">ลบ</button>
          </td>
        `;
        bookingsTable.appendChild(tr);
      });

      manageModal.style.display = "block";
      backdrop.style.display = "block";
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถโหลดข้อมูลการจองได้");
    }
  });

  closeManageBtn.addEventListener("click", () => {
    manageModal.style.display = "none";
    backdrop.style.display = "none";
  });

  // 🔹 ปุ่มแก้ไข / ลบ
  bookingsTable.addEventListener("click", async e => {
    if (e.target.classList.contains("delete")) {
      const id = e.target.dataset.id;
      if (confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) {
        try {
          await axios.delete(`/api/admin/bookings/${id}`);
          alert("✅ ลบสำเร็จ");
          manageModal.style.display = "none";
          backdrop.style.display = "none";
          loadBookings();
        } catch (err) {
          console.error(err);
          alert("ไม่สามารถลบรายการได้");
        }
      }
    }

    if (e.target.classList.contains("edit")) {
      currentEditId = e.target.dataset.id;
      populateEditTimeOptions();
      editModal.style.display = "block";
      backdrop.style.display = "block";
    }
  });

  // 🔹 บันทึกการแก้ไข
  saveEditBtn.addEventListener("click", async () => {
    const startDate = document.getElementById("editStartDate").value;
    const startTime = document.getElementById("editStartTime").value;
    const endDate = document.getElementById("editEndDate").value;
    const endTime = document.getElementById("editEndTime").value;

    if (!startDate || !startTime || !endDate || !endTime) {
      alert("⚠️ กรุณาเลือกวันและเวลาให้ครบ");
      return;
    }

    const start = `${startDate}T${startTime}:00`;
    const end = `${endDate}T${endTime}:00`;

    try {
      await axios.put(`/api/admin/bookings/${currentEditId}`, {
        start_time: start,
        end_time: end
      });
      alert("✅ แก้ไขข้อมูลสำเร็จ");
      editModal.style.display = "none";
      manageModal.style.display = "none";
      backdrop.style.display = "none";
      loadBookings();
    } catch (err) {
      console.error(err);
      alert("❌ แก้ไขไม่สำเร็จ");
    }
  });

  cancelEditBtn.addEventListener("click", () => {
    editModal.style.display = "none";
    backdrop.style.display = "none";
  });

  // ==============================
  // 🔹  หน้าต่างอนุมัติการจอง
  // ==============================

  approveBookingsBtn.addEventListener("click", async () => {
    try {
      const res = await axios.get("/api/approve");
      const bookings = res.data;

      bookingsTable.innerHTML = "";
      bookings.forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${b.id}</td>
          <td>${b.building_name}</td>
          <td>${b.floor_name}</td>
          <td>${b.room_name}</td>
          <td>${new Date(b.start_time).toLocaleString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          })}</td>
          <td>${new Date(b.end_time).toLocaleString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          })}</td>
          <td>
            <button class="btn btn-blue approve" data-id="${b.id}">อนุมัติ</button>
            <button class="btn btn-danger approve-not" data-id="${b.id}">ไม่อนุมัติ</button>
          </td>
        `;
        bookingsTable.appendChild(tr);
      });

      manageModal.style.display = "block";
      backdrop.style.display = "block";
    } catch (err) {
      console.error(err.message);
      alert("ไม่สามารถโหลดข้อมูลการจองได้");
    }
  });

  // 🔹 ปุ่มอนุมัติ / ไม่อนุมัติ
  bookingsTable.addEventListener("click", async e => {
    if (e.target.classList.contains("approve")) {
      const id = e.target.dataset.id;
      if (confirm("ต้องการอนุมัติรายการจองนี้ใช่หรือไม่?")) {
        try {
          await axios(`/api/admin/approve/${id}`);
          alert("✅ อนุมัติสำเร็จ");
          manageModal.style.display = "none";
          backdrop.style.display = "none";
          loadBookings();
        } catch (err) {
          console.error(err);
          alert("ไม่สามารถอนุมติรายการได้");
        }
      }
    }

    if (e.target.classList.contains("approve-not")) {
      const id = e.target.dataset.id;
      if (confirm("ต้องการไม่อนุมัติรายการจองนี้ใช่หรือไม่?")) {
        try {
          await axios(`/api/admin/approve-not/${id}`);
          alert("✅ ไม่อนุมัติสำเร็จ");
          manageModal.style.display = "none";
          backdrop.style.display = "none";
          loadBookings();
        } catch (err) {
          console.error(err);
          alert("ไม่สามารถไม่อนุมติรายการได้");
        }
      }
    }
  });

  // ==============================
  // 🔹 ตรวจสอบสถานะห้อง (7 วันข้างหน้า)
  // ==============================
  checkStatusBtn.addEventListener("click", async () => {
    const building = buildingSelect.value;
    const floor = floorSelect.value;
    const room = roomSelect.value;
    if (!building || !floor || !room) {
      alert("⚠️ กรุณาเลือกอาคาร ชั้น และห้องประชุมให้ครบ");
      return;
    }

    try {
      const res = await axios.get("/api/bookings  ");
      const bookings = res.data;
      const now = new Date();
      const next7 = new Date();
      next7.setDate(now.getDate() + 7);

      const filtered = bookings.filter(b =>
        b.building_name === building &&
        b.floor_name === floor &&
        b.room_name === room &&
        new Date(b.start_time) >= now &&
        new Date(b.start_time) <= next7
      );

      if (filtered.length === 0) {
        alert("✅ ไม่มีการจองใน 7 วันข้างหน้า");
      } else {
        let msg = `📅 การจองของ ${room} ใน 7 วันข้างหน้า:\n\n`;
        filtered.forEach(f => {
          msg += `- ${new Date(f.start_time).toLocaleString("th-TH")} ถึง ${new Date(f.end_time).toLocaleString("th-TH")}\n`;
        });
        alert(msg);
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถตรวจสอบสถานะห้องได้");
    }
  });


  // 🔹 Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    if (confirm("ออกจากระบบหรือไม่?")) {
      window.location.href = "login.html";
    }
  });

  loadBookings();
});
