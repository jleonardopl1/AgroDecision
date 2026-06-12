-- ============================================================================
-- 0005_signup_and_branding.sql
-- Trigger de signup: cria public.cooperados a partir de auth.users
-- (raw_user_meta_data), vinculando a cooperativa pelo slug informado no
-- cadastro (padrão: 'demo'). Resolve a nota do seed.sql: "insert de cooperado
-- é feito via trigger de signup / service role".
-- + RPC pública de branding para o portal co-branded /c/<slug> (pré-login),
--   sem expor a tabela cooperativas ao papel anon.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coop_id uuid;
  v_slug    text;
begin
  v_slug := coalesce(new.raw_user_meta_data->>'cooperativa_slug', 'demo');

  select id into v_coop_id from public.cooperativas where slug = v_slug;
  if v_coop_id is null then
    select id into v_coop_id from public.cooperativas where slug = 'demo';
  end if;
  if v_coop_id is null then
    raise exception 'AgroDecision: nenhuma cooperativa encontrada para o slug "%"', v_slug;
  end if;

  insert into public.cooperados (id, cooperativa_id, nome, email, culturas)
  values (
    new.id,
    v_coop_id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(
      case when jsonb_typeof(new.raw_user_meta_data->'culturas') = 'array'
        then (select array_agg(x)
                from jsonb_array_elements_text(new.raw_user_meta_data->'culturas') as t(x))
      end,
      '{}'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Branding co-branded por slug (anon pode chamar; retorna só colunas de marca)
-- ----------------------------------------------------------------------------
create or replace function public.get_coop_branding(p_slug text)
returns table (
  nome           text,
  slug           text,
  logo_url       text,
  cor_primaria   text,
  cor_secundaria text
)
language sql
stable
security definer
set search_path = public
as $$
  select nome, slug, logo_url, cor_primaria, cor_secundaria
  from public.cooperativas
  where slug = p_slug
    and status in ('trial','active');
$$;

grant execute on function public.get_coop_branding(text) to anon, authenticated;
