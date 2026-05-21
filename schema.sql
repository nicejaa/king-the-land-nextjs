CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'PROJECT_MANAGER',
  'SITE_ENGINEER',
  'CONTRACTOR',
  'CRAFTSMAN',
  'OWNER'
);

CREATE TYPE project_status AS ENUM (
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE contract_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'TERMINATED'
);

CREATE TYPE task_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED'
);

CREATE TYPE defect_status AS ENUM (
  'OPEN',
  'ASSIGNED',
  'FIXING',
  'VERIFYING',
  'CLOSED',
  'REJECTED'
);

CREATE TYPE po_status AS ENUM (
  'DRAFT',
  'APPROVED',
  'ORDERED',
  'DELIVERED',
  'PAID',
  'CANCELLED'
);


CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,

  first_name VARCHAR(100),
  last_name VARCHAR(100),

  phone VARCHAR(30),

  role user_role NOT NULL,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(255) NOT NULL,
  description TEXT,

  budget NUMERIC(15,2),

  start_date DATE,
  end_date DATE,

  status project_status DEFAULT 'PLANNING',

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  parent_id UUID REFERENCES project_locations(id),

  name VARCHAR(255) NOT NULL,

  location_type VARCHAR(50) NOT NULL,
  -- ZONE / BUILDING / FLOOR / ROOM

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  role user_role NOT NULL,

  joined_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, user_id)
);

CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  company_name VARCHAR(255) NOT NULL,

  contact_name VARCHAR(255),

  phone VARCHAR(50),
  email VARCHAR(255),

  address TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id),

  contractor_id UUID REFERENCES contractors(id),

  contract_no VARCHAR(100),

  title VARCHAR(255),

  contract_value NUMERIC(15,2),

  start_date DATE,
  end_date DATE,

  penalty_per_day NUMERIC(15,2),

  status contract_status DEFAULT 'DRAFT',

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,

  title VARCHAR(255),

  amount NUMERIC(15,2),

  due_date DATE,

  paid_amount NUMERIC(15,2) DEFAULT 0,

  status VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE work_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id),

  contract_id UUID REFERENCES contracts(id),

  location_id UUID REFERENCES project_locations(id),

  title VARCHAR(255) NOT NULL,
  description TEXT,

  budget_cost NUMERIC(15,2),

  actual_cost NUMERIC(15,2) DEFAULT 0,

  planned_start DATE,
  planned_end DATE,

  actual_start DATE,
  actual_end DATE,

  progress_percent NUMERIC(5,2) DEFAULT 0,

  status task_status DEFAULT 'PENDING',

  assigned_to UUID REFERENCES users(id),

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE work_task_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  work_task_id UUID REFERENCES work_tasks(id) ON DELETE CASCADE,

  progress_percent NUMERIC(5,2),

  note TEXT,

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id),

  work_task_id UUID REFERENCES work_tasks(id),

  log_date DATE NOT NULL,

  weather VARCHAR(100),

  manpower_count INTEGER,

  note TEXT,

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  module_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,

  file_url TEXT NOT NULL,

  file_type VARCHAR(50),

  uploaded_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  work_task_id UUID REFERENCES work_tasks(id),

  inspected_by UUID REFERENCES users(id),

  inspection_date DATE,

  passed BOOLEAN,

  remark TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id),

  work_task_id UUID REFERENCES work_tasks(id),

  location_id UUID REFERENCES project_locations(id),

  title VARCHAR(255),

  description TEXT,

  severity VARCHAR(50),

  status defect_status DEFAULT 'OPEN',

  assigned_to UUID REFERENCES users(id),

  due_date DATE,

  fixed_at TIMESTAMP,

  verified_at TIMESTAMP,

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE defect_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  defect_id UUID REFERENCES defects(id) ON DELETE CASCADE,

  verified_by UUID REFERENCES users(id),

  action VARCHAR(50),
  -- ACCEPT / REJECT

  note TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id),

  requested_by UUID REFERENCES users(id),

  title VARCHAR(255),

  status VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  purchase_request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE,

  item_name VARCHAR(255),

  qty NUMERIC(10,2),

  unit VARCHAR(50),

  estimated_price NUMERIC(15,2)
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id),

  supplier_name VARCHAR(255),

  po_no VARCHAR(100),

  status po_status DEFAULT 'DRAFT',

  total_amount NUMERIC(15,2),

  approved_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  purchase_order_id UUID REFERENCES purchase_orders(id),

  received_by UUID REFERENCES users(id),

  received_date DATE,

  note TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id),

  title VARCHAR(255),
  message TEXT,

  is_read BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id),

  title VARCHAR(255),
  message TEXT,

  is_read BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_work_tasks_project
