// Data & fungsi simulasi lokal (LocalStorage)

const INITIAL_JENIS = [
  { id: '1', kode: 'SPm', nama_jenis: 'Surat Permohonan', template_path: 'sample:SPm', variabel_template: ['nama_taruna', 'nis', 'jurusan', 'keterangan'], aktif: true },
  { id: '2', kode: 'ST', nama_jenis: 'Surat Tugas', template_path: 'sample:ST', variabel_template: ['nama_taruna', 'nis', 'jurusan', 'keterangan'], aktif: true },
  { id: '3', kode: 'SK', nama_jenis: 'Surat Keputusan', template_path: 'sample:SK', variabel_template: ['nama_taruna', 'nis', 'jurusan', 'keterangan'], aktif: true },
  { id: '4', kode: 'SU', nama_jenis: 'Surat Undangan', template_path: 'sample:SU', variabel_template: ['nama_taruna', 'nis', 'jurusan', 'keterangan'], aktif: true },
  { id: '5', kode: 'SPg', nama_jenis: 'Surat Pengantar', template_path: 'sample:SPg', variabel_template: ['nama_taruna', 'nis', 'jurusan', 'keterangan'], aktif: true },
  { id: '6', kode: 'SKet', nama_jenis: 'Surat Keterangan', template_path: 'sample:SKet', variabel_template: ['nama_taruna', 'nis', 'jurusan', 'keterangan'], aktif: true },
  { id: '7', kode: 'MoU', nama_jenis: 'Nota Kesepahaman / Kerja Sama', template_path: 'sample:MoU', variabel_template: ['nama_taruna', 'nis', 'jurusan', 'keterangan'], aktif: true },
];

const INITIAL_STAF = [
  {
    id: 'local-admin-1',
    email: 'admin@smkmn.sch.id',
    nama_lengkap: 'Admin Tata Usaha',
    jabatan: 'Kepala Tata Usaha',
    aktif: true,
    created_at: new Date().toISOString(),
  },
];

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const localBinaryTemplates = new Map();

export function setLocalTemplateBinary(kode, arrayBuffer) {
  localBinaryTemplates.set(kode, arrayBuffer);
}

export function getLocalTemplateBinary(kode) {
  return localBinaryTemplates.get(kode) || null;
}

export function loadLocalJenis() {
  const raw = localStorage.getItem('smk_mn_jenis_surat');
  if (!raw) {
    localStorage.setItem('smk_mn_jenis_surat', JSON.stringify(INITIAL_JENIS));
    return INITIAL_JENIS;
  }
  return JSON.parse(raw);
}

export function saveLocalJenis(list) {
  localStorage.setItem('smk_mn_jenis_surat', JSON.stringify(list));
}

export function loadLocalSurat() {
  const raw = localStorage.getItem('smk_mn_surat_keluar');
  if (!raw) return [];
  return JSON.parse(raw);
}

export function saveLocalSurat(list) {
  localStorage.setItem('smk_mn_surat_keluar', JSON.stringify(list));
}

export function loadLocalStaf() {
  const raw = localStorage.getItem('smk_mn_profil_staf');
  if (!raw) {
    localStorage.setItem('smk_mn_profil_staf', JSON.stringify(INITIAL_STAF));
    return INITIAL_STAF;
  }
  return JSON.parse(raw);
}

export function saveLocalStaf(list) {
  localStorage.setItem('smk_mn_profil_staf', JSON.stringify(list));
}

/**
 * Replika 1:1 dari Trigger PostgreSQL generate_nomor_surat_otomatis()
 */
export function simulatePostgresInsertSurat({ kode_jenis, tanggal_surat, perihal, tujuan, data_variabel, nama_pembuat }) {
  const list = loadLocalSurat();
  const [y, m] = tanggal_surat.split('-').map(Number);
  const v_tahun = y;
  const v_bulan = m;
  const v_semester = v_bulan >= 7 ? 'I' : 'II';
  const v_bulan_romawi = ROMAWI[v_bulan - 1];

  const suratTahunIni = list.filter((s) => Number(s.tahun) === v_tahun);
  const maxUrut = suratTahunIni.reduce((max, s) => Math.max(max, Number(s.nomor_urut || 0)), 0);
  const v_urut_berikutnya = maxUrut + 1;
  const v_urut_str = String(v_urut_berikutnya).padStart(Math.max(3, String(v_urut_berikutnya).length), '0');

  const nomor_surat_lengkap = `${v_urut_str}/${kode_jenis}/SMK.MN/${v_semester}/${v_bulan_romawi}/${v_tahun}`;

  const newRow = {
    id: crypto.randomUUID(),
    nomor_urut: v_urut_berikutnya,
    nomor_surat_lengkap,
    kode_jenis,
    tanggal_surat,
    semester: v_semester,
    bulan_romawi: v_bulan_romawi,
    tahun: v_tahun,
    perihal,
    tujuan,
    data_variabel: data_variabel || {},
    file_arsip_path: null,
    nama_pembuat: nama_pembuat || 'Staf TU',
    created_at: new Date().toISOString(),
  };

  const updated = [newRow, ...list];
  saveLocalSurat(updated);
  return newRow;
}
