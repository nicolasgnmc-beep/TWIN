const DID_BASE = 'https://api.d-id.com';

function authHeader() {
  const key = process.env.DID_API_KEY;
  if (!key) throw new Error('Falta DID_API_KEY en Vercel');
  return `Basic ${Buffer.from(key).toString('base64')}`;
}

export default async function handler(req, res) {
  try {
    const headers = { Authorization: authHeader(), 'Content-Type': 'application/json' };

    if (req.method === 'POST') {
      const script, source_url y voice_id = req.body o vacío. || {};
      if (!script || typeof script !== 'string') {
        return res.status(400).json({ error: 'Falta el guion.' });
      }

      // MVP: presenter de prueba. Sustituye source_url por la imagen/asset
      // de tu avatar D-ID cuando hayas completado su creación.
      const source_url = SOURCE_URL;
      if (!source_url) {
        return res.status(400).json({
          error: 'Falta DID_SOURCE_URL. Añade en Vercel la URL del avatar/presentador creado en D-ID.'
        });
      }

      const response = await fetch(`${DID_BASE}/talks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source_url,
          script: {
            type: 'text',
            input: script,
            provider: { type: 'microsoft', voice_id: process.env.DID_VOICE_ID || 'es-ES-AlvaroNeural' }
          },
          config: { fluent: true, pad_audio: 0 }
        })
      });

      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data?.description || data?.message || 'Error de D-ID', details: data });
      return res.status(200).json(data);
    }

    if (req.method === 'GET') {
      const { id } = req.query || {};
      if (!id) return res.status(400).json({ error: 'Falta id.' });

      const response = await fetch(`${DID_BASE}/talks/${encodeURIComponent(id)}`, { headers });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data?.description || data?.message || 'Error consultando D-ID', details: data });
      return res.status(200).json(data);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error interno.' });
  }
}
