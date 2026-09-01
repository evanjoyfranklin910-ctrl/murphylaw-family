# MURPHYLAW ONLINE — SUPABASE VERSION

Versi ini memakai:
- Supabase Auth untuk login admin
- Supabase PostgreSQL untuk anggota, silsilah, history, gallery
- Supabase Storage untuk foto
- Row Level Security (RLS) untuk membatasi perubahan hanya ke admin

## 1. Buat project Supabase
Buat satu project baru di Supabase.

## 2. Jalankan database
Buka SQL Editor di dashboard Supabase.
Salin seluruh isi:
supabase/schema.sql
lalu Run.

## 3. Buat akun admin
Di Authentication > Users, buat user email + password.
Setelah user dibuat, salin UUID user tersebut.

Lalu di SQL Editor jalankan:
insert into public.admin_users (user_id)
values ('UUID_USER_ADMIN');

Ganti UUID_USER_ADMIN dengan UUID user tadi.

## 4. Isi konfigurasi website
Buka config.js dan masukkan:
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY

Gunakan publishable/anon key yang memang aman dipakai di browser bersama RLS.
JANGAN memasukkan service_role/secret key ke config.js.

## 5. Jalankan
- index.html = website publik
- admin.html = dashboard admin

Untuk deployment, upload seluruh folder ke hosting static seperti GitHub Pages, Netlify, Vercel, atau hosting web lain.

## 6. Cara kerja
Pengunjung:
- bisa membaca anggota, silsilah, history, gallery
- tidak bisa mengubah database

Admin:
- login dengan Supabase Auth
- bisa tambah/edit/hapus anggota
- memilih orang tua untuk membentuk hubungan silsilah
- upload foto
- mengedit history
- mengedit gallery

## Catatan keamanan
RLS adalah bagian penting dari sistem. Jangan mengandalkan pemeriksaan JavaScript saja.
Jangan pernah memasukkan service_role/secret key ke browser.

Untuk foto keluarga yang boleh dilihat publik, bucket family-photos dibuat public.
Jika suatu saat foto harus private, ubah bucket menjadi private dan gunakan signed URLs dari sisi server.
