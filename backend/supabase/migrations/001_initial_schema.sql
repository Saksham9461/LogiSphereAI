create extension if not exists "pgcrypto";

create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  phoneNo text,
  passwordHash text not null,
  role text not null check (role in ('ROLE_MANAGER','ROLE_DISPATCHER','ROLE_SAFETY_OFFICER','ROLE_FINANCE','ROLE_DRIVER')),
  licenseNo text,
  licenseExpiryDate text,
  trips integer default 0,
  safetyScore numeric default 95,
  status text default 'ACTIVE',
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

create table if not exists vehicles (
  vehicleID text primary key,
  registrationNumber text not null unique,
  name text not null,
  type text not null check (type in ('VAN','TRUCK','MINI','Van','Truck','Mini')),
  maxLoadCapacity numeric not null,
  odometer numeric default 0,
  acquisitionCost numeric default 0,
  status text not null default 'AVAILABLE',
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

create table if not exists trips (
  tripID text primary key,
  source text not null,
  destination text not null,
  status text not null default 'DRAFT',
  vehicleID text references vehicles(vehicleID) on delete set null,
  driverID text references users(id) on delete set null,
  cargoWeight numeric default 0,
  plannedDistance numeric default 0,
  startingOdometer numeric default 0,
  finalOdometer numeric,
  fuelConsumed numeric,
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

create table if not exists attendance_records (
  id text primary key,
  userId text references users(id) on delete set null,
  date text not null,
  clockInTime text not null,
  clockOutTime text,
  latitude numeric,
  longitude numeric,
  locationName text,
  distanceFromOffice numeric,
  status text not null,
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

create table if not exists maintenance_records (
  id text primary key,
  vehicleID text references vehicles(vehicleID) on delete cascade,
  serviceType text not null,
  cost numeric not null default 0,
  date date not null,
  status text not null,
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

create table if not exists fuel_logs (
  fuelLogId text primary key,
  vehicleID text references vehicles(vehicleID) on delete cascade,
  date date not null,
  liters numeric not null default 0,
  cost numeric not null default 0,
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

create table if not exists expense_records (
  expenseId text primary key,
  tripID text references trips(tripID) on delete cascade,
  vehicleID text references vehicles(vehicleID) on delete cascade,
  toll numeric default 0,
  other numeric default 0,
  maint numeric default 0,
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

create table if not exists chat_messages (
  messageId text primary key,
  text text not null,
  senderId text references users(id) on delete set null,
  senderName text not null,
  createdAt timestamptz default now()
);

create table if not exists tracking_locations (
  id text primary key,
  tripID text references trips(tripID) on delete cascade,
  vehicleID text references vehicles(vehicleID) on delete cascade,
  driverID text references users(id) on delete set null,
  latitude numeric not null,
  longitude numeric not null,
  speed numeric default 0,
  createdAt timestamptz default now()
);

create table if not exists notifications (
  id text primary key,
  userId text references users(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean default false,
  createdAt timestamptz default now()
);

create index if not exists idx_users_role on users(role);
create index if not exists idx_vehicles_status on vehicles(status);
create index if not exists idx_trips_status on trips(status);
create index if not exists idx_trips_vehicle on trips(vehicleID);
create index if not exists idx_trips_driver on trips(driverID);
create index if not exists idx_tracking_trip on tracking_locations(tripID);
