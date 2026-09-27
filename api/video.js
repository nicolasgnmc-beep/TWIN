const DID_BASE = 'https://api.d-id.com';

function authHeader() {
  const key = process.env.DID_API_KEY;

  if (!key) {
    throw new Error('Falta DID_API_KEY en Vercel');
  }

  return `Basic ${Buffer.from(key).toString('base64')}`;
}

function headers() {
  return {
    Authorization: authHeader(),
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}

async function didRequest(path, options = {}) {
  const response = await fetch(`${DID_BASE}${path}`, {
    ...options,
    headers: {
      ...headers(),
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

    /*
     * =========================================
     * POST
     * =========================================
     *
     * action:
     * - create_consent
     * - verify_consent
     * - create_avatar
     */

    if (req.method === 'POST') {
      const {
        action,
        consent_id,
        source_url,
        name
      } = req.body || {};


      /*
       * -----------------------------------------
       * 1. CREAR CONSENTIMIENTO
       * -----------------------------------------
       */

      if (action === 'create_consent') {

        const data = await didRequest('/consents', {
          method: 'POST',

          body: JSON.stringify({
            language: 'spanish'
          })
        });

        return res.status(201).json({
          consent_id: data.id,
          text: data.text,
          status: data.status || 'created',
          raw: data
        });
      }


      /*
       * -----------------------------------------
       * 2. VERIFICAR VÍDEO DE CONSENTIMIENTO
       * -----------------------------------------
       */

      if (action === 'verify_consent') {

        if (!consent_id) {
          return res.status(400).json({
            error: 'Falta consent_id.'
          });
        }

        if (!source_url) {
          return res.status(400).json({
            error:
              'Falta source_url del vídeo de consentimiento.'
          });
        }

        if (!name) {
          return res.status(400).json({
            error: 'Falta el nombre del usuario.'
          });
        }

        const data = await didRequest(
          `/consents/${encodeURIComponent(consent_id)}`,
          {
            method: 'POST',

            body: JSON.stringify({
              name,
              source_url
            })
          }
        );

        return res.status(200).json(data);
      }


      /*
       * -----------------------------------------
       * 3. CREAR AVATAR
       * -----------------------------------------
       */

      if (action === 'create_avatar') {

        if (!consent_id) {
          return res.status(400).json({
            error: 'Falta consent_id.'
          });
        }

        if (!source_url) {
          return res.status(400).json({
            error:
              'Falta source_url del vídeo de entrenamiento.'
          });
        }

        const data = await didRequest(
          '/scenes/avatars',
          {
            method: 'POST',

            body: JSON.stringify({
              name: name || 'MIKLOZ Twin',
              consent_id,
              source_url,
              persist: true
            })
          }
        );

        return res.status(201).json({
          avatar_id: data.id,
          status: data.status,
          raw: data
        });
      }


      return res.status(400).json({
        error: 'Acción no válida.'
      });
    }


    /*
     * =========================================
     * GET — CONSULTAR AVATAR
     * =========================================
     */

    if (req.method === 'GET') {

      const { avatar_id } = req.query || {};

      if (!avatar_id) {
        return res.status(400).json({
          error: 'Falta avatar_id.'
        });
      }

      const data = await didRequest(
        `/scenes/avatars/${encodeURIComponent(avatar_id)}`,
        {
          method: 'GET'
        }
      );

      return res.status(200).json({
        avatar_id: data.id,
        status: data.status,
        voice_id: data.voice_id || null,
        thumbnail_url:
          data.thumbnail_url || null,
        raw: data
      });
    }


    /*
     * =========================================
     * MÉTODO NO PERMITIDO
     * =========================================
     */

    res.setHeader('Allow', ['GET', 'POST']);

    return res.status(405).json({
      error: 'Método no permitido.'
    });


  } catch (error) {

    console.error(
      'MIKLOZ Avatar API:',
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
