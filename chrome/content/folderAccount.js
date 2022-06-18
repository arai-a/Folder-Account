var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");

var getIdentityForHeaderOriginal = MailUtils.getIdentityForHeader;

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
  
  // hook into function MailUtils.getIdentityForHeader called by MessageArchiver.prototype.archiveMessages,
  // to provide the identity possibly set for the folder containing the message
  getIdentityForHeaderOverride: function (hdr, type, hint = "") {
    try {
      // check for undefined type to exclude calls from ComposeMessage and SaveAsTemplate in mailCommands.js
      if (hdr.folder && (type === undefined)) {
        let identityKey = null;
        let prefName = "extensions.folderaccount." + hdr.folder.URI;
        if (Services.prefs.getPrefType(prefName))
          identityKey = Services.prefs.getCharPref(prefName);
          if (identityKey)
            return [MailServices.accounts.getIdentity(identityKey), null];
      }
    } catch (e) {
      console.log("Folder Account: error in getIdentityForHeaderOverride():", e);
    }
    return getIdentityForHeaderOriginal.apply(this, arguments);
  },

  load: function() {
    // Add a listner to watch for a renamed folder
    // When a folder is renamed, we need to update our stored prefs to reflect the change
    // nsIMsgFolderListener
    MailServices.mfn.addListener(folderAccount.folderListener, MailServices.mfn.folderRenamed);
    // hook into function called by archiveMessages in MessageArchiver.jsm
    MailUtils.getIdentityForHeader = folderAccount.getIdentityForHeaderOverride;    
  },

  unload: function() {
    // Remove our folder listner
    MailServices.mfn.removeListener(folderAccount.folderListener);
    // restore original function
    MailUtils.getIdentityForHeader = getIdentityForHeaderOriginal;
  }
  
};

function onLoad(activatedWhileWindowOpen) {
  folderAccount.load();
}

function onUnload(deactivatedWhileWindowOpen) {
  folderAccount.unload();
}