ON work_tasks(project_id);

CREATE INDEX idx_work_tasks_status
ON work_tasks(status);

CREATE INDEX idx_defects_status
ON defects(status);

CREATE INDEX idx_daily_logs_date
ON daily_logs(log_date);

CREATE INDEX idx_attachments_module
ON attachments(module_name, record_id);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id),

  module_name VARCHAR(100),

  action VARCHAR(50),

  record_id UUID,

  old_data JSONB,
  new_data JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  description TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,

  description TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(module, action)
);

CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,

  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,

  PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,

  project_id UUID REFERENCES projects(id),

  PRIMARY KEY(user_id, role_id, project_id)
);

-- ========================================
-- ROLE DESIGN (สำคัญ)
-- SUPER_ADMIN
-- ทุกอย่าง
-- PROJECT_MANAGER
-- - create project
-- - approve PR
-- - approve contract
-- - view reports
-- SITE_ENGINEER
-- - daily log
-- - inspection
-- - defect verify
-- - update progress
-- CONTRACTOR
-- - ดู task ของตัวเอง
-- - อัปโหลดงาน
-- - update progress
-- CRAFTSMAN
-- - ดู defect assigned
-- - upload fix photo
-- OWNER
-- - read only dashboard

-- สรุปโครงสร้างจริง
-- users
-- project_members

-- projects
-- project_locations

-- contractors
-- contracts
-- payment_milestones

-- work_tasks
-- work_task_progress_logs

-- daily_logs
-- attachments

-- inspections
-- defects
-- defect_verifications

-- purchase_requests
-- purchase_request_items
-- purchase_orders
-- goods_receipts

-- notifications
-- audit_logs

-- 1) users

-- เก็บ “ผู้ใช้งานทั้งหมด” ของระบบ

-- users
-- ใช้ทำอะไร
-- login
-- auth
-- เก็บ profile
-- แยก role
-- อ้างอิงว่าใครเป็นคนสร้าง/แก้ไขข้อมูล
-- ตัวอย่างข้อมูล
-- id	name	role
-- U1	Admin	SUPER_ADMIN
-- U2	Somchai	PROJECT_MANAGER
-- U3	Eng A	SITE_ENGINEER
-- U4	ABC Contractor	CONTRACTOR
-- column สำคัญ
-- field	meaning
-- email	login
-- password_hash	รหัสผ่านเข้ารหัส
-- role	สิทธิ์หลัก
-- is_active	ปิด user ได้
-- relation
-- users
--  ├── projects.created_by
--  ├── work_tasks.assigned_to
--  ├── defects.assigned_to
--  ├── daily_logs.created_by
--  └── notifications.user_id
-- 2) project_members

-- User 1 คนอาจอยู่หลาย Project ได้

-- project_members
-- ทำไมต้องมี

-- เพราะ:

-- Somchai
-- - เป็น PM Project A
-- - เป็น Site Engineer Project B

-- role จึงไม่ควร fix แค่ใน users

-- ตัวอย่าง
-- user	project	role
-- Somchai	Condo A	PM
-- Somchai	Villa B	ENGINEER
-- relation
-- projects <-- project_members --> users

-- เป็น Many-to-Many

-- 3) projects

-- เก็บ “โครงการ”

-- projects
-- เช่น
-- หมู่บ้าน A
-- Condo พระราม 9
-- Warehouse บางนา
-- field สำคัญ
-- field	meaning
-- budget	งบรวม
-- start_date	วันเริ่ม
-- end_date	วันจบ
-- status	สถานะโครงการ
-- relation
-- projects
--  ├── project_locations
--  ├── contracts
--  ├── work_tasks
--  ├── defects
--  ├── purchase_orders
--  └── daily_logs
-- 4) project_locations

-- สำคัญมาก

-- ใช้เก็บ “ตำแหน่งงาน”

-- project_locations
-- แนวคิด

-- ใช้เป็น Tree Structure

-- Zone A
--  └── Villa 1
--       └── Floor 2
--            └── Room 201
-- ทำไมไม่แยก table

