const functions = require("firebase-functions");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";

// Cloud Run automatically provides the port
const app = next({ dev, conf: { distDir: ".next" } });
const handle = app.getRequestHandler();

exports.nextApp = functions.https.onRequest(async (req, res) => {
  await app.prepare();
  res.setHeader("X-Powered-By", "Next.js");
  return handle(req, res);
});
