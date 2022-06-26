var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");

Services.scriptloader.loadSubScript("chrome://folderaccount/content/scripts/notifyTools/notifyTools.js", window);

var folderAccountProps = {

    addTab: function() {

        // Retrieve any stored user settings...

        var folderURI =  window.arguments[0].folder.URI;


        let prefs = Services.prefs.getBranch("extensions.folderaccount.");   
        var defaultFrom;
        var defaultTo;
        var overrideReturnAddress;
        var addToCcOnReply;
        var replyToOnReplyForward;
        var defaultReplyTo;
        
        let sortIdentities = false;
        
        // Selected From: account
        try {
            defaultFrom = prefs.getCharPref(folderURI);      
        } catch (e) {
            defaultFrom = "Use Default";
        }


        // Selected To: address
        try {
            defaultTo = prefs.getCharPref("to." + folderURI);
        } catch (e) {
            defaultTo = "";
        }
 
        try {
            defaultReplyTo = prefs.getCharPref("replyTo." + folderURI);
        } catch (e) {
            defaultReplyTo = "";
        }

         // Include address in CC on reply?
         try {
             addToCcOnReply = prefs.getCharPref("addToCcOnReply." + folderURI);
         } catch (e) {
             addToCcOnReply = "false";
         }

         // Include RepyTo on reply?
         try {
             replyToOnReplyForward = prefs.getCharPref("replyToOnReplyForward." + folderURI);
         } catch (e) {
             replyToOnReplyForward = "false";
         }
         
         // Override default return address?
         try {
             overrideReturnAddress = prefs.getCharPref("overrideReturnAddress." + folderURI);
         } catch (e) {
             overrideReturnAddress = "false";
         }

        window.notifyTools.notifyBackground({ command: "getOption", item: "sortIdentities" })
          .then((checked) => { sortIdentities = checked });
         
        var menuList = document.getElementById("mlFolderAccount");
        menuList.selectedItem = menuList.appendItem("Use Default", "Use Default");      
        window.notifyTools.notifyBackground({ command: "listAccounts" }).then((accounts) => {
          for (const account of accounts) {
            if (account.identities.length == 0)
              continue;
            let menuListEntries = []
            for (const id of account.identities) {
              try {    
                let entry = "";
                if (id.name.length > 0)
                  entry += id.name + " <" + id.email + ">";
                else
                  entry += id.email;
                if (id.label.length > 0)
                  entry += " (" + id.label + ")";
                entry += "\u2003[" + account.name + "]";
                menuListEntries[id.id] = entry;
              } catch(e) { }  // Nothing to do but skip this identity...
            }
            let entriesArray = Object.entries(menuListEntries);
            if (sortIdentities)
              entriesArray = entriesArray.sort(([,a], [,b]) => (a > b));
            let separator = document.createXULElement("menuseparator");
            menuList.menupopup.appendChild(separator);
            for (const [i, a] of entriesArray) {
              let menuItem = menuList.appendItem(a, i);
              if (defaultFrom == i) {
                menuList.selectedItem = menuItem;
              }              
            }
          }
        });

        document.getElementById("mlFolderAccountDefaultTo").setAttribute("value", defaultTo);
        document.getElementById("mlFolderAccountDefaultReplyTo").setAttribute("value", defaultReplyTo);

        document.getElementById("mlFolderAccountAddToCcOnReply").checked = (addToCcOnReply == "true");
        document.getElementById("mlFolderAccountReplyToOnReplyForward").checked = (replyToOnReplyForward == "true");
        document.getElementById("mlFolderAccountOverrideReturnAddress").checked = (overrideReturnAddress == "true");

        document.addEventListener("dialogaccept", function(event) {
        	folderAccountProps.saveAccountPrefs();
        });

    },

    saveAccountPrefs: function() {

        // Get value of our box:

        try {

            var mlFrom                    = document.getElementById("mlFolderAccount");
            var mlTo                      = document.getElementById("mlFolderAccountDefaultTo");
            var mlReplyTo                 = document.getElementById("mlFolderAccountDefaultReplyTo");

            var mlAddToCcOnReply          = document.getElementById("mlFolderAccountAddToCcOnReply");
            var mlReplyToOnReplyForward	  = document.getElementById("mlFolderAccountReplyToOnReplyForward");
            var mlOverrideReturnAddress   = document.getElementById("mlFolderAccountOverrideReturnAddress");
            
            var folderURI =  window.arguments[0].folder.URI;

            let prefs = Services.prefs.getBranch("extensions.folderaccount.");   

            function setOrClearPref(pref, value, valueToClear = "") {
              if(value == valueToClear) {
                // Need to use try/catch because if pref doesn't exist, clearUserPref will bomb
                try {
                  prefs.clearUserPref(pref);
                } catch (e) { }
              } else {
                // Otherwise, save the preference
                prefs.setCharPref(pref, value);
              }
            }
                      
            // If the value is "Use Default", then we'll just delete the relevant saved preference
            setOrClearPref(folderURI, mlFrom.value, "Use Default");

            // If the value is blank, then we'll just delete the relevant saved preference

            setOrClearPref("to." + folderURI, mlTo.value.trim());
            setOrClearPref("replyTo." + folderURI, mlReplyTo.value.trim());

            setOrClearPref("addToCcOnReply." + folderURI, mlAddToCcOnReply.getAttribute("checked"));
            setOrClearPref("replyToOnReplyForward." + folderURI, mlReplyToOnReplyForward.getAttribute("checked"));
            setOrClearPref("overrideReturnAddress." + folderURI, mlOverrideReturnAddress.getAttribute("checked"));

        } catch (e) { } 
    }
};

