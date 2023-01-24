messenger.WindowListener.registerChromeUrl([
  ["content", "folderaccount", "chrome/content/"]
]);

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xhtml",
  "chrome://folderaccount/content/folderAccount.js"
);

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messengercompose/messengercompose.xhtml",
  "chrome://folderaccount/content/folderAccount_compose.js"
);

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/folderProps.xhtml",
  "chrome://folderaccount/content/folderAccount_props.js"
);

messenger.WindowListener.startListening();

let lastFocusedWindow = messenger.windows.WINDOW_ID_NONE;
messenger.windows.getCurrent().then((w) => lastFocusedWindow = w.id);

messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
  switch (info.command) {
  case "getActiveTab":
    let [tab] = await messenger.tabs.query({ active: true, windowId: lastFocusedWindow });
    return tab?.id ?? messenger.tabs.TAB_ID_NONE;
  case "getComposeDetails":
    return await messenger.compose.getComposeDetails(info.tabId);
  case "setComposeDetails":
    return await messenger.compose.setComposeDetails(info.tabId, info.details);
  case "listAccounts":
    return await messenger.accounts.list(false);
  case "getOption":
    let results = await browser.storage.local.get(info.item);
    if (info.item in results)
      return results[info.item];
    return false;
  case "setOption":
    browser.storage.local.set({
      [info.item]: info.checked
    });
    break;
  case "openOptionsPage":
    await browser.runtime.openOptionsPage();
    break;
  }
});

browser.storage.onChanged.addListener(async (changes, area) => {
  if (area != "local")
    return;
  for (let item of Object.keys(changes))
    await messenger.NotifyTools.notifyExperiment({
      command: "optionChanged",
      item: item,
      value: changes[item].newValue
    });
});

messenger.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId < 0)
    return;
  let focusedWindow = await messenger.windows.get(windowId);
  if (focusedWindow?.type == "messageCompose")
    return;
  lastFocusedWindow = windowId;
});