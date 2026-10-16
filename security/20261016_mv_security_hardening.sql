-- =====================================================================
-- Dharma-Vocasi: hardening keamanan RPC mv_*  (migration 20261016_mv_security_hardening)
-- Lingkup: HANYA objek mv_*. Tidak menghapus data. Tidak melonggarkan kebijakan.
-- Token __S__ = schema target (staging: mvstg, produksi: public).
-- Rollback: backup/ROLLBACK_functions.sql + bagian ROLLBACK di dokumen rencana.
-- Catatan kompatibilitas: klien yang sudah terpasang memanggil mv_up dengan p_usecret,
--   mv_get/mv_issue TANPA p_usecret. Karena itu klien HARUS diperbarui (index.html) bersamaan.
-- =====================================================================

-- ---------- 0. Struktur tambahan (aditif) ----------
alter table __S__.mv_users    add column if not exists usecret_hash text;
alter table __S__.mv_lockouts add column if not exists streak int not null default 0;

-- ---------- 1. Hapus overload yang menjadi sumber celah / ambiguitas ----------
-- mv_up 5-arg: tidak punya cek kepemilikan sama sekali. mv_get/mv_issue lama: hanya p_key.
drop function if exists __S__.mv_up(text,text,text,text,jsonb);
drop function if exists __S__.mv_up(text,text,text,text,jsonb,text);
drop function if exists __S__.mv_get(text,text);
drop function if exists __S__.mv_issue(text,text,text);

-- ---------- 2. Helper otorisasi kepemilikan (pola tunggal untuk semua RPC) ----------
--  'ok' = usecret cocok | 'unowned' = akun belum ada / belum terkunci | 'denied' = salah/kosong
create or replace function __S__.mv_owner_state(p_key text, p_usecret text)
returns text language plpgsql stable security definer set search_path = __S__, public, extensions as $$
declare v_plain text; v_hash text;
begin
  select usecret, usecret_hash into v_plain, v_hash from __S__.mv_users where ukey = p_key;
  if not found then return 'unowned'; end if;
  if v_hash is null and v_plain is null then return 'unowned'; end if;
  if p_usecret is null or length(p_usecret) < 12 then return 'denied'; end if;
  if v_hash is not null then
    return case when v_hash = encode(extensions.digest(p_usecret, 'sha256'), 'hex') then 'ok' else 'denied' end;
  end if;
  return case when v_plain = p_usecret then 'ok' else 'denied' end;
end $$;

-- ---------- 3. mv_up: otorisasi kepemilikan di backend ----------
create or replace function __S__.mv_up(p_app text, p_key text, p_name text, p_city text, p_prog jsonb, p_usecret text default null)
returns jsonb language plpgsql volatile security definer set search_path = __S__, public, extensions as $$
declare r jsonb; v_state text;
begin
  if not __S__.mv_chk(p_app) or p_key is null or length(p_key) < 8 then return null; end if;
  if length(coalesce(p_name,'')) > 80 or length(coalesce(p_city,'')) > 80 then return null; end if;
  if jsonb_typeof(coalesce(p_prog,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_prog,'[]'::jsonb)) > 500 then return null; end if;

  v_state := __S__.mv_owner_state(p_key, p_usecret);
  if v_state = 'denied' then
    insert into __S__.mv_audit (actor, action, detail) values (left(p_key,4)||'***', 'up_ditolak', 'usecret salah/kosong');
    return null;
  end if;
  if v_state = 'unowned' and (p_usecret is null or length(p_usecret) < 12) then
    insert into __S__.mv_audit (actor, action, detail) values (left(p_key,4)||'***', 'up_ditolak', 'usecret wajib (akun baru/belum terkunci)');
    return null;
  end if;

  insert into __S__.mv_users (ukey, name, city, usecret_hash)
    values (p_key, nullif(p_name,''), nullif(p_city,''), encode(extensions.digest(p_usecret,'sha256'),'hex'))
  on conflict (ukey) do update
    set name = coalesce(excluded.name, __S__.mv_users.name),
        city = coalesce(excluded.city, __S__.mv_users.city),
        usecret_hash = coalesce(__S__.mv_users.usecret_hash, excluded.usecret_hash),
        usecret = case when __S__.mv_users.usecret_hash is not null or excluded.usecret_hash is not null then null else __S__.mv_users.usecret end;

  insert into __S__.mv_progress (ukey, modul, score)
    select p_key, left(m->>'id',64), greatest(0, least(100, coalesce((m->>'s')::int,0)))
    from jsonb_array_elements(coalesce(p_prog,'[]'::jsonb)) m where m->>'id' is not null
  on conflict (ukey, modul) do update
    set score = greatest(__S__.mv_progress.score, excluded.score), updated_at = now();

  select jsonb_build_object('name', (select name from __S__.mv_users where ukey=p_key),
                            'city', (select city from __S__.mv_users where ukey=p_key),
                            'progress', coalesce((select jsonb_object_agg(modul, score) from __S__.mv_progress where ukey=p_key),'{}'::jsonb))
    into r;
  return r;
end $$;

