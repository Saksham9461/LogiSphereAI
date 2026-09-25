insert into users (id, name, email, phoneNo, passwordHash, role, status)
values ('usr-manager', 'Fleet Manager', 'manager@logisphere.ai', '9876543210', '$2a$10$pD1RCLTOZdeDhIvTKH6I1eF6Iod38Vwe8EYvKcXzHppvPnUFbe5mS', 'ROLE_MANAGER', 'ACTIVE')
on conflict (id) do nothing;

insert into users (id, name, email, phoneNo, passwordHash, role, licenseNo, licenseExpiryDate, trips, safetyScore, status)
values ('drv-raj', 'Raj Patel', 'driver@logisphere.ai', '9876500001', '$2a$10$pD1RCLTOZdeDhIvTKH6I1eF6Iod38Vwe8EYvKcXzHppvPnUFbe5mS', 'ROLE_DRIVER', 'DL-14202300123', '2038-04-14', 12, 96, 'AVAILABLE')
on conflict (id) do nothing;

insert into vehicles (vehicleID, registrationNumber, name, type, maxLoadCapacity, odometer, acquisitionCost, status)
values
('veh-van-05', 'GJ01AB1234', 'VAN-05', 'VAN', 900, 74000, 620000, 'AVAILABLE'),
('veh-truck-11', 'GJ01TR1111', 'TRUCK-11', 'TRUCK', 3000, 182000, 1900000, 'ON_TRIP')
on conflict (vehicleID) do nothing;

insert into trips (tripID, source, destination, status, vehicleID, driverID, cargoWeight, plannedDistance, startingOdometer)
values ('trp-1001', 'Warehouse A', 'Port City', 'DISPATCHED', 'veh-truck-11', 'drv-raj', 1400, 84, 182000)
on conflict (tripID) do nothing;
