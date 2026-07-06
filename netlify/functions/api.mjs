import serverless from "serverless-http";
import { createApp } from "../../apps/api/dist/create-app.js";

let cachedHandler;

const getHandler = async () => {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = serverless(app.getHttpAdapter().getInstance());
  }
  return cachedHandler;
};

export const handler = async (event, context) => {
  const fn = await getHandler();
  return fn(event, context);
};