-- ---------- 4. mv_get: data pribadi hanya untuk pemilik ----------
create or replace function __S__.mv_get(p_app text, p_key text, p_usecret text default null)
returns jsonb language plpgsql stable security definer set search_path = __S__, public, extensions as $$
declare v jsonb;
begin
  if not __S__.mv_chk(p_app) or p_key is null or length(p_key) < 8 then return null; end if;
  if __S__.mv_owner_state(p_key, p_usecret) <> 'ok' then return null; end if;
  select jsonb_build_object('name', u.name, 'city', u.city,
         'progress', coalesce((select jsonb_object_agg(modul, score) from __S__.mv_progress where ukey = p_key),'{}'::jsonb))
    into v from __S__.mv_users u where u.ukey = p_key;
  return v;
end $$;

-- ---------- 5. mv_issue: sertifikat hanya diterbitkan untuk pemilik ----------
create or replace function __S__.mv_issue(p_app text, p_key text, p_program text, p_usecret text default null)
returns jsonb language plpgsql volatile security definer set search_path = __S__, public, extensions as $$
declare req jsonb; missing int; v_code text; existing record; r jsonb;
begin
  if not __S__.mv_chk(p_app) or p_key is null or length(p_key) < 8 then return null; end if;
  if __S__.mv_owner_state(p_key, p_usecret) <> 'ok' then
    insert into __S__.mv_audit (actor, action, detail) values (left(p_key,4)||'***', 'issue_ditolak', 'bukan pemilik');
    return null;
  end if;
  select required_mods into req from __S__.mv_programs where program = p_program;
  if req is null then return jsonb_build_object('ok', false, 'msg', 'program tidak dikenal'); end if;
  select count(*) into missing from jsonb_array_elements_text(req) m
   where not exists (select 1 from __S__.mv_progress where ukey = p_key and modul = m and score >= 70);
  if missing > 0 then return jsonb_build_object('ok', false, 'msg', 'belum lulus semua modul'); end if;
  select * into existing from __S__.mv_certs where ukey = p_key and program = p_program;
  if existing is not null then
    return jsonb_build_object('ok', true, 'code', existing.code, 'issued_at', existing.issued_at);
  end if;
  v_code := 'DL-MV-' || upper(substr(encode(extensions.gen_random_bytes(6),'hex'), 1, 8));
  insert into __S__.mv_certs (code, ukey, name, city, program)
    select v_code, p_key, u.name, u.city, p_program from __S__.mv_users u where u.ukey = p_key;
  select jsonb_build_object('ok', true, 'code', v_code, 'issued_at', issued_at) into r from __S__.mv_certs where code = v_code;
  return r;
end $$;

-- ---------- 6. Admin: backoff eksponensial, dukung hash bcrypt, perbandingan konstan ----------
create or replace function __S__.mv_admin_chk(p_pin text)
returns boolean language plpgsql volatile security definer set search_path = __S__, public, extensions as $$
declare v_row record; v_stored text; v_ok boolean := false;
begin
  select * into v_row from __S__.mv_lockouts where target = 'admin_pin';
  if found and v_row.until is not null and v_row.until > now() then return false; end if;
  if p_pin is not null and length(p_pin) between 6 and 64 then
    select sval into v_stored from __S__.mv_secrets where skey = 'admin_pin_hash';
    if v_stored is not null then
      v_ok := (v_stored = extensions.crypt(p_pin, v_stored));
    else
      select sval into v_stored from __S__.mv_secrets where skey = 'admin_pin';
      v_ok := (v_stored is not null and p_pin = v_stored);
    end if;
  end if;
  if v_ok then
    delete from __S__.mv_lockouts where target = 'admin_pin';
    return true;
  end if;
  insert into __S__.mv_lockouts (target, fails, updated_at) values ('admin_pin', 1, now())
    on conflict (target) do update set fails = __S__.mv_lockouts.fails + 1, updated_at = now();
  if (select fails from __S__.mv_lockouts where target='admin_pin') >= 5 then
    update __S__.mv_lockouts
       set streak = streak + 1, fails = 0,
           until = now() + least(interval '24 hours', interval '15 minutes' * power(2, least(streak, 7)))
     where target = 'admin_pin';
  end if;
  insert into __S__.mv_audit (actor, action, detail) values ('?', 'pin_gagal', 'upaya PIN salah (tercatat, tanpa nilai)');
  return false;
end $$;

-- mv_stats: dulu STABLE tapi memanggil fungsi yang menulis -> error "read-only transaction". Jadikan VOLATILE.
create or replace function __S__.mv_stats(p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = __S__, public as $$
begin
  if not __S__.mv_admin_chk(p_pin) then return null; end if;
  return jsonb_build_object(
    'users', (select count(*) from __S__.mv_users),
    'progress', (select count(*) from __S__.mv_progress),
    'units', (select count(*) from __S__.mv_curriculum),
    'certs', (select count(*) from __S__.mv_certs),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('at', at, 'actor', actor, 'action', action, 'detail', detail) order by id desc)
                       from (select * from __S__.mv_audit order by id desc limit 20) a), '[]'::jsonb));
end $$;

-- ---------- 7. Hak eksekusi: helper internal tidak boleh dipanggil langsung oleh anon ----------
revoke execute on function __S__.mv_owner_state(text,text) from public, anon, authenticated;
revoke execute on function __S__.mv_admin_chk(text)        from public, anon, authenticated;
