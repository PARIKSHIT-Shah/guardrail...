export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    dbConfigured: Boolean(process.env.MONGODB_URI),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    time: new Date().toISOString()
  });
}
