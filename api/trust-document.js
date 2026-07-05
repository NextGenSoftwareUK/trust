const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } = require('docx');
const { getBearerToken, createClient } = require('./_oasis');

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;

function wrapText(text, font, fontSize, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildTrustDeedPdf(data, trustName) {
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const navy = rgb(0.06, 0.13, 0.27);
  const grey = rgb(0.35, 0.38, 0.45);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  function newPageIfNeeded(needed) {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function heading(text, size = 13) {
    newPageIfNeeded(size + 20);
    y -= size + 6;
    page.drawText(text, { x: MARGIN, y, size, font: serifBold, color: navy });
    y -= 8;
  }

  function paragraph(text, { size = 11, font = serif, color = rgb(0.1, 0.1, 0.12), gap = 14 } = {}) {
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      newPageIfNeeded(gap);
      y -= gap;
      page.drawText(line, { x: MARGIN, y, size, font, color });
    }
    y -= 6;
  }

  function field(label, value) {
    paragraph(`${label}: ${value || '—'}`, { size: 11, gap: 16 });
  }

  // Title block
  newPageIfNeeded(60);
  y -= 30;
  page.drawText('EXPRESS PRIVATE TRUST DEED', { x: MARGIN, y, size: 20, font: serifBold, color: navy });
  y -= 18;
  page.drawText(trustName || 'Untitled Trust', { x: MARGIN, y, size: 14, font: serifItalic, color: grey });
  y -= 10;
  paragraph('Prepared using SovereignTrust.net — educational and administrative document preparation only. This document is a template and does not constitute legal advice.', {
    size: 9,
    font: serifItalic,
    color: grey,
    gap: 12
  });

  const overview = data.overview || {};
  const settlor = data.settlor || {};
  const protector = data.protector || {};
  const signing = data.signing || {};

  heading('1. Trust Identification');
  field('Trust Name', overview.name);
  field('Date of Deed', overview.creationDate);
  field('Governing Jurisdiction', overview.jurisdiction);
  field('Initial Trust Property', overview.initialProperty);

  heading('2. Trust Purpose');
  paragraph(
    overview.purpose ||
      'To hold, manage and distribute the trust assets for the benefit of the named beneficiaries in accordance with the terms set out herein and any Memorandum of Wishes provided by the Settlor from time to time.'
  );

  heading('3. The Settlor');
  field('Name', settlor.name);
  field('Address', settlor.address);
  field('Email', settlor.email);
  field('Phone', settlor.phone);

  heading('4. The Trustee(s)');
  const trustees = (data.trustees || []).filter((t) => t.name);
  if (!trustees.length) {
    paragraph('No trustees have been appointed.', { font: serifItalic, color: grey });
  } else {
    trustees.forEach((t, i) => {
      paragraph(`Trustee ${i + 1}: ${t.name}`, { font: serifBold, gap: 16 });
      if (t.address) paragraph(`Address: ${t.address}`, { size: 10 });
      if (t.email) paragraph(`Email: ${t.email}`, { size: 10 });
      if (t.phone) paragraph(`Phone: ${t.phone}`, { size: 10 });
    });
  }

  heading('5. The Beneficiaries');
  const beneficiaries = (data.beneficiaries || []).filter((b) => b.name);
  if (!beneficiaries.length) {
    paragraph('No beneficiaries have been named.', { font: serifItalic, color: grey });
  } else {
    beneficiaries.forEach((b, i) => {
      paragraph(`Beneficiary ${i + 1}: ${b.name}${b.relationship ? ` (${b.relationship})` : ''}`, { font: serifBold, gap: 16 });
      if (b.address) paragraph(`Address: ${b.address}`, { size: 10 });
      if (b.type) paragraph(`Type: ${b.type}`, { size: 10 });
    });
  }

  heading('6. The Protector');
  if (protector.name) {
    field('Name', protector.name);
    field('Address', protector.address);
    field('Email', protector.email);
  } else {
    paragraph('No Protector has been appointed for this trust.', { font: serifItalic, color: grey });
  }

  heading('7. Execution');
  field('Place of Signing', signing.place);
  paragraph('IN WITNESS WHEREOF the Settlor and Trustee(s) have executed this Deed on the date first written above, in the presence of the witnesses named below.', { gap: 16 });

  paragraph(`Witness 1: ${signing.witness1?.name || '—'}`, { font: serifBold, gap: 18 });
  if (signing.witness1?.address) paragraph(`Address: ${signing.witness1.address}`, { size: 10 });
  paragraph(`Witness 2: ${signing.witness2?.name || '—'}`, { font: serifBold, gap: 18 });
  if (signing.witness2?.address) paragraph(`Address: ${signing.witness2.address}`, { size: 10 });

  newPageIfNeeded(60);
  y -= 30;
  paragraph(
    'This document has been generated using SovereignTrust.net for educational and administrative document preparation purposes only. Before signing or acting upon this document, you should have it reviewed by a qualified legal professional in your jurisdiction, ensure proper execution in accordance with local legal requirements, and obtain independent legal, tax, and financial advice.',
    { size: 9, font: serifItalic, color: grey, gap: 12 }
  );

  return doc.save();
}

async function buildTrustDeedDocx(data, trustName) {
  const overview     = data.overview     || {};
  const settlor      = data.settlor      || {};
  const protector    = data.protector    || {};
  const signing      = data.signing      || {};
  const trustees     = (data.trustees     || []).filter(t => t.name);
  const beneficiaries= (data.beneficiaries|| []).filter(b => b.name);

  const heading = (text, level = HeadingLevel.HEADING_2) =>
    new Paragraph({ text, heading: level, spacing: { before: 300, after: 100 } });

  const body = (text) =>
    new Paragraph({ children: [new TextRun({ text: text || '—', size: 22 })], spacing: { after: 80 } });

  const field = (label, value) =>
    new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }),
        new TextRun({ text: value || '—', size: 22 }),
      ],
      spacing: { after: 80 },
    });

  const disclaimer = 'This document has been generated using SovereignTrust.net for educational and administrative document preparation purposes only. Before signing or acting upon this document, you should have it reviewed by a qualified legal professional in your jurisdiction, ensure proper execution in accordance with local legal requirements, and obtain independent legal, tax, and financial advice.';

  const children = [
    new Paragraph({
      children: [new TextRun({ text: 'EXPRESS PRIVATE TRUST DEED', bold: true, size: 48, color: '0F2244' })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: trustName || 'Untitled Trust', italics: true, size: 28, color: '595959' })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Prepared using SovereignTrust.net — educational and administrative document preparation only. This document is a template and does not constitute legal advice.', italics: true, size: 16, color: '888888' })],
      spacing: { after: 400 },
    }),

    heading('1. Trust Identification'),
    field('Trust Name', overview.name),
    field('Date of Deed', overview.creationDate),
    field('Governing Jurisdiction', overview.jurisdiction),
    field('Initial Trust Property', overview.initialProperty),

    heading('2. Trust Purpose'),
    body(overview.purpose || 'To hold, manage and distribute the trust assets for the benefit of the named beneficiaries in accordance with the terms set out herein and any Memorandum of Wishes provided by the Settlor from time to time.'),

    heading('3. The Settlor'),
    field('Name', settlor.name),
    field('Address', settlor.address),
    field('Email', settlor.email),
    field('Phone', settlor.phone),

    heading('4. The Trustee(s)'),
    ...(trustees.length
      ? trustees.flatMap((t, i) => [
          new Paragraph({ children: [new TextRun({ text: `Trustee ${i + 1}: ${t.name}`, bold: true, size: 22 })], spacing: { after: 60 } }),
          ...(t.address ? [field('Address', t.address)] : []),
          ...(t.email   ? [field('Email',   t.email)]   : []),
          ...(t.phone   ? [field('Phone',   t.phone)]   : []),
          new Paragraph({ text: '', spacing: { after: 100 } }),
        ])
      : [new Paragraph({ children: [new TextRun({ text: 'No trustees have been appointed.', italics: true, size: 22, color: '888888' })] })]),

    heading('5. The Beneficiaries'),
    ...(beneficiaries.length
      ? beneficiaries.flatMap((b, i) => [
          new Paragraph({ children: [new TextRun({ text: `Beneficiary ${i + 1}: ${b.name}${b.relationship ? ` (${b.relationship})` : ''}`, bold: true, size: 22 })], spacing: { after: 60 } }),
          ...(b.address ? [field('Address', b.address)] : []),
          ...(b.type    ? [field('Type',    b.type)]    : []),
          new Paragraph({ text: '', spacing: { after: 100 } }),
        ])
      : [new Paragraph({ children: [new TextRun({ text: 'No beneficiaries have been named.', italics: true, size: 22, color: '888888' })] })]),

    heading('6. The Protector'),
    ...(protector.name
      ? [field('Name', protector.name), field('Address', protector.address), field('Email', protector.email)]
      : [new Paragraph({ children: [new TextRun({ text: 'No Protector has been appointed for this trust.', italics: true, size: 22, color: '888888' })] })]),

    heading('7. Execution'),
    field('Place of Signing', signing.place),
    body('IN WITNESS WHEREOF the Settlor and Trustee(s) have executed this Deed on the date first written above, in the presence of the witnesses named below.'),
    new Paragraph({ text: '', spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: `Witness 1: ${signing.witness1?.name || '—'}`, bold: true, size: 22 })], spacing: { after: 60 } }),
    ...(signing.witness1?.address ? [field('Address', signing.witness1.address)] : []),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: `Witness 2: ${signing.witness2?.name || '—'}`, bold: true, size: 22 })], spacing: { after: 60 } }),
    ...(signing.witness2?.address ? [field('Address', signing.witness2.address)] : []),
    new Paragraph({ text: '', spacing: { after: 400 } }),

    new Paragraph({
      children: [new TextRun({ text: disclaimer, italics: true, size: 16, color: '888888' })],
      spacing: { after: 200 },
    }),
  ];

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      paragraphStyles: [{
        id: 'Normal',
        name: 'Normal',
        run: { font: 'Georgia', size: 22 },
      }],
    },
  });

  return Packer.toBuffer(doc);
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const { id, avatarId, session_id, format } = req.query || {};
  const isDocx = format === 'docx';
  if (!id || !avatarId) {
    return res.status(400).json({ error: 'id and avatarId are required.' });
  }

  try {
    const oasis = createClient(token);
    const { isError, message, result: holon } = await oasis.data.loadHolon({ Id: id, LoadChildren: false, Recursive: false });

    if (isError || !holon) {
      return res.status(404).json({ error: message || 'Trust not found.' });
    }
    if (String(holon.parentHolonId) !== String(avatarId)) {
      return res.status(403).json({ error: 'You do not have access to this trust.' });
    }

    const meta = holon.metaData || {};
    const status = meta.status || 'Draft';

    // Accept OASIS-stored 'Paid' status OR verify directly via Stripe session_id.
    let isPaid = status === 'Paid';
    if (!isPaid && session_id) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const stripeSession = await stripe.checkout.sessions.retrieve(session_id);
        isPaid = stripeSession.payment_status === 'paid' &&
                 (stripeSession.metadata?.trustId === id || stripeSession.metadata?.avatarId === avatarId);
      } catch { /* Stripe check failed — fall through to unpaid */ }
    }

    if (!isPaid) {
      return res.status(402).json({ error: 'Payment is required before this document can be downloaded.' });
    }

    let trustData = {};
    try { trustData = JSON.parse(meta.trustData || '{}'); } catch {}

    const trustName = holon.name || trustData.overview?.name || 'Trust Deed';
    const safeName  = trustName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Trust_Deed';

    if (isDocx) {
      const docxBuffer = await buildTrustDeedDocx(trustData, trustName);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Deed.docx"`);
      return res.status(200).send(docxBuffer);
    }

    const pdfBytes = await buildTrustDeedPdf(trustData, trustName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Deed.pdf"`);
    return res.status(200).send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('[trust-document]', err);
    return res.status(500).json({ error: 'Failed to generate document. Please try again.' });
  }
}

module.exports = handler;
module.exports.buildTrustDeedPdf = buildTrustDeedPdf;
