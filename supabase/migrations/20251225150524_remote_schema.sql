


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."comcom_create_message"("p_org_id" "uuid", "p_type" "text", "p_subject" "text", "p_body" "text", "p_target_role" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_id uuid := gen_random_uuid();
  creator_email text;
begin
  -- get current user's email
  select email into creator_email
  from auth.users
  where id = auth.uid();

  insert into comcom_messages (
    id,
    org_id,
    created_by,
    created_by_email,
    type,
    subject,
    body,
    target_role,
    status
  ) values (
    new_id,
    p_org_id,
    auth.uid(),
    creator_email,
    p_type,
    p_subject,
    p_body,
    p_target_role,
    'draft'
  );

  return new_id;
end;
$$;


ALTER FUNCTION "public"."comcom_create_message"("p_org_id" "uuid", "p_type" "text", "p_subject" "text", "p_body" "text", "p_target_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."comcom_delete_message"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from comcom_messages where id = p_id;
end;
$$;


ALTER FUNCTION "public"."comcom_delete_message"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."comcom_get_recipients_for_role"("p_org_id" "uuid", "p_role" "text") RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "role" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
      tu.user_id,
      tu.email,
      tu.first_name,
      tu.last_name,
      tu.role
  FROM team_users_view tu
  WHERE tu.organization_id = p_org_id
    AND tu.role = p_role
    AND tu.role_suspended = false
    AND tu.email IS NOT NULL
    AND tu.email <> '';
END;
$$;


ALTER FUNCTION "public"."comcom_get_recipients_for_role"("p_org_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select role
  from user_roles
  where user_id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_system_setting"("p_key" "text") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select value
  from system_settings
  where key = p_key;
$$;


ALTER FUNCTION "public"."get_system_setting"("p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_with_roles"() RETURNS TABLE("user_id" "uuid", "email" "text", "role" "text", "organization_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select 
    ur.user_id,
    au.email,
    ur.role,
    ur.organization_id
  from user_roles ur
  join auth.users au on au.id = ur.user_id;
$$;


ALTER FUNCTION "public"."get_users_with_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_donor"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_org uuid;
begin
  -- identify the user's organization
  select organization_id into v_org
  from user_roles
  where user_id = auth.uid()
  limit 1;

  if v_org is null then
    raise exception 'User has no organization assigned';
  end if;

  -- auto-fill organization_id
  new.organization_id := v_org;

  -- auto-fill creator user id
  new.created_by_user_id := auth.uid();

  -- auto-generate display_name if empty
  if new.display_name is null or length(trim(new.display_name)) = 0 then
    new.display_name :=
      trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, ''));
  end if;

  -- also sync "name" field to display_name
  new.name := new.display_name;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_donor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_or_updated_donor"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_org uuid;
BEGIN
  ----------------------------------------------------------------------
  -- INSERT LOGIC
  ----------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN

    -- Find the user's organization
    SELECT organization_id INTO v_org
    FROM user_roles
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_org IS NULL THEN
      RAISE EXCEPTION 'User has no organization assigned';
    END IF;

    -- Auto-fill organization + creator
    NEW.organization_id := v_org;
    NEW.created_by_user_id := auth.uid();
  END IF;

  ----------------------------------------------------------------------
  -- UPDATE LOGIC
  ----------------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN

    -- Prevent moving donor between organizations
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'organization_id cannot be changed';
    END IF;

  END IF;

  ----------------------------------------------------------------------
  -- SHARED LOGIC FOR INSERT/UPDATE
  ----------------------------------------------------------------------

  -- Normalize display_name if missing
  IF NEW.display_name IS NULL OR length(trim(NEW.display_name)) = 0 THEN
    NEW.display_name :=
      trim(coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, ''));
  END IF;

  -- Keep the "name" column in sync with display_name
  NEW.name := NEW.display_name;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_or_updated_donor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_pledge"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'User has no organization assigned';
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_pledge"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into users_profiles (
    user_id,
    created_at,
    email,
    status
  )
  values (
    new.id,
    now(),
    new.email,
    'active'
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  -- משתמש הוא אדמין בארגון אם:
  -- role ∈ (super_admin, synagogue_admin, manager)
  -- + לא מושהה + שייך לארגון
  select exists (
    select 1
    from public.team_users_view tuv
    where tuv.user_id = p_user_id
      and tuv.organization_id = p_org_id
      and tuv.role in ('super_admin', 'synagogue_admin', 'manager')
      and (tuv.role_suspended = false or tuv.role_suspended is null)
  )
  -- או שהוא super_admin גלובלי
  or exists (
    select 1
    from public.team_users_view tuv
    where tuv.user_id = p_user_id
      and tuv.role = 'super_admin'
      and (tuv.role_suspended = false or tuv.role_suspended is null)
  );
$$;


ALTER FUNCTION "public"."is_org_admin"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_users_view
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND role_suspended = false
  );
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_in_org"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.team_users_view tuv
    where tuv.user_id = p_user_id
      and tuv.organization_id = p_org_id
      and (tuv.role_suspended = false or tuv.role_suspended is null)
  );
