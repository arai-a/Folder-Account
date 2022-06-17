var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

var folderAccount = {

  folderListener: {
    folderRenamed(oldFolder, newFolder) {
      folderAccount.folderRenamed(oldFolder.URI, newFolder.URI);
    }
  },
  
  // The following is run when a folder is renamed
  folderRenamed: function (oldURI, newURI) {
    // Scan through the preferences and find any folder references that need to be updated
    let prefs = Services.prefs.getBranch("extensions.folderaccount.");
    let children = prefs.getChildList("");
    for (const child of children) {
      let child2 = child + "/";
      let pos = child2.indexOf(oldURI + "/");
      if (pos >= 0 ) {
        // Store the setting value
        let val = prefs.getCharPref(child);
        // Clear the old setting
        prefs.clearUserPref(child);
        // Create and set the new setting
        prefs.setCharPref(
            child2.substring(0, pos) + newURI + child2.substring(pos + oldURI.length, child.length), 
            val
        );           
      }
    }
  },
    
  // The following is run when Thunderbird is first loaded
  load: function() {
    // Add a listner to watch for a renamed folder
    // When a folder is renamed, we need to update our stored prefs to reflect the change
    // nsIMsgFolderListener
    MailServices.mfn.addListener(folderAccount.folderListener, MailServices.mfn.folderRenamed);
  },

  // The following is run when Thunderbird is unloaded
  unload: function() {
    // Remove our folder listner
    MailServices.mfn.removeListener(folderAccount.folderListener);
  }
};

// Run these when Thunderbird is loaded or unloaded

function onLoad(activatedWhileWindowOpen) {
  folderAccount.load();
}

function onUnload(deactivatedWhileWindowOpen) {
  folderAccount.unload();
}
