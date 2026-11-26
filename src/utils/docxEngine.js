import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

// Variabel standar yang selalu otomatis tersedia di setiap surat
export const RESERVED_VARS = [
  'nomor_surat',
  'tanggal_surat',
  'tanggal_indo',
  'perihal',
  'tujuan',
  'kode_jenis',
  'semester',
  'bulan_romawi',
  'tahun',
];

/**
 * Format tanggal YYYY-MM-DD menjadi "26 November 2026"
 */
export function formatTanggalIndo(dateStr) {
  if (!dateStr) return '';
  const bulanIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${bulanIndo[m - 1]} ${y}`;
}

/**
 * Ekstrak semua tag {nama_variabel} dari file .docx (ArrayBuffer)
 * sehingga aplikasi otomatis tahu input apa saja yang dibutuhkan template tersebut.
 */
export function extractVariablesFromDocx(arrayBuffer) {
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const fullText = doc.getFullText();
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  const found = new Set();
  let match;
  while ((match = regex.exec(fullText)) !== null) {
    const varName = match[1].trim();
    if (!RESERVED_VARS.includes(varName)) {
      found.add(varName);
    }
  }
  return Array.from(found);
}

/**
 * Isi template .docx dengan data surat dan kembalikan Blob siap download / upload
 */
export function renderDocxTemplate(arrayBuffer, payload) {
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      return '';
    },
  });

  doc.render(payload);

  return doc.getZip().generate({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Generator file .docx contoh (valid Word document) langsung di browser!
 * Memudahkan staf TU untuk mengunduh contoh template yang sudah berisi placeholder {nomor_surat} dll.
 */
export function generateSampleTemplateBlob(jenis = { kode: 'SPm', nama_jenis: 'Surat Permohonan' }) {
  const zip = new PizZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.folder('_rels').file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.folder('word').file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>SMK MARITIM NUSANTARA KUPANG</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="000000"/></w:pBdr></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Jl. Maritim Nusantara, Kota Kupang - Nusa Tenggara Timur</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/></w:pPr>
      <w:r><w:t>Kupang, {tanggal_indo}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>Nomor    : {nomor_surat}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Lampiran : -</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Perihal  : {perihal}</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>Kepada Yth.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>{tujuan}</w:t></w:r></w:p>
    <w:p><w:r><w:t>di Tempat</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>Dengan hormat,</w:t></w:r></w:p>
    <w:p><w:r><w:t>Sehubungan dengan kegiatan akademik di SMK Maritim Nusantara Kupang, bersama surat ({nama_jenis}) ini kami sampaikan data berikut:</w:t></w:r></w:p>
    <w:p><w:r><w:t>Nama Taruna / Pegawai : {nama_taruna}</w:t></w:r></w:p>
    <w:p><w:r><w:t>NIS / NIP             : {nis}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Program Keahlian      : {jurusan}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Keterangan Tambahan   : {keterangan}</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>Demikian surat ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>Kepala SMK Maritim Nusantara Kupang,</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>_______________________________</w:t></w:r></w:p>
  </w:body>
</w:document>`
  );

  return zip.generate({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export function downloadSampleTemplate(jenis) {
  const blob = generateSampleTemplateBlob(jenis);
  saveAs(blob, `Template_${jenis.kode}_${jenis.nama_jenis.replace(/\s+/g, '_')}.docx`);
}
