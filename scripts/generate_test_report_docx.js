const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber,
} = require("docx");

const jsonPath = process.argv[2] || path.join(__dirname, "..", "test_reports", "full_system_test_latest.json");
const outPath = process.argv[3] || path.join(__dirname, "..", "test_reports", "Bildir_Full_System_Test_Report.docx");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const PAGE_W = 11906, MARGIN = 1008, CONTENT_W = PAGE_W - MARGIN * 2;
const BLUE = "1E3A5F", DARK = "0F172A", GRAY = "64748B";
const border = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
const borders = { top: border, bottom: border, left: border, right: border };
const hBorder = { style: BorderStyle.SINGLE, size: 4, color: BLUE };
const hBorders = { top: hBorder, bottom: hBorder, left: hBorder, right: hBorder };

function cell(text, w, o = {}) {
  return new TableCell({
    borders: o.header ? hBorders : borders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: o.fill || (o.header ? BLUE : "FFFFFF"), type: ShadingType.CLEAR },
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    children: [new Paragraph({
      children: [new TextRun({
        text: String(text ?? ""),
        font: "Arial",
        size: o.size || 16,
        bold: !!(o.header || o.bold),
        color: o.color || (o.header ? "FFFFFF" : DARK),
      })],
    })],
  });
}
function p(t, o = {}) {
  return new Paragraph({
    spacing: { after: o.after ?? 80 },
    alignment: o.align,
    children: [new TextRun({
      text: t, font: "Arial", size: o.size || 20, bold: o.bold,
      color: o.color || DARK, italics: o.italics,
    })],
  });
}
function h1(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: t, font: "Arial", size: 28, bold: true, color: BLUE })],
  });
}
function h2(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text: t, font: "Arial", size: 24, bold: true, color: "1E40AF" })],
  });
}

const s = data.summary;
const cats = Object.entries(s.by_category || {});
const fails = data.failures || [];
const models = data.models || [];
const results = data.results || [];
const byCat = {};
for (const r of results) {
  (byCat[r.category] = byCat[r.category] || []).push(r);
}

const children = [
  p("TOLIQ TIZIM TEST HISOBOTI", { size: 16, color: "0EA5E9", bold: true, align: AlignmentType.CENTER }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({
      text: "Bildir (auth-starter) — sahifalar, API, modellar",
      font: "Arial", size: 30, bold: true, color: BLUE,
    })],
  }),
  p(`Sana: ${data.started_at}  ->  ${data.finished_at}`, { size: 15, color: GRAY, align: AlignmentType.CENTER }),
  p(`Frontend: ${data.targets.frontend}`, { size: 15, color: GRAY, align: AlignmentType.CENTER }),
  p(`API: ${data.targets.api}`, { size: 15, color: GRAY, align: AlignmentType.CENTER }),
  p(`Admin: ${data.admin}`, { size: 15, color: GRAY, align: AlignmentType.CENTER, after: 160 }),

  h1("1. Umumiy natija"),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [2472, 2472, 2473, 2473],
    rows: [
      new TableRow({ children: [
        cell("JAMI", 2472, { header: true }),
        cell("PASS", 2472, { header: true, fill: "166534" }),
        cell("FAIL", 2473, { header: true, fill: "991B1B" }),
        cell("PASS %", 2473, { header: true }),
      ] }),
      new TableRow({ children: [
        cell(String(s.total), 2472, { bold: true, size: 28 }),
        cell(String(s.passed), 2472, { bold: true, size: 28, color: "166534", fill: "DCFCE7" }),
        cell(String(s.failed), 2473, { bold: true, size: 28, color: "991B1B", fill: s.failed ? "FEE2E2" : "DCFCE7" }),
        cell(`${s.pass_rate}%`, 2473, { bold: true, size: 28, fill: s.failed ? "FEF9C3" : "DCFCE7" }),
      ] }),
    ],
  }),
  p(`JWT token: ${s.token_ok ? "olindi (OK)" : "yoq"}`, { after: 120 }),

  h1("2. Kategoriya boyicha"),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [3296, 2198, 2198, 2198],
    rows: [
      new TableRow({ children: [
        cell("Kategoriya", 3296, { header: true }),
        cell("Pass", 2198, { header: true }),
        cell("Fail", 2198, { header: true }),
        cell("Jami", 2198, { header: true }),
      ] }),
      ...cats.map(([k, v]) => new TableRow({ children: [
        cell(k, 3296, { bold: true, size: 17 }),
        cell(String(v.pass), 2198, { size: 17, fill: "DCFCE7" }),
        cell(String(v.fail), 2198, { size: 17, fill: v.fail ? "FEE2E2" : "FFFFFF" }),
        cell(String(v.pass + v.fail), 2198, { size: 17 }),
      ] })),
    ],
  }),

  h1("3. Frontend sahifalar"),
  p("Barcha Next.js route lar HTTP darajasida tekshirildi (200). Client-side role guard brauzerda ishlaydi.", { size: 17, color: GRAY }),
];

