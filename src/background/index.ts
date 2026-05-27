import browser from "webextension-polyfill";
import { readData, writeData } from "../core/storage";
import { DEFAULT_DATA } from "../core/defaults";

async function init() {
  console.log("[SSS] background initialising");
  const data = await readData();
  if (!data.version) {
    await writeData({ ...DEFAULT_DATA, ...data });
    console.log("[SSS] storage bootstrapped");
  }
}

void init();

browser.runtime.onInstalled.addListener(async () => {
  console.log("[SSS] extension installed/updated");
  await init();
  // Inject content script into all existing tabs on install
  try {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith("about:") && !tab.url.startsWith("chrome:") && !tab.url.startsWith("moz-extension:")) {
        await browser.tabs.executeScript?.(tab.id, { file: "content.js" }).catch(() => {/* tab may reject */});
      }
    }
  } catch { /* MV3 uses scripting API instead */ }
});

browser.runtime.onMessage.addListener((message, sender) => {
  const msg = message as { type: string; payload?: unknown };

  if (msg.type === "SSS_PING") {
    return Promise.resolve({ type: "SSS_PONG", timestamp: Date.now(), version: browser.runtime.getManifest().version });
  }

  if (msg.type === "SSS_GET_DATA") {
    return readData().then(data => ({ type: "SSS_DATA", payload: data }));
  }

  if (msg.type === "SSS_GET_SETTINGS") {
    return readData().then(data => ({ type: "SSS_SETTINGS", payload: data.settings }));
  }

  if (msg.type === "SSS_WRITE_DATA") {
    return writeData(msg.payload as Parameters<typeof writeData>[0]).then(() => ({ type: "SSS_OK" }));
  }

  return undefined;
});

// Context menu
browser.contextMenus?.create({
  id: "sss-open-palette",
  title: "SnippetySnipSnip â€” Insert snippet",
  contexts: ["editable"],
});

browser.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "sss-open-palette" && tab?.id) {
    await browser.tabs.sendMessage(tab.id, { type: "SSS_OPEN_PALETTE" }).catch(() => {});
  }
});