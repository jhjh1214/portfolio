-- Roles and schema that the hosted Supabase platform provides for free.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator noinherit login password 'postgres';
grant anon, authenticated, service_role to authenticator;

create role supabase_auth_admin noinherit createrole login password 'postgres';
create schema auth authorization supabase_auth_admin;
grant all on schema auth to supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth, public;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant create on schema public to supabase_auth_admin;