$$;


ALTER FUNCTION "public"."is_user_in_org"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_donor"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.display_name IS NULL OR trim(NEW.display_name) = '' THEN
    NEW.display_name :=
      trim(
        coalesce(NEW.first_name, '') || ' ' ||
        coalesce(NEW.last_name, '')
      );
  END IF;

  NEW.name := NEW.display_name;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."normalize_donor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_donor_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.organization_id := (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
    LIMIT 1
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_donor_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_org_from_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'User has no organization assigned';
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_org_from_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pledge_after_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total_paid numeric;
    v_total_amount numeric;
BEGIN
    -- 1. סכום כל התשלומים עבור ההתחייבות הזו
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payments
    WHERE pledge_id = NEW.pledge_id;

    -- 2. משיכת סכום ההתחייבות המקורי
    SELECT total_amount
    INTO v_total_amount
    FROM pledges
    WHERE id = NEW.pledge_id;

    -- 3. עדכון טבלת ההתחייבויות
    UPDATE pledges
    SET
        amount_paid = v_total_paid,
        balance_owed = GREATEST(v_total_amount - v_total_paid, 0),
        status = CASE
                    WHEN v_total_paid >= v_total_amount THEN 'completed'
                    ELSE 'active'
                 END,
        updated_at = NOW()
    WHERE id = NEW.pledge_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pledge_after_payment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pledge_payment_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE pledges
    SET 
      amount_paid = (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE pledge_id = NEW.pledge_id
      ),
      balance_owed = (
        total_amount - (
          SELECT COALESCE(SUM(amount), 0)
          FROM payments
          WHERE pledge_id = NEW.pledge_id
        )
      )
    WHERE id = NEW.pledge_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pledge_payment_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pledge_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_sum numeric;
BEGIN
  -- מחשב את סך כל התשלומים של ה-pledge
  SELECT COALESCE(SUM(amount), 0)
  INTO v_sum
  FROM payments
  WHERE pledge_id = COALESCE(NEW.pledge_id, OLD.pledge_id);

  -- מעדכן את הסכומים ב-pledges
  UPDATE pledges
  SET 
    amount_paid = v_sum,
    balance_owed = total_amount - v_sum
  WHERE id = COALESCE(NEW.pledge_id, OLD.pledge_id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pledge_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_settings_modified"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_settings_modified"() OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."auth_users_extended" AS
 SELECT "id",
    "email"
   FROM "auth"."users";


ALTER VIEW "public"."auth_users_extended" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."auth_users_view" AS
 SELECT "id",
    "email"
   FROM "auth"."users";


ALTER VIEW "public"."auth_users_view" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "goal_amount" numeric(12,2),
    "start_date" "date",
    "end_date" "date",
    "banner_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comcom_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comcom_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comcom_message_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "recipient_type" "text",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comcom_message_recipients_recipient_type_check" CHECK (("recipient_type" = ANY (ARRAY['internal'::"text", 'to'::"text", 'cc'::"text", 'bcc'::"text"])))
);


ALTER TABLE "public"."comcom_message_recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comcom_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "subject" "text",
    "body" "text",
    "target_role" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_email" "text",
    CONSTRAINT "comcom_messages_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sent'::"text"]))),
    CONSTRAINT "comcom_messages_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'event'::"text", 'survey'::"text"])))
);


ALTER TABLE "public"."comcom_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comcom_recipients_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comcom_recipients_log_type_check" CHECK (("type" = ANY (ARRAY['to'::"text", 'cc'::"text", 'bcc'::"text"])))
);


ALTER TABLE "public"."comcom_recipients_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comcom_survey_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "options" "text"[] DEFAULT '{}'::"text"[],
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "comcom_survey_questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['text'::"text", 'single_choice'::"text", 'multiple_choice'::"text"])))
);


ALTER TABLE "public"."comcom_survey_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comcom_survey_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "answers" "jsonb" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comcom_survey_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comcom_surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "is_anonymous" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comcom_surveys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."donations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donor_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'ILS'::"text",
    "type" "text",
    "designation" "text",
    "payment_method" "text",
    "date" timestamp with time zone DEFAULT "now"(),
    "receipt_number" "text",
    "status" "text" DEFAULT 'Succeeded'::"text",
    "fee" numeric(12,2),
    "net_amount" numeric(12,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "category" "text",
    "yahrzeit_id" "uuid"
);


