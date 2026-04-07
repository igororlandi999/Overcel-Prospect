// @ts-nocheck
// Supabase Edge Function — send-product-email
// Deploy: supabase functions deploy send-product-email --project-ref hbietsbxbtptzwkczhkv

const RESEND_KEY   = 're_ZxoaaUe7_8S9o6M3TG2XmwTvY1FyhZnZ6';
const NOTIFY_EMAIL = 'igororlandibarros@gmail.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    const { product, supplierName, supplierBooth } = await req.json();
    const p = product;

    const weights = { differentiation: 0.30, marginPotential: 0.25, businessFit: 0.20, importEase: 0.15, supplierTrust: 0.10 };
    const score = Object.entries(weights)
      .reduce((acc, [k, w]) => acc + (Number(p[k]) || 0) * w, 0)
      .toFixed(1);

    const urgencyMap = { low: 'Baixa', medium: 'Media', high: 'Alta' };
    const urgencyLabel = urgencyMap[p.urgency] || p.urgency || '';

    const row = (label, val) => val
      ? `<tr>
          <td style="padding:6px 12px;color:#9a9a9a;font-size:12px;text-transform:uppercase;white-space:nowrap;border-bottom:1px solid #2a2a2a">${label}</td>
          <td style="padding:6px 12px;color:#f0f0f0;font-size:13px;border-bottom:1px solid #2a2a2a">${val}</td>
        </tr>`
      : '';

    const certsList = Array.isArray(p.certifications) ? p.certifications.join(', ') : '';
    const photoHtml = p.photo && !String(p.photo).startsWith('data:')
      ? `<img src="${p.photo}" style="width:100%;max-height:260px;object-fit:cover;border-radius:6px;margin-bottom:20px;display:block"/>`
      : '';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:monospace">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">

  <div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:16px">
    ${photoHtml}
    <div style="font-size:22px;font-weight:800;color:#f0f0f0;margin-bottom:6px;text-transform:uppercase">${p.productName || 'Sem nome'}</div>
    ${supplierName ? `<div style="color:#6b6b6b;font-size:13px;margin-bottom:14px">${supplierName}${supplierBooth ? ' · ' + supplierBooth : ''}</div>` : ''}
    <span style="background:#c8f135;color:#000;font-size:20px;font-weight:700;padding:4px 14px;border-radius:4px">Score ${score}</span>
  </div>

  <div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;margin-bottom:16px">
    <div style="padding:10px 12px;background:#1e1e1e;font-size:11px;color:#6b6b6b;text-transform:uppercase">Geral</div>
    <table style="width:100%;border-collapse:collapse">
      ${row('Categoria', p.category)}
      ${row('Aplicacao', p.application)}
      ${row('Status', p.status)}
      ${row('Urgencia', urgencyLabel)}
      ${row('Diferencial', p.keyDifferential)}
      ${row('Proxima acao', p.nextAction)}
      ${row('Tipo marca', p.brandType)}
    </table>
  </div>

  <div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;margin-bottom:16px">
    <div style="padding:10px 12px;background:#1e1e1e;font-size:11px;color:#6b6b6b;text-transform:uppercase">Tecnico</div>
    <table style="width:100%;border-collapse:collapse">
      ${row('Quimica', p.chemistry)}
      ${row('Formato', p.format)}
      ${row('Tensao', p.nominalVoltage)}
      ${row('Capacidade', p.capacity)}
      ${row('Descarga', p.dischargeCurrent)}
      ${row('Pico', p.peakCurrent)}
      ${row('Ciclos', p.cycleLife)}
      ${row('Temperatura', p.temperatureRange)}
      ${row('Protecoes', p.protectionsIncluded)}
      ${certsList ? row('Certificacoes', certsList) : ''}
    </table>
  </div>

  <div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;margin-bottom:16px">
    <div style="padding:10px 12px;background:#1e1e1e;font-size:11px;color:#6b6b6b;text-transform:uppercase">Comercial</div>
    <table style="width:100%;border-collapse:collapse">
      ${row('MOQ', p.moq)}
      ${row('Preco', p.unitPrice)}
      ${row('Faixa', p.priceRange)}
      ${row('Lead Time', p.leadTime)}
      ${row('Pagamento', p.paymentTerms)}
      ${row('Amostra LT', p.sampleLeadTime)}
      ${p.doesOEM ? row('OEM', 'Sim') : ''}
      ${p.customPackaging ? row('Embalagem Custom', 'Sim') : ''}
      ${p.exclusivityPossible ? row('Exclusividade', 'Possivel') : ''}
      ${p.sampleAvailable ? row('Amostra', 'Disponivel') : ''}
    </table>
  </div>

  <div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;margin-bottom:16px">
    <div style="padding:10px 12px;background:#1e1e1e;font-size:11px;color:#6b6b6b;text-transform:uppercase">Score Detalhado</div>
    <table style="width:100%;border-collapse:collapse">
      ${row('Diferenciacao 30%', (p.differentiation || 5) + '/10')}
      ${row('Margem 25%', (p.marginPotential || 5) + '/10')}
      ${row('Fit Negocio 20%', (p.businessFit || 5) + '/10')}
      ${row('Importacao 15%', (p.importEase || 5) + '/10')}
      ${row('Fornecedor 10%', (p.supplierTrust || 5) + '/10')}
    </table>
  </div>

  ${p.notes ? `
  <div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;padding:14px;margin-bottom:16px">
    <div style="font-size:11px;color:#6b6b6b;text-transform:uppercase;margin-bottom:8px">Notas</div>
    <div style="color:#9a9a9a;font-size:13px;line-height:1.7;white-space:pre-wrap">${p.notes}</div>
  </div>` : ''}

  <div style="text-align:center;color:#6b6b6b;font-size:11px;margin-top:20px">
    Canton Fair Tracker · ${new Date().toLocaleString('pt-BR')} · ${p.deviceName || 'dispositivo'}
  </div>
</div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND_KEY },
      body: JSON.stringify({
        from:    'Canton Fair <onboarding@resend.dev>',
        to:      [NOTIFY_EMAIL],
        subject: `[Canton Fair] ${p.productName || 'Novo produto'} — Score ${score}${supplierName ? ' · ' + supplierName : ''}`,
        html
      })
    });

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});