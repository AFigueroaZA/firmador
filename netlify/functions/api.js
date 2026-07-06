// CommonJS a proposito: el bundler nft de Netlify envuelve las funciones con un
// shim require(), que no puede cargar ESM (.mjs). El dist de Nest tambien es CJS.
const serverless = require("serverless-http");
const { createApp } = require("../../apps/api/dist/create-app.js");

let cachedHandler;

const getHandler = async () => {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = serverless(app.getHttpAdapter().getInstance());
  }
  return cachedHandler;
};

exports.handler = async (event, context) => {
  const fn = await getHandler();
  return fn(event, context);
};
