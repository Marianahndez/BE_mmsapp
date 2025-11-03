// app.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// === Webhook (lo que ya tienes) ===
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
  if (mode === 'subscribe' && token === verifyToken) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post('/', (req, res) => {
  const ts = new Date().toISOString().replace('T', ' ').slice(0,19);
  console.log(`\n\nWebhook received ${ts}\n`);
  console.log(JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// === Envío de template (NUEVO) ===
const WA_API_VERSION = process.env.WA_API_VERSION || 'v22.0';
const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID; // p. ej. 903537082833696
const WA_TOKEN = process.env.WA_TOKEN;

app.post('/send-template', async (req, res) => {
  try {
    const { phone, templateName = 'hello_world', langCode = 'en_US', components = [] } = req.body;

    if (!phone) return res.status(400).json({ error: 'Missing "phone" phone number (E.164 format)' });

    const url = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      phone, // Ej: "528127248089"
      type: 'template',
      template: {
        name: templateName,
        language: { code: langCode },
        ...(components.length ? { components } : {})
      }
    };

    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    return res.status(200).json(data);
  } catch (err) {
    const status = err.response?.status || 500;
    const details = err.response?.data || err.message;
    console.error('WhatsApp API error:', status, details);
    return res.status(status).json({ error: details });
  }
});

app.listen(port, () => console.log(`\nListening on port ${port}\n`));
