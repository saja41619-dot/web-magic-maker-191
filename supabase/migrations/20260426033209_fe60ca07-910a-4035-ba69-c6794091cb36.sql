create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy "Anyone can send a message" on public.contact_messages;

create policy "Anyone can send a message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (
    length(trim(name)) between 1 and 100
    and length(trim(email)) between 3 and 255
    and email like '%@%.%'
    and length(trim(message)) between 1 and 2000
  );