-- เช่น:

-- zones
-- buildings
-- floors
-- rooms

-- เพราะจะ:

-- query ยาก
-- flexible น้อย
-- รองรับโครงสร้างใหม่ยาก
-- field สำคัญ
-- field	meaning
-- parent_id	location แม่
-- location_type	ZONE/FLOOR/ROOM
-- name	ชื่อ
-- ใช้กับอะไร
-- - Work Task
-- - Defect
-- - Inspection
-- - Daily Log
-- 5) contractors

-- เก็บข้อมูลผู้รับเหมา

-- contractors
-- ตัวอย่าง
-- company
-- ABC Electric
-- XYZ Plumbing
-- ทำไมไม่ใช้ users อย่างเดียว

-- เพราะ contractor คือ “บริษัท”

-- แต่ users คือ “คน”

-- บริษัทหนึ่งอาจมีหลาย user

-- relation
-- contractors
--  └── contracts
-- 6) contracts

-- เก็บ “สัญญาจ้าง”

-- contracts
-- ใช้ทำอะไร
-- วงเงิน
-- ระยะเวลา
-- penalty
-- ผู้รับเหมา
-- งวดงาน
-- ตัวอย่าง
-- งานระบบไฟฟ้า
-- วงเงิน 2,000,000
-- เริ่ม 1 ม.ค.
-- จบ 30 มิ.ย.
-- relation
-- projects
--  └── contracts
--       └── payment_milestones
-- 7) payment_milestones

-- งวดงาน

-- payment_milestones
-- ตัวอย่าง
-- title	amount
-- งานเดินท่อ	500,000
-- ติดตั้งตู้ MDB	300,000
-- ใช้ทำอะไร
-- เบิกงวด
-- track payment
-- คำนวณค้างจ่าย
-- 8) work_tasks

-- หัวใจหลักของระบบ

-- work_tasks
-- คืออะไร

-- Task งานก่อสร้าง

-- เช่น

-- - เทพื้นชั้น 2
-- - เดินท่อไฟ
-- - ติดกระเบื้อง
-- relation
-- project
-- contract
-- location
-- assigned_to
-- field สำคัญ
-- field	meaning
-- planned_start/end	แผน
-- actual_start/end	จริง
-- progress_percent	ความคืบหน้า
-- budget_cost	งบ
-- actual_cost	ใช้จริง
-- ใช้ทำ Dashboard

-- เช่น:

-- - งานล่าช้า
-- - งานเกิน budget
-- - % project progress
-- 9) work_task_progress_logs

-- เก็บประวัติ progress

-- work_task_progress_logs
-- ทำไมต้องแยก

-- ถ้า update ตรงใน work_tasks อย่างเดียว

-- จะไม่รู้ว่า:

-- ใคร update
-- update เมื่อไหร่
-- progress เปลี่ยนยังไง
-- ตัวอย่าง
-- date	progress
-- 1 Jan	10%
-- 5 Jan	40%
-- 10 Jan	70%
-- ใช้ทำ
-- timeline
-- chart
-- audit
-- 10) daily_logs

-- Site Report รายวัน

-- daily_logs
-- ใช้เก็บ
-- - วันนี้ฝนตกไหม
-- - คนงานกี่คน
-- - ทำอะไรบ้าง
-- - ปัญหาอะไร
-- สำคัญมากในงานก่อสร้างจริง

-- เพราะ:

-- ใช้ claim
-- ใช้ตรวจ delay
-- ใช้ตรวจ manpower
-- relation
-- project
-- work_task
-- created_by
-- 11) attachments

-- เก็บไฟล์ทั้งหมด

-- attachments
-- ทำไมใช้ table กลาง

-- แทนที่จะมี:

-- task_images
-- defect_images
-- inspection_images

-- ใช้ table เดียว

-- field สำคัญ
-- field	meaning
-- module_name	table ไหน
-- record_id	id ของ record
-- file_url	path ไฟล์
-- ตัวอย่าง
-- module_name	record_id
-- DEFECT	D1
-- DAILY_LOG	DL1
-- 12) inspections

-- ตรวจ QC

-- inspections
-- workflow
-- งานเสร็จ
-- ↓
-- Engineer ตรวจ
-- ↓
-- Pass / Fail
-- field สำคัญ
-- field	meaning
-- passed	ผ่านไหม
-- remark	หมายเหตุ
-- 13) defects

