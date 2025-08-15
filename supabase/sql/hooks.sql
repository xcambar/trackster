-- This hook creates an entry in the public schema
-- so that the Athletes in strava can be mapped to users in Trackster
-- without compromising the authentication schema
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

create or replace trigger "map_auth_user_into_public_schema"
after insert on "auth"."users"
for each row
execute function add_row_into_public_users();

create or replace function add_row_into_public_users()
returns trigger
language plpgsql
as $$
begin
  RAISE LOG 'Updating row with ID: %', new.id;
  RAISE LOG 'Updating row with Strava profile: %', (new.raw_user_meta_data->'strava_profile'->>'id')::int;
  insert into "public"."user_athlete_mapping"(user_id, athlete_id)
  values (new.id, (new.raw_user_meta_data->'strava_profile'->>'id')::int);
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION snitch() RETURNS event_trigger AS $$
BEGIN
    RAISE NOTICE 'snitch: % %', tg_event, tg_tag;
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER snitch ON ddl_command_start EXECUTE FUNCTION snitch();