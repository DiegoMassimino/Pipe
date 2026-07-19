// api/piperun.js
// Rota serverless do Vercel: funciona como um "mensageiro" seguro entre o painel
// (rodando no navegador) e a API do Pipe Run. O token de API fica só aqui no
// servidor (variável de ambiente PIPERUN_TOKEN) — nunca é exposto ao navegador.
//
// Como usar (chamado pelo próprio painel):
//   /api/piperun?resource=activities&page=1
//   /api/piperun?resource=deals&page=3
//   /api/piperun?resource=companies&page=1
//   /api/piperun?resource=users
//   /api/piperun?resource=stages&page=2
//
// Configuração necessária no Vercel:
//   Project Settings → Environment Variables → adicionar PIPERUN_TOKEN
//   com o valor do seu token do Pipe Run. Depois fazer um redeploy.

const RECURSOS_PERMITIDOS = ['activities', 'deals', 'companies', 'users', 'stages'];

export default async function handler(req, res) {
  // CORS: permite que o painel (mesmo domínio do Vercel) chame esta rota.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, message: 'Método não permitido. Use GET.' });
    return;
  }

  const token = process.env.PIPERUN_TOKEN;
  if (!token) {
    res.status(500).json({
      success: false,
      message: 'PIPERUN_TOKEN não configurado nas variáveis de ambiente do Vercel.'
    });
    return;
  }

  const { resource, page } = req.query;

  if (!resource || !RECURSOS_PERMITIDOS.includes(resource)) {
    res.status(400).json({
      success: false,
      message: `Parâmetro "resource" inválido ou ausente. Use um destes: ${RECURSOS_PERMITIDOS.join(', ')}.`
    });
    return;
  }

  const paginaNum = Number(page) > 0 ? Number(page) : 1;
  const url = `https://api.pipe.run/v1/${resource}?token=${encodeURIComponent(token)}&show=200&page=${paginaNum}`;

  try {
    const resposta = await fetch(url);
    const dados = await resposta.json();
    res.status(resposta.status).json(dados);
  } catch (erro) {
    res.status(502).json({
      success: false,
      message: 'Erro ao conectar com a API do Pipe Run: ' + (erro && erro.message ? erro.message : String(erro))
    });
  }
}
