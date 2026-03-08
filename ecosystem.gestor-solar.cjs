module.exports = {
  apps: [
    {
      name: "gestor-solar-api",
      cwd: "c:/Users/danil/OneDrive/Área de Trabalho/gestor solar-20260302T191652Z-1-001/gestor solar",
      script: "api/src/index.js",
      interpreter: "node",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "gestor-solar-web",
      cwd: "c:/Users/danil/OneDrive/Área de Trabalho/gestor solar-20260302T191652Z-1-001/gestor solar/web",
      script: "C:/Program Files/nodejs/npm.cmd",
      args: "run dev -- --host 0.0.0.0",
      autorestart: true,
      watch: false,
    },
    {
      name: "gestor-solar-tunnel",
      cwd: "c:/Users/danil/OneDrive/Área de Trabalho/gestor solar-20260302T191652Z-1-001/gestor solar",
      script: "cloudflared",
      args: "tunnel --config c:/Users/danil/OneDrive/Área de Trabalho/gestor solar-20260302T191652Z-1-001/gestor solar/cloudflared-gestor.yml run gestor-solar-app",
      autorestart: true,
      watch: false,
    },
  ],
};