ALTER TABLE "public"."donations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."donor_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donor_id" "uuid",
    "organization_id" "uuid"
);


ALTER TABLE "public"."donor_organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."donors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "display_name" "text",
    "name" "text",
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "email" "text",
    "address_street" "text",
    "address_city" "text",
    "address_state" "text",
    "address_zip" "text",
    "address_country" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."donors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "payload" "jsonb",
    "sent_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_home_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "title" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "hero_image_url" "text",
    "content" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "is_global" boolean DEFAULT false NOT NULL,
    CONSTRAINT "organization_home_pages_scope_check" CHECK (((("is_global" = true) AND ("organization_id" IS NULL)) OR (("is_global" = false) AND ("organization_id" IS NOT NULL))))
);


ALTER TABLE "public"."organization_home_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_scholar_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_scholar_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "city" "text",
    "state" "text",
    "member_count" integer,
    "subscription_status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid",
    "logo_url" "text",
    "address" "text",
    "zip" "text",
    "subscription_tier" "text" DEFAULT 'tier_1'::"text",
    "country" "text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donor_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "method" "text",
    "reference_number" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "pledge_id" "uuid",
    "date" "date",
    "currency" "text",
    "status" "text" DEFAULT 'succeeded'::"text"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pledges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donor_id" "uuid",
    "total_amount" numeric,
    "amount_paid" numeric DEFAULT 0,
    "balance_owed" numeric,
    "frequency" "text",
    "status" "text" DEFAULT 'active'::"text",
    "reminder_enabled" boolean DEFAULT true,
    "last_reminder_sent" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "campaign_id" "uuid",
    "due_date" "date",
    "notes" "text",
    "currency" "text" DEFAULT 'USD'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category" "text"
);


ALTER TABLE "public"."pledges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "pdf_url" "text",
    "sent_to_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "primary_color" "text",
    "secondary_color" "text",
    "accent_color" "text",
    "font_family" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "receipt_format" "text" DEFAULT 'BN-{YEAR}-{SEQUENCE}'::"text",
    "surcharge_enabled" boolean DEFAULT false,
    "surcharge_percent" numeric DEFAULT 0,
    "surcharge_fixed" numeric,
    "default_currency" "text" DEFAULT 'ILS'::"text",
    "zelle_name" "text",
    "zelle_email_or_phone" "text",
    "zelle_note" "text"
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_tiers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "max_members" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "suspended" boolean DEFAULT false
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users_profiles" (
    "email" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "country" "text",
    "position" "text",
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL
);


ALTER TABLE "public"."users_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."team_users_view" AS
 SELECT "up"."user_id",
    "up"."email",
    "up"."first_name",
    "up"."last_name",
    "up"."phone",
    "up"."address",
    "up"."city",
    "up"."state",
    "up"."zip",
    "up"."country",
    "up"."position",
    "ur"."id" AS "role_id",
    "ur"."role",
    "ur"."suspended" AS "role_suspended",
    "ur"."created_at" AS "role_created_at",
    "ur"."organization_id",
    "o"."name" AS "organization_name"
   FROM (("public"."users_profiles" "up"
     LEFT JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "up"."user_id")))
     LEFT JOIN "public"."organizations" "o" ON (("o"."id" = "ur"."organization_id")));


ALTER VIEW "public"."team_users_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "organization_id" "uuid",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."yahrzeits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deceased_name" "text",
    "hebrew_date" "text",
    "secular_date" "date",
    "relationship" "text",
    "donor_id" "uuid",
    "organization_id" "uuid",
    "reminder_enabled" boolean DEFAULT true,
    "last_reminder_sent" timestamp with time zone,
    "contact_email" "text",
    "contact_phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "prayer_text" "text",
    "contact_name" "text"
);


ALTER TABLE "public"."yahrzeits" OWNER TO "postgres";


ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comcom_events"
    ADD CONSTRAINT "comcom_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comcom_message_recipients"
    ADD CONSTRAINT "comcom_message_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comcom_messages"
    ADD CONSTRAINT "comcom_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comcom_recipients_log"
    ADD CONSTRAINT "comcom_recipients_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comcom_survey_questions"
    ADD CONSTRAINT "comcom_survey_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comcom_survey_responses"
    ADD CONSTRAINT "comcom_survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comcom_survey_responses"
    ADD CONSTRAINT "comcom_survey_responses_survey_id_user_id_key" UNIQUE ("survey_id", "user_id");



ALTER TABLE ONLY "public"."comcom_surveys"
    ADD CONSTRAINT "comcom_surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donor_organizations"
    ADD CONSTRAINT "donor_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donor_organizations"
    ADD CONSTRAINT "donor_organizations_unique" UNIQUE ("donor_id", "organization_id");



