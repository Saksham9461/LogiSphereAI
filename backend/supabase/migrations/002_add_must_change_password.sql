-- Migration 002: Add must_change_password flag to users table for temporary password first login flow
alter table users add column if not exists must_change_password boolean not null default false;
