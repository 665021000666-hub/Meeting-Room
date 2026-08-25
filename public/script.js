

document.addEventListener("DOMContentLoaded", () => {
  const buildingSelect = document.getElementById("buildingSelect");
  const floorSelect = document.getElementById("floorSelect");
  const roomSelect = document.getElementById("roomSelect");
  const addBookingBtn = document.getElementById("addBookingBtn");
  const checkStatusBtn = document.getElementById("checkStatusBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const modal = document.getElementById("bookingModal");
  const backdrop = document.getElementById("modalBackdrop");
  const cancelBookingBtn = document.getElementById("cancelBookingBtn");
  const saveBookingBtn = document.getElementById("saveBookingBtn");

  const calendarEl = document.getElementById("calendar");
  let calendar;

  // ==============================
  // 🔹 ข้อมูลอาคาร
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

  // ==============================
  // 🔹 สร้าง dropdown อาคาร/ชั้น/ห้อง
  // ==============================
  Object.keys(buildingData).forEach(building => {
    const opt = document.createElement("option");
    opt.value = building;
    opt.textContent = building;
    buildingSelect.appendChild(opt);
  });

  buildingSelect.addEventListener("change", () => {
    floorSelect.innerHTML = '<option value="">เลือกชั้น</option>';
    roomSelect.innerHTML = '<option value="">เลือกห้องประชุม</option>';
    const selectedBuilding = buildingSelect.value;
    if (selectedBuilding) {
      Object.keys(buildingData[selectedBuilding]).forEach(floor => {
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
  // 🔹 โหลดข้อมูลการจองทั้งหมด
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
        events: events
      });
      calendar.render();
    } catch (err) {
      console.error("โหลดข้อมูลการจองล้มเหลว:", err);
      alert("ไม่สามารถโหลดข้อมูลการจองได้");
    }
  }

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
      const res = await axios.get("/api/bookings");
      const bookings = res.data;
      const now = new Date();
      const next7 = new Date();
      next7.setDate(now.getDate(0) + 7);

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

  // ==============================
  // 🔹 Modal การจอง
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
        opt1.value = t; opt1.textContent = t;
        opt2.value = t; opt2.textContent = t;
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
  // 🔹 Logout
  // ==============================
  logoutBtn.addEventListener("click", () => {
    if (confirm("ออกจากระบบหรือไม่?")) {
      window.location.href = "login.html";
    }
  });

  // ==============================
  // 🔹 โหลดข้อมูลเริ่มต้น
  // ==============================
  loadBookings();
});