ALTER TABLE ONLY "public"."donors"
    ADD CONSTRAINT "donors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_home_pages"
    ADD CONSTRAINT "organization_home_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_scholar_plans"
    ADD CONSTRAINT "organization_scholar_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "pledges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_organization_unique" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_tiers"
    ADD CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_unique" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_org_unique" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."users_profiles"
    ADD CONSTRAINT "users_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."yahrzeits"
    ADD CONSTRAINT "yahrzeits_pkey" PRIMARY KEY ("id");



CREATE INDEX "comcom_events_message_id_idx" ON "public"."comcom_events" USING "btree" ("message_id");



CREATE INDEX "comcom_messages_org_id_idx" ON "public"."comcom_messages" USING "btree" ("org_id");



CREATE INDEX "comcom_messages_target_role_idx" ON "public"."comcom_messages" USING "btree" ("target_role");



CREATE INDEX "comcom_survey_questions_survey_id_idx" ON "public"."comcom_survey_questions" USING "btree" ("survey_id");



CREATE INDEX "comcom_survey_responses_org_id_idx" ON "public"."comcom_survey_responses" USING "btree" ("organization_id");



CREATE INDEX "comcom_survey_responses_survey_id_idx" ON "public"."comcom_survey_responses" USING "btree" ("survey_id");



CREATE INDEX "comcom_surveys_message_id_idx" ON "public"."comcom_surveys" USING "btree" ("message_id");



CREATE INDEX "donations_campaign_id_idx" ON "public"."donations" USING "btree" ("campaign_id");



CREATE INDEX "donations_org_idx" ON "public"."donations" USING "btree" ("organization_id");



CREATE INDEX "idx_donations_campaign_id" ON "public"."donations" USING "btree" ("campaign_id");



CREATE INDEX "idx_donations_donor_id" ON "public"."donations" USING "btree" ("donor_id");



CREATE INDEX "idx_donations_organization_id" ON "public"."donations" USING "btree" ("organization_id");



CREATE INDEX "idx_donor_org_donor" ON "public"."donor_organizations" USING "btree" ("donor_id");



CREATE INDEX "idx_donor_org_donor_id" ON "public"."donor_organizations" USING "btree" ("donor_id");



CREATE INDEX "idx_donor_org_org" ON "public"."donor_organizations" USING "btree" ("organization_id");



CREATE INDEX "idx_donor_org_org_id" ON "public"."donor_organizations" USING "btree" ("organization_id");



CREATE INDEX "idx_payments_donor_id" ON "public"."payments" USING "btree" ("donor_id");



CREATE INDEX "idx_payments_organization_id" ON "public"."payments" USING "btree" ("organization_id");



CREATE INDEX "idx_payments_pledge_id" ON "public"."payments" USING "btree" ("pledge_id");



CREATE INDEX "idx_pledges_campaign_id" ON "public"."pledges" USING "btree" ("campaign_id");



CREATE INDEX "idx_pledges_donor_id" ON "public"."pledges" USING "btree" ("donor_id");



CREATE INDEX "idx_pledges_org_id" ON "public"."pledges" USING "btree" ("organization_id");



CREATE INDEX "idx_pledges_organization_id" ON "public"."pledges" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "invites_unique_active" ON "public"."invites" USING "btree" ("email", "organization_id") WHERE (("accepted_at" IS NULL) AND ("cancelled_at" IS NULL));



CREATE UNIQUE INDEX "one_global_home_page" ON "public"."organization_home_pages" USING "btree" ("is_global") WHERE ("is_global" = true);



CREATE UNIQUE INDEX "one_home_page_per_org" ON "public"."organization_home_pages" USING "btree" ("organization_id") WHERE ("is_global" = false);



CREATE INDEX "org_scholar_plans_org_idx" ON "public"."organization_scholar_plans" USING "btree" ("organization_id");



CREATE INDEX "payments_org_idx" ON "public"."payments" USING "btree" ("organization_id");



CREATE INDEX "pledges_campaign_id_idx" ON "public"."pledges" USING "btree" ("campaign_id");



CREATE INDEX "pledges_category_idx" ON "public"."pledges" USING "btree" ("category");



CREATE INDEX "pledges_org_category_idx" ON "public"."pledges" USING "btree" ("organization_id", "category");



CREATE INDEX "pledges_org_idx" ON "public"."pledges" USING "btree" ("organization_id");



CREATE INDEX "receipts_org_idx" ON "public"."receipts" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "unique_global_home" ON "public"."organization_home_pages" USING "btree" ("is_global") WHERE ("is_global" = true);



