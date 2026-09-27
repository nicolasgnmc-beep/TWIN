const DID_BASE = 'https://api.d-id.com';

function authHeader() {
  const key = process.env.DID_API_KEY;

  if (!key) {
    throw new Error('Falta DID_API_KEY en Vercel');
  }

  return `Basic ${Buffer.from(key).toString('base64')}`;
}

async function didRequest(path, options = {}) {
  const response = await fetch(`${DID_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.description ||
      data?.message ||
      `Error de D-ID (${response.status})`
    );

    error.status = response.status;
    error.details = data;

    throw error;
  }

  return data;
}

export default async function handler(req, res) {
  try {

    // ==========================================
    // POST — CREAR VÍDEO CON EL TWIN
    // ==========================================

    if (req.method === 'POST') {

      const {
        script,
        avatar_id,
        voice_id
      } = req.body || {};


      if (!script || typeof script !== 'string') {
        return res.status(400).json({
          error: 'Falta el guion.'
        });
      }


      if (!avatar_id || typeof avatar_id !== 'string') {
        return res.status(400).json({
          error: 'Falta avatar_id del usuario.'
        });
      }


      const sceneBody = {
        avatar_id,

        script: {
          type: 'text',
          input: script
        }
      };


      // Si el avatar tiene una voz asociada,
      // utilizamos esa voz.

      if (voice_id) {
        sceneBody.script.provider = {
          type: 'microsoft',
          voice_id
        };
      }


      const data = await didRequest(
        '/scenes',
        {
          method: 'POST',
          body: JSON.stringify(sceneBody)
        }
      );


      return res.status(201).json({
        id: data.id,
        status: data.status,
        result_url: data.result_url || null
      });
    }


    // ==========================================
    // GET — CONSULTAR ESTADO DEL VÍDEO
    // ==========================================

    if (req.method === 'GET') {

      const { id } = req.query || {};


      if (!id) {
        return res.status(400).json({
          error: 'Falta id.'
        });
      }


      const data = await didRequest(
        `/scenes/${encodeURIComponent(id)}`,
        {
          method: 'GET'
        }
      );


      return res.status(200).json({
        id: data.id,
        status: data.status,
        result_url: data.result_url || null
      });
    }


    // ==========================================
    // MÉTODO NO PERMITIDO
    // ==========================================

    res.setHeader(
      'Allow',
      ['GET', 'POST']
    );


    return res.status(405).json({
      error: 'Método no permitido.'
    });


  } catch (error) {

    console.error(
      'MIKLOZ Video API:',
      error
    );


    return res
      .status(error.status || 500)
      .json({
        error:
          error.message ||
          'Error interno.',

        details:
          error.details || null
      });
  }
}
