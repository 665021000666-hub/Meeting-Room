ตารางผู้ใช้งาน
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user'
);

 ตารางอาคาร
CREATE TABLE buildings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

 ตารางชั้น
CREATE TABLE floors (
    id SERIAL PRIMARY KEY,
    building_id INT REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

ตารางห้องประชุม
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    floor_id INT REFERENCES floors(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

 ตารางการจองห้องประชุม
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'approve'
);

-- เพิ่มข้อมูลอาคาร
INSERT INTO buildings (name) VALUES 
('อาคารเฉลิมพระเกียรติ 80 พรรษา'),
('อาคารครีเอทีฟ');

-- เพิ่มข้อมูลชั้น
INSERT INTO floors (building_id, name) VALUES 
(1, 'ชั้น 1'),
(1, 'ชั้น 3'),
(2, 'ชั้น 9');

-- เพิ่มข้อมูลห้องประชุม
INSERT INTO rooms (floor_id, name) VALUES 
-- อาคารเฉลิมพระเกียรติ 80 พรรษา ชั้น 1
(1, 'ห้องประชุม 1'),
(1, 'ห้องประชุม 2'),
(1, 'ห้องประชุม 3'),
(1, 'ห้องประชุม 4'),
-- อาคารเฉลิมพระเกียรติ 80 พรรษา ชั้น 3
(2, 'ห้องประชุม 1'),
(2, 'ห้องประชุม 2'),
(2, 'ห้องประชุม 3'),
-- อาคารครีเอทีฟ ชั้น 9
(3, 'ห้องประชุม 1'),
(3, 'ห้องประชุม 2'),
(3, 'ห้องประชุม 3');