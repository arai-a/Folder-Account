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

messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
  switch (info.command) {
    case "getComposeDetails":
      return await messenger.compose.getComposeDetails(info.tabId);
      break;
    case "setComposeDetails":
      return await messenger.compose.setComposeDetails(info.tabId, info.details);
      break;
    case "listAccounts":
      return await messenger.accounts.list(false);
      break;
    case "getOption":
      let results = await browser.storage.local.get(info.item);
      if (info.item in results)
        return results[info.item];
      return false;
  }
});

browser.storage.onChanged.addListener(async (changes, area) => {
  if (area != "local")
    return;
  for (let item of Object.keys(changes)) {
    try {
      let data = await messenger.NotifyTools.notifyExperiment({ command: "optionChanged", item: item, value: changes[item].newValue });
    } catch (e) {
      console.log("Error notifying experiment: ", e);
    }
  }
});