CREATE UNIQUE INDEX "unique_org_home" ON "public"."organization_home_pages" USING "btree" ("organization_id") WHERE ("organization_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_home_global" ON "public"."organization_home_pages" USING "btree" ("is_global") WHERE ("is_global" = true);



CREATE UNIQUE INDEX "uq_home_org" ON "public"."organization_home_pages" USING "btree" ("organization_id") WHERE ("organization_id" IS NOT NULL);



CREATE INDEX "yahrzeits_org_idx" ON "public"."yahrzeits" USING "btree" ("organization_id");



CREATE OR REPLACE TRIGGER "settings_updated_at" BEFORE UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_settings_modified"();



CREATE OR REPLACE TRIGGER "trg_home_updated_at" BEFORE UPDATE ON "public"."organization_home_pages" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_normalize_donor" BEFORE INSERT OR UPDATE ON "public"."donors" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_donor"();



CREATE OR REPLACE TRIGGER "trg_payments_org" BEFORE INSERT ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_from_user"();



CREATE OR REPLACE TRIGGER "trg_pledge_insert" BEFORE INSERT ON "public"."pledges" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_pledge"();



CREATE OR REPLACE TRIGGER "trg_pledges_org" BEFORE INSERT ON "public"."pledges" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_from_user"();



CREATE OR REPLACE TRIGGER "trg_receipts_org" BEFORE INSERT ON "public"."receipts" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_from_user"();



CREATE OR REPLACE TRIGGER "trg_update_pledge_after_payment" AFTER INSERT ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_pledge_after_payment"();



CREATE OR REPLACE TRIGGER "trg_update_pledge_on_payment" AFTER INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_pledge_payment_totals"();



CREATE OR REPLACE TRIGGER "trg_update_pledge_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_pledge_totals"();



CREATE OR REPLACE TRIGGER "trg_yahrzeits_org" BEFORE INSERT ON "public"."yahrzeits" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_from_user"();



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."comcom_events"
    ADD CONSTRAINT "comcom_events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."comcom_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comcom_message_recipients"
    ADD CONSTRAINT "comcom_message_recipients_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."comcom_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comcom_message_recipients"
    ADD CONSTRAINT "comcom_message_recipients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."comcom_messages"
    ADD CONSTRAINT "comcom_messages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comcom_messages"
    ADD CONSTRAINT "comcom_messages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comcom_recipients_log"
    ADD CONSTRAINT "comcom_recipients_log_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."comcom_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comcom_survey_questions"
    ADD CONSTRAINT "comcom_survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."comcom_surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comcom_survey_responses"
    ADD CONSTRAINT "comcom_survey_responses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comcom_survey_responses"
    ADD CONSTRAINT "comcom_survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."comcom_surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comcom_survey_responses"
    ADD CONSTRAINT "comcom_survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comcom_surveys"
    ADD CONSTRAINT "comcom_surveys_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."comcom_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_yahrzeit_id_fkey" FOREIGN KEY ("yahrzeit_id") REFERENCES "public"."yahrzeits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."donor_organizations"
    ADD CONSTRAINT "donor_organizations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."donor_organizations"
    ADD CONSTRAINT "donor_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users_profiles"
    ADD CONSTRAINT "fk_user_profiles_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_scholar_plans"
    ADD CONSTRAINT "organization_scholar_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_donor_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pledge_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."pledges"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "pledges_campaign_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "pledges_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "pledges_donor_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "pledges_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "pledges_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "pledges_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_org_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_fkey" FOREIGN KEY ("role") REFERENCES "public"."roles"("name");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."yahrzeits"
    ADD CONSTRAINT "yahrzeits_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."yahrzeits"
    ADD CONSTRAINT "yahrzeits_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage profiles" ON "public"."users_profiles" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['super_admin'::"text", 'synagogue_admin'::"text"]))))));



CREATE POLICY "Admins can view all profiles" ON "public"."users_profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Allow read of system settings" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow super admin to update system settings" ON "public"."system_settings" FOR UPDATE TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



CREATE POLICY "Users can read their org memberships" ON "public"."user_organizations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."users_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."users_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."comcom_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comcom_events_admins" ON "public"."comcom_events" USING ((EXISTS ( SELECT 1
   FROM "public"."comcom_messages" "m"
  WHERE (("m"."id" = "comcom_events"."message_id") AND "public"."is_org_admin"("auth"."uid"(), "m"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."comcom_messages" "m"
  WHERE (("m"."id" = "comcom_events"."message_id") AND "public"."is_org_admin"("auth"."uid"(), "m"."org_id")))));



ALTER TABLE "public"."comcom_message_recipients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comcom_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comcom_messages_delete" ON "public"."comcom_messages" FOR DELETE USING ("public"."is_org_admin"("auth"."uid"(), "org_id"));



CREATE POLICY "comcom_messages_insert" ON "public"."comcom_messages" FOR INSERT WITH CHECK ("public"."is_org_admin"("auth"."uid"(), "org_id"));



