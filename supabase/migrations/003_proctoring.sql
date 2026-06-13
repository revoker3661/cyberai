-- Migration 003: proctoring — track tab switches per quiz attempt
alter table module_progress
  add column if not exists tab_switch_count int not null default 0;
