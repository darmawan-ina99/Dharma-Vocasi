-- ROLLBACK: pulihkan definisi fungsi mv_* ke kondisi sebelum perubahan
CREATE OR REPLACE FUNCTION public.mv_admin_chk(p_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_pin text; v_row record;
begin
  -- cek lockout: kalau masih dalam masa kunci, tolak
  select * into v_row from mv_lockouts where target = 'admin_pin';
  if found and v_row.until is not null and v_row.until > now() then
    return false;
  end if;
  -- ambil PIN dari tabel rahasia (bukan lagi plaintext di badan fungsi)
  select sval into v_pin from mv_secrets where skey = 'admin_pin';
  if p_pin = v_pin then
    delete from mv_lockouts where target = 'admin_pin';  -- berhasil: reset hitungan
    return true;
  end if;
  -- gagal: naikkan hitungan, kunci setelah 5x, log ke audit (tanpa menyimpan nilai PIN)
  insert into mv_lockouts (target, fails, updated_at) values ('admin_pin', 1, now())
    on conflict (target) do update set fails = mv_lockouts.fails + 1, updated_at = now();
  if (select fails from mv_lockouts where target = 'admin_pin') >= 5 then
    update mv_lockouts set until = now() + interval '15 minutes' where target = 'admin_pin';
  end if;
  insert into mv_audit (actor, action, detail) values ('?', 'pin_gagal', 'upaya PIN salah (tercatat, tanpa nilai)');
  return false;
end
$function$;

CREATE OR REPLACE FUNCTION public.mv_chk(p_app text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p_app = (select sval from mv_secrets where skey = 'app_key')
$function$;

CREATE OR REPLACE FUNCTION public.mv_get(p_app text, p_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when mv_chk(p_app) and length(p_key) >= 8 then
    jsonb_build_object(
      'name', u.name, 'city', u.city,
      'progress', coalesce((select jsonb_object_agg(modul, score) from mv_progress where ukey = p_key), '{}'::jsonb))
  end
  from mv_users u where u.ukey = p_key
$function$;

CREATE OR REPLACE FUNCTION public.mv_issue(p_app text, p_key text, p_program text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare req jsonb; missing int; v_code text; existing record; r jsonb;
begin
  if not mv_chk(p_app) or length(p_key) < 8 then return null; end if;
  select required_mods into req from mv_programs where program = p_program;
  if req is null then return jsonb_build_object('ok', false, 'msg', 'program tidak dikenal'); end if;
  select count(*) into missing
  from jsonb_array_elements_text(req) m
  where not exists (select 1 from mv_progress where ukey = p_key and modul = m and score >= 70);
  if missing > 0 then return jsonb_build_object('ok', false, 'msg', 'belum lulus semua modul'); end if;
  select * into existing from mv_certs where ukey = p_key and program = p_program;
  if existing is not null then
    return jsonb_build_object('ok', true, 'code', existing.code, 'issued_at', existing.issued_at);
  end if;
  v_code := 'DL-MV-' || upper(substr(md5(p_key || p_program || random()::text), 1, 8));
  insert into mv_certs (code, ukey, name, city, program)
    select v_code, p_key, u.name, u.city, p_program from mv_users u where u.ukey = p_key;
  select jsonb_build_object('ok', true, 'code', v_code, 'issued_at', issued_at) into r from mv_certs where code = v_code;
  return r;
end
$function$;

CREATE OR REPLACE FUNCTION public.mv_kur_del(p_pin text, p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not mv_admin_chk(p_pin) then return jsonb_build_object('ok', false); end if;
  delete from mv_curriculum where id = p_id;
  insert into mv_audit (actor, action, detail) values ('admin', 'kur_del', p_id);
  return jsonb_build_object('ok', true);
end
$function$;

CREATE OR REPLACE FUNCTION public.mv_kur_get(p_app text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when mv_chk(p_app) then
    coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'track', coalesce(c.track,'sd'), 'kelas', c.kelas, 'semester', c.semester,
      'level', c.level, 'mapel', c.mapel,
      'judul', c.unit->>'judul', 'materi', c.unit->>'materi',
      'tujuan', c.unit->>'tujuan', 'kompetensi', c.unit->>'kompetensi', 'sumber', c.unit->>'sumber',
      'soal', c.unit->'soal', 'status', c.unit->>'status', 'reviewed', c.reviewed,
      'updated_at', c.updated_at)
      order by c.track, c.kelas, c.mapel, c.id) from mv_curriculum c), '[]'::jsonb)
  end
$function$;

CREATE OR REPLACE FUNCTION public.mv_kur_save(p_pin text, p_units jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare u jsonb; n int := 0; v_track text; v_kelas int;
begin
  if not mv_admin_chk(p_pin) then
    insert into mv_audit (actor, action, detail) values ('?', 'kur_save_ditolak', 'PIN salah');
    return jsonb_build_object('ok', false, 'msg', 'PIN salah');
  end if;
  for u in select * from jsonb_array_elements(coalesce(p_units, '[]'::jsonb)) loop
    v_track := coalesce(u->>'track','sd');
    v_kelas := coalesce((u->>'kelas')::int, 0);
    if v_track in ('sd','smp','sma','smk') and not v_kelas between 1 and 12 then
      return jsonb_build_object('ok', false, 'msg', 'kelas 1-12 utk jalur sekolah');
    end if;
    if v_track not in ('sd','smp','sma','smk','lang','ai','voc') then
      return jsonb_build_object('ok', false, 'msg', 'track tidak dikenal');
    end if;
    if length(coalesce(u->>'id','')) < 3 or length(coalesce(u->>'mapel','')) < 2 then
      return jsonb_build_object('ok', false, 'msg', 'id/mapel tidak valid');
    end if;
    insert into mv_curriculum (id, kelas, semester, mapel, unit, reviewed, updated_at, track, level)
      values (u->>'id', v_kelas, coalesce((u->>'semester')::int,1), u->>'mapel', u,
              coalesce((u->>'reviewed')::boolean,false), now(), v_track, nullif(u->>'level',''))
    on conflict (id) do update set
      kelas = excluded.kelas, semester = excluded.semester, mapel = excluded.mapel,
      unit = excluded.unit, reviewed = excluded.reviewed, updated_at = now(),
      track = excluded.track, level = excluded.level;
    n := n + 1;
  end loop;
  insert into mv_audit (actor, action, detail) values ('admin', 'kur_save', n || ' unit');
  return jsonb_build_object('ok', true, 'saved', n);
end
$function$;

CREATE OR REPLACE FUNCTION public.mv_stats(p_pin text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when mv_admin_chk(p_pin) then jsonb_build_object(
    'users', (select count(*) from mv_users),
    'progress', (select count(*) from mv_progress),
    'units', (select count(*) from mv_curriculum),
    'certs', (select count(*) from mv_certs),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('at', at, 'actor', actor, 'action', action, 'detail', detail) order by id desc) from (select * from mv_audit order by id desc limit 20) a), '[]'::jsonb))
  end
$function$;

CREATE OR REPLACE FUNCTION public.mv_up(p_app text, p_key text, p_name text, p_city text, p_prog jsonb, p_usecret text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb; v_sec text;
begin
  if not mv_chk(p_app) or p_key is null or length(p_key) < 8 then return null; end if;
  -- ===== PATCH KEAMANAN: otorisasi kepemilikan ukey =====
  -- jika ukey SUDAH terkunci (usecret terpasang), pemanggil wajib membawa usecret yang sama
  select usecret into v_sec from mv_users where ukey = p_key;
  if v_sec is not null and (p_usecret is null or p_usecret <> v_sec) then
    insert into mv_audit (actor, action, detail) values (p_key, 'up_ditolak', 'usecret salah/kosong');
    return null;
  end if;
  -- usecret baru dikunci saat pertama kali diberikan (min 12 char); lama tanpa usecret tetap null (transisi)
  insert into mv_users (ukey, name, city, usecret)
    values (p_key, nullif(p_name,''), nullif(p_city,''),
            case when p_usecret is not null and length(p_usecret) >= 12 then p_usecret else null end)
  on conflict (ukey) do update
    set name = coalesce(excluded.name, mv_users.name),
        city = coalesce(excluded.city, mv_users.city),
        usecret = coalesce(mv_users.usecret, excluded.usecret);
  insert into mv_progress (ukey, modul, score)
    select p_key, m->>'id', greatest(0, least(100, (m->>'s')::int))
    from jsonb_array_elements(coalesce(p_prog, '[]'::jsonb)) m
  on conflict (ukey, modul) do update
    set score = greatest(mv_progress.score, excluded.score), updated_at = now();
  select jsonb_build_object('name', coalesce(nullif(p_name,''), (select name from mv_users where ukey=p_key)),
                            'city', coalesce(nullif(p_city,''), (select city from mv_users where ukey=p_key)),
                            'progress', coalesce((select jsonb_object_agg(modul, score) from mv_progress where ukey=p_key), '{}'::jsonb))
    into r;
  return r;
end $function$;

CREATE OR REPLACE FUNCTION public.mv_up(p_app text, p_key text, p_name text, p_city text, p_prog jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb;
begin
  if not mv_chk(p_app) or p_key is null or length(p_key) < 8 then return null; end if;
  insert into mv_users (ukey, name, city) values (p_key, nullif(p_name,''), nullif(p_city,''))
    on conflict (ukey) do update set name = coalesce(excluded.name, mv_users.name), city = coalesce(excluded.city, mv_users.city);
  insert into mv_progress (ukey, modul, score)
    select p_key, m->>'id', greatest(0, least(100, (m->>'s')::int))
    from jsonb_array_elements(coalesce(p_prog, '[]'::jsonb)) m
  on conflict (ukey, modul) do update
    set score = greatest(mv_progress.score, excluded.score), updated_at = now();
  select jsonb_build_object('name', coalesce(nullif(p_name,''), (select name from mv_users where ukey=p_key)),
                            'city', coalesce(nullif(p_city,''), (select city from mv_users where ukey=p_key)),
                            'progress', coalesce((select jsonb_object_agg(modul, score) from mv_progress where ukey=p_key), '{}'::jsonb))
    into r;
  return r;
end
$function$;

CREATE OR REPLACE FUNCTION public.mv_verify(p_app text, p_code text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when mv_chk(p_app) then
    coalesce((select jsonb_build_object('ok', true, 'name', name, 'city', city, 'program', program, 'issued_at', issued_at)
              from mv_certs where upper(code) = upper(nullif(p_code,''))),
             jsonb_build_object('ok', false))
  end
$function$;
