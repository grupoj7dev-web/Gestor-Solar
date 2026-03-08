-- Create a new storage bucket for documents
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Set up access policies for the documents bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'documents' );

create policy "Authenticated Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'documents' AND auth.role() = 'authenticated' );

create policy "Authenticated Updates"
  on storage.objects for update
  using ( bucket_id = 'documents' AND auth.role() = 'authenticated' );

create policy "Authenticated Deletes"
  on storage.objects for delete
  using ( bucket_id = 'documents' AND auth.role() = 'authenticated' );
