-- =========================================================================
-- SKEMA SQL LENGKAP: PENOMORAN SURAT, TEMPLATE DOCX & AKUN STAF
-- Jalankan script ini di SQL Editor Supabase
-- =========================================================================

-- 1. TABEL MASTER JENIS SURAT & TEMPLATE
CREATE TABLE IF NOT EXISTS public.jenis_surat (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode VARCHAR(20) NOT NULL UNIQUE,
    nama_jenis VARCHAR(100) NOT NULL,
    template_path TEXT,
    variabel_template JSONB DEFAULT '[]'::jsonb,
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.jenis_surat
ADD COLUMN IF NOT EXISTS variabel_template JSONB DEFAULT '[]'::jsonb;

INSERT INTO public.jenis_surat (kode, nama_jenis, variabel_template) VALUES
    ('SPm', 'Surat Permohonan', '["nama_taruna", "nis", "jurusan"]'::jsonb),
    ('ST', 'Surat Tugas', '["nama_pegawai", "jabatan", "tempat_tugas", "tanggal_tugas"]'::jsonb),
    ('SK', 'Surat Keputusan', '["tentang", "nama_ketua"]'::jsonb),
    ('SU', 'Surat Undangan', '["hari_tanggal", "waktu", "tempat", "acara"]'::jsonb),
    ('SPg', 'Surat Pengantar', '["jenis_dokumen", "jumlah_berkas"]'::jsonb),
    ('SKet', 'Surat Keterangan', '["nama_taruna", "nis", "jurusan", "keterangan"]'::jsonb),
    ('MoU', 'Nota Kesepahaman / Kerja Sama', '["pihak_kedua", "jabatan_mitra"]'::jsonb)
ON CONFLICT (kode) DO NOTHING;

-- 2. TABEL DAFTAR AKUN STAF (PROFIL USER)
CREATE TABLE IF NOT EXISTS public.profil_staf (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nama_lengkap TEXT NOT NULL,
    jabatan TEXT DEFAULT 'Staf Tata Usaha',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABEL BUKU AGENDA SURAT KELUAR
CREATE TABLE IF NOT EXISTS public.surat_keluar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nomor_urut INT NOT NULL,
    nomor_surat_lengkap VARCHAR(100) UNIQUE,
    kode_jenis VARCHAR(20) NOT NULL REFERENCES public.jenis_surat(kode) ON UPDATE CASCADE ON DELETE RESTRICT,
    tanggal_surat DATE NOT NULL DEFAULT CURRENT_DATE,
    semester VARCHAR(5) NOT NULL,
    bulan_romawi VARCHAR(5) NOT NULL,
    tahun INT NOT NULL,
    perihal TEXT NOT NULL,
    tujuan TEXT NOT NULL,
    data_variabel JSONB DEFAULT '{}'::jsonb,
    file_arsip_path TEXT,
    dibuat_oleh UUID DEFAULT auth.uid() REFERENCES auth.users(id),
    nama_pembuat TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT unique_urut_per_tahun UNIQUE (tahun, nomor_urut)
);

ALTER TABLE public.surat_keluar
ADD COLUMN IF NOT EXISTS nama_pembuat TEXT;

-- 4. FUNGSI KONVERSI ANGKA KE ROMAWI (1 - 12)
CREATE OR REPLACE FUNCTION public.bulan_ke_romawi(bulan INT)
RETURNS VARCHAR
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    romawi_arr VARCHAR[] := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
BEGIN
    IF bulan < 1 OR bulan > 12 THEN
        RAISE EXCEPTION 'Bulan tidak valid: %', bulan;
    END IF;
    RETURN romawi_arr[bulan];
END;
$$;

-- 5. FUNGSI TRIGGER PENOMORAN & SEMESTER OTOMATIS
CREATE OR REPLACE FUNCTION public.generate_nomor_surat_otomatis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tahun INT;
    v_bulan INT;
    v_semester VARCHAR(5);
    v_bulan_romawi VARCHAR(5);
    v_urut_berikutnya INT;
    v_urut_str TEXT;
    v_kode_instansi VARCHAR := 'SMK.MN';
    v_nama_staf TEXT;
BEGIN
    v_tahun := EXTRACT(YEAR FROM NEW.tanggal_surat)::INT;
    v_bulan := EXTRACT(MONTH FROM NEW.tanggal_surat)::INT;

    IF v_bulan >= 7 THEN
        v_semester := 'I';
    ELSE
        v_semester := 'II';
    END IF;

    v_bulan_romawi := public.bulan_ke_romawi(v_bulan);

    -- Kunci transaksi per tahun (anti race-condition)
    PERFORM pg_advisory_xact_lock(hashtext('surat_keluar_' || v_tahun::TEXT));

    SELECT COALESCE(MAX(nomor_urut), 0) + 1
    INTO v_urut_berikutnya
    FROM public.surat_keluar
    WHERE tahun = v_tahun;

    -- Format 3 digit (001..999) dan aman jika >= 1000
    v_urut_str := LPAD(v_urut_berikutnya::TEXT, GREATEST(3, LENGTH(v_urut_berikutnya::TEXT)), '0');

    -- Ambil nama pembuat otomatis dari profil_staf jika belum diisi
    IF NEW.dibuat_oleh IS NULL THEN
        NEW.dibuat_oleh := auth.uid();
    END IF;

    IF NEW.nama_pembuat IS NULL AND NEW.dibuat_oleh IS NOT NULL THEN
        SELECT nama_lengkap INTO v_nama_staf
        FROM public.profil_staf
        WHERE id = NEW.dibuat_oleh;
        NEW.nama_pembuat := v_nama_staf;
    END IF;

    NEW.tahun := v_tahun;
    NEW.semester := v_semester;
    NEW.bulan_romawi := v_bulan_romawi;
    NEW.nomor_urut := v_urut_berikutnya;
    NEW.nomor_surat_lengkap := v_urut_str || '/' ||
                               NEW.kode_jenis || '/' ||
                               v_kode_instansi || '/' ||
                               v_semester || '/' ||
                               v_bulan_romawi || '/' ||
                               v_tahun::TEXT;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_before_insert_surat_keluar ON public.surat_keluar;
CREATE TRIGGER trg_before_insert_surat_keluar
BEFORE INSERT ON public.surat_keluar
FOR EACH ROW
EXECUTE FUNCTION public.generate_nomor_surat_otomatis();

-- 6. GRANT & ROW LEVEL SECURITY (RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.jenis_surat TO anon, authenticated;
GRANT ALL ON TABLE public.surat_keluar TO anon, authenticated;
GRANT ALL ON TABLE public.profil_staf TO anon, authenticated;

ALTER TABLE public.jenis_surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_staf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kelola jenis surat" ON public.jenis_surat;
CREATE POLICY "Kelola jenis surat"
ON public.jenis_surat FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Lihat agenda surat" ON public.surat_keluar;
DROP POLICY IF EXISTS "Buat surat baru" ON public.surat_keluar;
DROP POLICY IF EXISTS "Update data/file surat" ON public.surat_keluar;
DROP POLICY IF EXISTS "Kelola surat keluar" ON public.surat_keluar;
CREATE POLICY "Kelola surat keluar"
ON public.surat_keluar FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Kelola profil staf" ON public.profil_staf;
CREATE POLICY "Kelola profil staf"
ON public.profil_staf FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 7. STORAGE BUCKET UNTUK TEMPLATE DOCX
INSERT INTO storage.buckets (id, name, public)
VALUES ('surat', 'surat', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Akses publik bucket surat" ON storage.objects;
CREATE POLICY "Akses publik bucket surat"
ON storage.objects FOR ALL
TO authenticated, anon
USING (bucket_id = 'surat')
WITH CHECK (bucket_id = 'surat');