const fe = results.filter((r) => r.category === "frontend");
children.push(new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [4200, 1200, 1200, 3290],
  rows: [
    new TableRow({ children: [
      cell("Sahifa", 4200, { header: true }),
      cell("HTTP", 1200, { header: true }),
      cell("Natija", 1200, { header: true }),
      cell("ms", 3290, { header: true }),
    ] }),
    ...fe.map((r) => new TableRow({ children: [
      cell(r.name, 4200, { size: 15 }),
      cell(String(r.status), 1200, { size: 15 }),
      cell(r.ok ? "PASS" : "FAIL", 1200, { size: 15, fill: r.ok ? "DCFCE7" : "FEE2E2", bold: true }),
      cell(String(r.ms), 3290, { size: 15 }),
    ] })),
  ],
}));

children.push(h1("4. API endpointlar"));
for (const cat of ["infra", "auth", "catalog", "surveys", "office", "news", "compliance", "security"]) {
  const rows = byCat[cat] || [];
  if (!rows.length) continue;
  children.push(h2(cat.toUpperCase()));
  children.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [3600, 900, 900, 900, 3590],
    rows: [
      new TableRow({ children: [
        cell("Test", 3600, { header: true }),
        cell("Method", 900, { header: true }),
        cell("HTTP", 900, { header: true }),
        cell("Natija", 900, { header: true }),
        cell("Izoh", 3590, { header: true }),
      ] }),
      ...rows.map((r) => new TableRow({ children: [
        cell(r.name, 3600, { size: 14 }),
        cell(r.method, 900, { size: 14 }),
        cell(String(r.status ?? "-"), 900, { size: 14 }),
        cell(r.ok ? "PASS" : "FAIL", 900, { size: 14, fill: r.ok ? "DCFCE7" : "FEE2E2", bold: true }),
        cell(String(r.detail || r.url || "").slice(0, 70), 3590, { size: 12 }),
      ] })),
    ],
  }));
}

children.push(h1("5. Modellar (ORM count)"));
if (models.length) {
  children.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [6000, 1945, 1945],
    rows: [
      new TableRow({ children: [
        cell("Model", 6000, { header: true }),
        cell("Count", 1945, { header: true }),
        cell("Status", 1945, { header: true }),
      ] }),
      ...models.map((m) => new TableRow({ children: [
        cell(m.model, 6000, { size: 15 }),
        cell(String(m.count ?? "-"), 1945, { size: 15 }),
        cell(m.ok ? "OK" : "ERR", 1945, { size: 15, fill: m.ok ? "DCFCE7" : "FEE2E2" }),
      ] })),
    ],
  }));
  children.push(p(`DB vendor: ${data.db_vendor || "n/a"}`, { size: 17, color: GRAY, after: 120 }));
}

children.push(h1("6. Xatolar"));
if (!fails.length) {
  children.push(p("Hech qanday muvaffaqiyatsiz test yoq — 100% otdi.", { bold: true, color: "166534" }));
} else {
  children.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [2000, 3500, 4390],
    rows: [
      new TableRow({ children: [
        cell("Kategoriya", 2000, { header: true }),
        cell("Nom", 3500, { header: true }),
        cell("Detail", 4390, { header: true }),
      ] }),
      ...fails.map((f) => new TableRow({ children: [
        cell(f.category, 2000, { size: 14 }),
        cell(f.name, 3500, { size: 14 }),
        cell(`${f.detail || ""} HTTP ${f.status}`, 4390, { size: 14 }),
      ] })),
    ],
  }));
}

children.push(h1("7. Qamrov eslatmasi"));
[
  "Frontend: HTTP 200 = sahifa yuklanadi; tugmalar interaktiv UI (client) — brauzer E2E alohida tavsiya etiladi.",
  "API: GET/POST smoke + auth; create appeal haqiqiy POST (unique_code tekshirildi).",
  "Models: barcha Django modellari count query orqali.",
  "HEMIS real login: notogri credential bilan 401 (kutilgan); live HEMIS akkaunt bilan alohida test kerak.",
  "Survey questions GET 405: endpoint method cheklovi — kutilgan holat sifatida qayd etildi.",
  "Cookie+Bearer auth: login session cookie va JWT ikkalasi ishlaydi; unauth testlar toza session bilan.",
].forEach((t) => children.push(p(`• ${t}`, { size: 17 })));

children.push(p("--- Hisobot oxiri ---", { align: AlignmentType.CENTER, size: 15, color: GRAY, italics: true }));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "1E40AF" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: 16838 },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: BLUE, space: 6 } },
          children: [new TextRun({ text: "Bildir Full System Test  ·  CONFIDENTIAL", font: "Arial", size: 14, color: GRAY })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Sahifa ", font: "Arial", size: 14, color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 14, color: GRAY }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log("WROTE", outPath);
});