CREATE POLICY "comcom_messages_select" ON "public"."comcom_messages" FOR SELECT USING ("public"."is_org_admin"("auth"."uid"(), "org_id"));



CREATE POLICY "comcom_messages_update" ON "public"."comcom_messages" FOR UPDATE USING ("public"."is_org_admin"("auth"."uid"(), "org_id")) WITH CHECK ("public"."is_org_admin"("auth"."uid"(), "org_id"));



ALTER TABLE "public"."comcom_survey_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comcom_survey_questions_admins" ON "public"."comcom_survey_questions" USING ((EXISTS ( SELECT 1
   FROM ("public"."comcom_surveys" "s"
     JOIN "public"."comcom_messages" "m" ON (("m"."id" = "s"."message_id")))
  WHERE (("s"."id" = "comcom_survey_questions"."survey_id") AND "public"."is_org_admin"("auth"."uid"(), "m"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."comcom_surveys" "s"
     JOIN "public"."comcom_messages" "m" ON (("m"."id" = "s"."message_id")))
  WHERE (("s"."id" = "comcom_survey_questions"."survey_id") AND "public"."is_org_admin"("auth"."uid"(), "m"."org_id")))));



ALTER TABLE "public"."comcom_survey_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comcom_survey_responses_insert" ON "public"."comcom_survey_responses" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."comcom_surveys" "s"
     JOIN "public"."comcom_messages" "m" ON (("m"."id" = "s"."message_id")))
  WHERE (("s"."id" = "comcom_survey_responses"."survey_id") AND ("comcom_survey_responses"."organization_id" = "m"."org_id") AND "public"."is_user_in_org"("auth"."uid"(), "m"."org_id") AND ("comcom_survey_responses"."user_id" = "auth"."uid"())))));



CREATE POLICY "comcom_survey_responses_select_admins" ON "public"."comcom_survey_responses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."comcom_surveys" "s"
     JOIN "public"."comcom_messages" "m" ON (("m"."id" = "s"."message_id")))
  WHERE (("s"."id" = "comcom_survey_responses"."survey_id") AND "public"."is_org_admin"("auth"."uid"(), "m"."org_id")))));



CREATE POLICY "comcom_survey_responses_select_self" ON "public"."comcom_survey_responses" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."comcom_surveys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comcom_surveys_admins" ON "public"."comcom_surveys" USING ((EXISTS ( SELECT 1
   FROM "public"."comcom_messages" "m"
  WHERE (("m"."id" = "comcom_surveys"."message_id") AND "public"."is_org_admin"("auth"."uid"(), "m"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."comcom_messages" "m"
  WHERE (("m"."id" = "comcom_surveys"."message_id") AND "public"."is_org_admin"("auth"."uid"(), "m"."org_id")))));



ALTER TABLE "public"."donations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "donations_delete" ON "public"."donations" FOR DELETE USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "donations_insert" ON "public"."donations" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "donations_select" ON "public"."donations" FOR SELECT USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "donations_update" ON "public"."donations" FOR UPDATE USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text"))) WITH CHECK ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "donor_org_admin" ON "public"."donor_organizations" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."organization_id" = "donor_organizations"."organization_id")))));



CREATE POLICY "donor_org_super_admin" ON "public"."donor_organizations" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"text")))));



ALTER TABLE "public"."donor_organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "donors_org_admin_insert" ON "public"."donors" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "donors_org_admin_update" ON "public"."donors" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "home_insert_global" ON "public"."organization_home_pages" FOR INSERT TO "authenticated" WITH CHECK ((("is_global" = true) AND ("organization_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_users_view" "tuv"
  WHERE (("tuv"."user_id" = "auth"."uid"()) AND ("tuv"."role" = 'super_admin'::"text") AND (COALESCE("tuv"."role_suspended", false) = false))))));



CREATE POLICY "home_insert_org" ON "public"."organization_home_pages" FOR INSERT TO "authenticated" WITH CHECK ((("is_global" = false) AND ("organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_users_view" "tuv"
  WHERE (("tuv"."user_id" = "auth"."uid"()) AND ("tuv"."organization_id" = "organization_home_pages"."organization_id") AND ("tuv"."role" = ANY (ARRAY['synagogue_admin'::"text", 'manager'::"text"])) AND (COALESCE("tuv"."role_suspended", false) = false))))));



CREATE POLICY "home_select" ON "public"."organization_home_pages" FOR SELECT USING ((("is_global" = true) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."organization_id" = "organization_home_pages"."organization_id") AND ("ur"."suspended" IS NOT TRUE)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'super_admin'::"text") AND ("ur"."suspended" IS NOT TRUE))))));



