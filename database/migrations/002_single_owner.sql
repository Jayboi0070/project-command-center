-- 002: enforce single-owner at the database level. A second users row is impossible.
CREATE UNIQUE INDEX users_single_owner ON users ((true));
INSERT INTO schema_migrations(version) VALUES ('002_single_owner');