function onLoad(activatedWhileWindowOpen) {
  if (AppConstants.platform == "linux")
      window.resizeBy(35, 0);
  WL.injectCSS("chrome://messenger/skin/menulist.css");
  WL.injectCSS("chrome://messenger/skin/input-fields.css");
  WL.injectElements(`
    <tab id="FolderAccountTab" label="Folder Account" insertafter="GeneralTab"/>
    <vbox id="FolderAccountPanel" insertafter="GeneralPanel">
      <vbox id="nameBox" class="input-container">
        <label id="faAccountLabel" value="From Account:" accesskey="F" control="mlFolderAccount" align="start" />
        <vbox>
          <menulist is="menulist-editable" id="mlFolderAccount" type="description" disableautoselect="false">
            <menupopup id="mlFolderAccountPopup"/>
          </menulist>
          <hbox>
            <checkbox id="mlFolderAccountOverrideReturnAddress" label="Ignore on Reply (i.e. let Thunderbird choose)" accesskey="I"/>
          </hbox>
          <spacer height="6"/>
        </vbox>
        <label id="faDefaultToLabel" value="Default To:" control="mlFolderAccountDefaultTo" accesskey="T"/>
        <hbox class="input-container">
          <html:input id="mlFolderAccountDefaultTo" type="text" class="input-inline"/>
          <checkbox id="mlFolderAccountAddToCcOnReply" label="Add to CC list on Reply" accesskey="C"/>
        </hbox>
        <label id="faDefaultReplyToLabel" value="Additional Reply-To:" control="mlFolderAccountDefaultReplyTo" accesskey="R"/>
        <hbox class="input-container">
          <html:input id="mlFolderAccountDefaultReplyTo" type="text" class="input-inline"/>
          <checkbox id="mlFolderAccountReplyToOnReplyForward" label="Use also on Reply and Forward" accesskey="U"/>
        </hbox>
      </vbox>
      <spacer height="6"/>
      <hbox>
        <spacer flex="1"/>
        <button label="Global Options" oncommand="window.notifyTools.notifyBackground({ command: 'openOptionsPage' });" accesskey="O"
        id="mlFolderAccountOptions"/>
      </hbox>
    </vbox>
  `);
  folderAccountProps.addTab();
}

function onUnload(deactivatedWhileWindowOpen) {}