CREATE POLICY "home_update" ON "public"."organization_home_pages" FOR UPDATE TO "authenticated" USING (((("is_global" = true) AND (EXISTS ( SELECT 1
   FROM "public"."team_users_view" "tuv"
  WHERE (("tuv"."user_id" = "auth"."uid"()) AND ("tuv"."role" = 'super_admin'::"text") AND (COALESCE("tuv"."role_suspended", false) = false))))) OR (("is_global" = false) AND (EXISTS ( SELECT 1
   FROM "public"."team_users_view" "tuv"
  WHERE (("tuv"."user_id" = "auth"."uid"()) AND ("tuv"."organization_id" = "organization_home_pages"."organization_id") AND ("tuv"."role" = ANY (ARRAY['synagogue_admin'::"text", 'manager'::"text"])) AND (COALESCE("tuv"."role_suspended", false) = false)))))));



CREATE POLICY "manage plans" ON "public"."organization_scholar_plans" USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete" ON "public"."notifications" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_insert" ON "public"."notifications" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "org admin roles" ON "public"."user_roles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = 'synagogue_admin'::"text") AND ("r"."organization_id" = "user_roles"."organization_id")))));



CREATE POLICY "org members read log" ON "public"."comcom_message_recipients" FOR SELECT USING (("org_id" IN ( SELECT "team_users_view"."organization_id"
   FROM "public"."team_users_view"
  WHERE ("team_users_view"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_insert" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



CREATE POLICY "org_select" ON "public"."organizations" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text") OR ("id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false))))));



CREATE POLICY "org_update_org_admin" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."organization_id" = "organizations"."id") AND ("ur"."role" = ANY (ARRAY['synagogue_admin'::"text", 'manager'::"text"])) AND (COALESCE("ur"."suspended", false) = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."organization_id" = "organizations"."id") AND ("ur"."role" = ANY (ARRAY['synagogue_admin'::"text", 'manager'::"text"])) AND (COALESCE("ur"."suspended", false) = false)))));



CREATE POLICY "org_update_super_admin" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'super_admin'::"text") AND (COALESCE("ur"."suspended", false) = false))))) WITH CHECK (true);



ALTER TABLE "public"."organization_home_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_scholar_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_by_membership" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."organization_id" = "organizations"."id") AND (COALESCE("ur"."suspended", false) = false) AND ("ur"."role" <> 'super_admin'::"text")))));



CREATE POLICY "organizations_super_admin_all" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'super_admin'::"text") AND (COALESCE("ur"."suspended", false) = false)))));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_delete" ON "public"."payments" FOR DELETE USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "payments_insert" ON "public"."payments" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "payments_update" ON "public"."payments" FOR UPDATE USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text"))) WITH CHECK ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



ALTER TABLE "public"."pledges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pledges_delete" ON "public"."pledges" FOR DELETE USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "pledges_insert" ON "public"."pledges" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "pledges_select" ON "public"."pledges" FOR SELECT USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



CREATE POLICY "pledges_update" ON "public"."pledges" FOR UPDATE USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text"))) WITH CHECK ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'isGlobalSuperAdmin'::"text") = 'true'::"text")));



ALTER TABLE "public"."receipts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "receipts_delete" ON "public"."receipts" FOR DELETE USING (("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "receipts_insert" ON "public"."receipts" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "receipts_select" ON "public"."receipts" FOR SELECT USING (("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "receipts_update" ON "public"."receipts" FOR UPDATE USING (("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "select plans" ON "public"."organization_scholar_plans" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "service can manage organizations" ON "public"."organizations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service can manage user profiles" ON "public"."users_profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service can manage user_roles" ON "public"."user_roles" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_insert" ON "public"."settings" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text")));



CREATE POLICY "settings_select" ON "public"."settings" FOR SELECT USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text")));



CREATE POLICY "settings_update" ON "public"."settings" FOR UPDATE USING ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"))) WITH CHECK ((("organization_id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."suspended" = false)))) OR (("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text")));



CREATE POLICY "superadmin all roles" ON "public"."user_roles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = 'super_admin'::"text")))));



CREATE POLICY "superadmin profiles" ON "public"."users_profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."role" = 'super_admin'::"text")))));



