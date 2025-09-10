const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api'
      },
      secure: false,
      logLevel: 'debug',
      onProxyRes: function(proxyRes, req, res) {
        console.log(`[Proxy] ${req.method} ${req.path} => ${proxyRes.statusCode}`);
      },
      onError: function(err, req, res) {
        console.error('[Proxy Error]', err);
        res.status(500).json({ error: 'Proxy Error', message: err.message });
      }
    })
  );
};
