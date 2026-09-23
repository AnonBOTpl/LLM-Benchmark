#!/usr/bin/env node
// Evaluates a JavaScript expression inside the running app window over the
// Chrome DevTools Protocol. The expression is awaited and its value printed as
// JSON, which makes it possible to drive and inspect the real UI (clicking
// buttons, asserting what rendered) without a human at the keyboard.
//
//   cat expr.js | node scripts/ui-drive.mjs
//
// It needs a debug port, which is OFF by default for security. Add it to the
// window in src-tauri/tauri.conf.json temporarily:
//
//   "additionalBrowserArgs": "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --remote-debugging-port=9222 --remote-allow-origins=*"
//
// then `npm run tauri dev` and drive the app from the terminal. Removing the
// line again is enough to switch the port off.

const ENDPOINT = process.env.CDP_ENDPOINT ?? "http://127.0.0.1:9222";

const expression = await new Promise((resolve) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    data += chunk;
  });
  process.stdin.on("end", () => resolve(data));
});

if (!expression.trim()) {
  console.error("Podaj wyrażenie JS na stdin.");
  process.exit(2);
}

const targets = await fetch(`${ENDPOINT}/json/list`).then((response) => response.json());
const page = targets.find((target) => target.type === "page");
if (!page?.webSocketDebuggerUrl) {
  console.error("Nie znaleziono targetu typu 'page' - czy aplikacja działa z debug portem?");
  process.exit(2);
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = () => reject(new Error("nie udało się otworzyć WebSocket do CDP"));
});

const reply = await new Promise((resolve) => {
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id === 1) resolve(message);
  };
  socket.send(
    JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
      },
    }),
  );
});

socket.close();

if (reply.result?.exceptionDetails) {
  const details = reply.result.exceptionDetails;
  console.error(`WYJĄTEK: ${details.text} ${details.exception?.description ?? ""}`);
  process.exit(1);
}

const value = reply.result?.result?.value;
console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