CREATE POLICY "user can insert own roles" ON "public"."user_roles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user can read own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."users_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "yahr_delete" ON "public"."yahrzeits" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "yahr_insert" ON "public"."yahrzeits" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "yahr_select" ON "public"."yahrzeits" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "yahr_update" ON "public"."yahrzeits" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."yahrzeits" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."comcom_create_message"("p_org_id" "uuid", "p_type" "text", "p_subject" "text", "p_body" "text", "p_target_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."comcom_create_message"("p_org_id" "uuid", "p_type" "text", "p_subject" "text", "p_body" "text", "p_target_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."comcom_create_message"("p_org_id" "uuid", "p_type" "text", "p_subject" "text", "p_body" "text", "p_target_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."comcom_delete_message"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."comcom_delete_message"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."comcom_delete_message"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."comcom_get_recipients_for_role"("p_org_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."comcom_get_recipients_for_role"("p_org_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."comcom_get_recipients_for_role"("p_org_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_system_setting"("p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_system_setting"("p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_system_setting"("p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_with_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_with_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_with_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_donor"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_donor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_donor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_or_updated_donor"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_or_updated_donor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_or_updated_donor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_pledge"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_pledge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_pledge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin"("p_user_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("p_user_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("p_user_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_in_org"("p_user_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_in_org"("p_user_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_in_org"("p_user_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_donor"() TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_donor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_donor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_donor_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_donor_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_donor_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_org_from_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_org_from_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_org_from_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pledge_after_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pledge_after_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pledge_after_payment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pledge_payment_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pledge_payment_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pledge_payment_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pledge_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pledge_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pledge_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_settings_modified"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_settings_modified"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_settings_modified"() TO "service_role";


















GRANT ALL ON TABLE "public"."auth_users_extended" TO "anon";
GRANT ALL ON TABLE "public"."auth_users_extended" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_users_extended" TO "service_role";



GRANT ALL ON TABLE "public"."auth_users_view" TO "anon";
GRANT ALL ON TABLE "public"."auth_users_view" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_users_view" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."comcom_events" TO "anon";
GRANT ALL ON TABLE "public"."comcom_events" TO "authenticated";
GRANT ALL ON TABLE "public"."comcom_events" TO "service_role";



GRANT ALL ON TABLE "public"."comcom_message_recipients" TO "anon";
GRANT ALL ON TABLE "public"."comcom_message_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."comcom_message_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."comcom_messages" TO "anon";
GRANT ALL ON TABLE "public"."comcom_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."comcom_messages" TO "service_role";



GRANT ALL ON TABLE "public"."comcom_recipients_log" TO "anon";
GRANT ALL ON TABLE "public"."comcom_recipients_log" TO "authenticated";
GRANT ALL ON TABLE "public"."comcom_recipients_log" TO "service_role";



GRANT ALL ON TABLE "public"."comcom_survey_questions" TO "anon";
GRANT ALL ON TABLE "public"."comcom_survey_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."comcom_survey_questions" TO "service_role";



GRANT ALL ON TABLE "public"."comcom_survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."comcom_survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."comcom_survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."comcom_surveys" TO "anon";
GRANT ALL ON TABLE "public"."comcom_surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."comcom_surveys" TO "service_role";



GRANT ALL ON TABLE "public"."donations" TO "anon";
GRANT ALL ON TABLE "public"."donations" TO "authenticated";
GRANT ALL ON TABLE "public"."donations" TO "service_role";



GRANT ALL ON TABLE "public"."donor_organizations" TO "anon";
GRANT ALL ON TABLE "public"."donor_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."donor_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."donors" TO "anon";
GRANT ALL ON TABLE "public"."donors" TO "authenticated";
GRANT ALL ON TABLE "public"."donors" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organization_home_pages" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."organization_home_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_home_pages" TO "service_role";



GRANT ALL ON TABLE "public"."organization_scholar_plans" TO "anon";
GRANT ALL ON TABLE "public"."organization_scholar_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_scholar_plans" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."pledges" TO "anon";
GRANT ALL ON TABLE "public"."pledges" TO "authenticated";
GRANT ALL ON TABLE "public"."pledges" TO "service_role";



GRANT ALL ON TABLE "public"."receipts" TO "anon";
GRANT ALL ON TABLE "public"."receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."receipts" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_tiers" TO "anon";
GRANT ALL ON TABLE "public"."subscription_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."users_profiles" TO "anon";
GRANT ALL ON TABLE "public"."users_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."users_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."team_users_view" TO "anon";
GRANT ALL ON TABLE "public"."team_users_view" TO "authenticated";
GRANT ALL ON TABLE "public"."team_users_view" TO "service_role";



GRANT ALL ON TABLE "public"."user_organizations" TO "anon";
GRANT ALL ON TABLE "public"."user_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."yahrzeits" TO "anon";
GRANT ALL ON TABLE "public"."yahrzeits" TO "authenticated";
GRANT ALL ON TABLE "public"."yahrzeits" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

revoke delete on table "public"."organization_home_pages" from "authenticated";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "home_media_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'home-media'::text));



  create policy "home_media_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'home-media'::text));



  create policy "home_media_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'home-media'::text));



  create policy "home_media_upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'home-media'::text));



  create policy "public read home media"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'HOME-MEDIA'::text));



