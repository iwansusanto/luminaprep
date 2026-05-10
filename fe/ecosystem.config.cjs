module.exports = {
  apps: [
    {
      name: 'luminaprep-fe',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        API_URL: 'http://localhost:8000',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        API_URL: 'http://localhost:8000',
      },
    },
  ],
};