-- ระบบ Defect

-- defects
-- คืออะไร

-- แจ้งปัญหา

-- เช่น

-- - กระเบื้องแตก
-- - สีไม่เรียบ
-- - ท่อรั่ว
-- workflow
-- OPEN
-- ↓
-- ASSIGNED
-- ↓
-- FIXING
-- ↓
-- VERIFYING
-- ↓
-- CLOSED
-- relation
-- project
-- task
-- location
-- assigned_to
-- field สำคัญ
-- field	meaning
-- severity	ความรุนแรง
-- due_date	deadline
-- fixed_at	วันแก้เสร็จ
-- 14) defect_verifications

-- ใช้ verify defect

-- defect_verifications
-- ใช้ทำอะไร

-- หลัง contractor แก้ defect แล้ว

-- Engineer จะ:

-- ACCEPT
-- REJECT
-- ทำไมต้องแยก table

-- เพราะอาจ verify หลายรอบ

-- รอบ 1 reject
-- รอบ 2 reject
-- รอบ 3 pass
-- 15) purchase_requests

-- ใบขอซื้อ

-- purchase_requests
-- ตัวอย่าง
-- ขอซื้อ:
-- - ปูน
-- - เหล็ก
-- - สายไฟ
-- workflow
-- Engineer ขอ
-- ↓
-- Manager approve
-- ↓
-- ออก PO
-- 16) purchase_request_items

-- รายการสินค้าใน PR

-- purchase_request_items
-- ทำไมต้องแยก

-- 1 PR มีหลาย item

-- relation
-- purchase_requests
--  └── purchase_request_items
-- 17) purchase_orders

-- ใบสั่งซื้อ

-- purchase_orders
-- ใช้ทำอะไร

-- หลัง approve PR

-- จะออก PO ไป supplier

-- field สำคัญ
-- field	meaning
-- supplier_name	ร้านค้า
-- total_amount	ราคารวม
-- approved_by	คนอนุมัติ
-- 18) goods_receipts

-- รับของเข้า

-- goods_receipts
-- workflow
-- PO
-- ↓
-- ของมาส่ง
-- ↓
-- ตรวจรับ
-- ใช้ทำอะไร
-- stock
-- payment
-- ตรวจของขาด
-- 19) notifications

-- แจ้งเตือน

-- notifications
-- ตัวอย่าง
-- - Defect ใหม่
-- - PR รอ approve
-- - งานใกล้ deadline
-- 20) audit_logs

-- สำคัญมากสำหรับ production

-- audit_logs
-- ใช้เก็บ
-- ใคร
-- ทำอะไร
-- เมื่อไหร่
-- ข้อมูลเดิมคืออะไร
-- ตัวอย่าง
-- Somchai
-- เปลี่ยน defect status
-- จาก OPEN → CLOSED
-- ความสัมพันธ์ภาพรวม
-- users
--  ├── project_members
--  ├── work_tasks
--  ├── defects
--  └── daily_logs

-- projects
--  ├── locations
--  ├── contracts
--  ├── tasks
--  ├── defects
--  └── procurement

-- contracts
--  └── milestones

-- tasks
--  ├── progress_logs
--  ├── inspections
--  ├── defects
--  └── attachments

-- procurement
--  ├── PR
--  ├── PO
--  └── Goods Receipt
-- สรุปแนวคิดสำคัญของ DB นี้
-- 1. Flexible

-- ใช้:

-- project_locations
-- attachments

-- แบบ generic

-- ทำให้ขยายง่าย

-- 2. Audit ได้

-- มี:

-- progress_logs
-- defect_verifications
-- audit_logs
-- 3. รองรับงานจริง

-- มี:

-- contract
-- payment
-- procurement
-- QC
-- defect

-- ครบ construction workflow จริง

-- ถัดไปที่แนะนำทำ

-- ถ้าจะต่อจริง ผมแนะนำต่อให้ได้อีก:

-- ER Diagram

-- เห็น relation ทั้งระบบ

-- Prisma Schema

-- สำหรับใช้กับ:

-- NestJS
-- Express
-- Next.js
-- RBAC Permission Table

-- ละเอียดกว่า enum role

-- API Design

-- เช่น:

-- POST /projects
-- POST /tasks
-- POST /defects
-- Dashboard Query

-- เช่น:

-- งานล่าช้า
-- defect ค้าง
-- progress รายเดือน