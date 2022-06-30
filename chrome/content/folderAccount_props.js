var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");

Services.scriptloader.loadSubScript("chrome://folderaccount/content/scripts/notifyTools/notifyTools.js", window);

var folderAccountProps = {

    defaultID: "defaultID",

    addTab: async function() {

        // Retrieve any stored user settings...

        var folderURI =  window.arguments[0].folder.URI;


        let prefs = Services.prefs.getBranch("extensions.folderaccount.");   
        var defaultFrom;
        var defaultTo;
        var overrideReturnAddress;
        var addToCcOnReply;
        var replyToOnReplyForward;
        var defaultReplyTo;
        
        // Selected From: account
        try {
            defaultFrom = prefs.getCharPref(folderURI);      
        } catch (e) {
            defaultFrom = this.defaultID;
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

        let sortIdentities = await window.notifyTools.notifyBackground({ command: "getOption", item: "sortIdentities" });
        
        var menuList = document.getElementById("faMenulist");
        menuList.selectedItem = menuList.appendItem("Use Default", this.defaultID);
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

        document.getElementById("faDefaultTo").setAttribute("value", defaultTo);
        document.getElementById("faDefaultReplyTo").setAttribute("value", defaultReplyTo);

        document.getElementById("faAddToCcOnReply").checked = (addToCcOnReply == "true");
        document.getElementById("faReplyToOnReplyForward").checked = (replyToOnReplyForward == "true");
        document.getElementById("faOverrideReturnAddress").checked = (overrideReturnAddress == "true");

        document.addEventListener("dialogaccept", function(event) {
        	folderAccountProps.saveAccountPrefs();
        });

    },

    saveAccountPrefs: function() {

        // Get value of our box:

        try {

            let pFrom                    = document.getElementById("faMenulist");
            let pTo                      = document.getElementById("faDefaultTo");
            let pReplyTo                 = document.getElementById("faDefaultReplyTo");

            let pAddToCcOnReply          = document.getElementById("faAddToCcOnReply");
            let pReplyToOnReplyForward	  = document.getElementById("faReplyToOnReplyForward");
            let pOverrideReturnAddress   = document.getElementById("faOverrideReturnAddress");
            
            let folderURI =  window.arguments[0].folder.URI;

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
                      
            // If the value is "defaultID", then we'll just delete the relevant saved preference
            setOrClearPref(folderURI, pFrom.value, this.defaultID);

            // If the value is blank, then we'll just delete the relevant saved preference

            setOrClearPref("to." + folderURI, pTo.value.trim());
            setOrClearPref("replyTo." + folderURI, pReplyTo.value.trim());

            setOrClearPref("addToCcOnReply." + folderURI, pAddToCcOnReply.getAttribute("checked"));
            setOrClearPref("replyToOnReplyForward." + folderURI, pReplyToOnReplyForward.getAttribute("checked"));
            setOrClearPref("overrideReturnAddress." + folderURI, pOverrideReturnAddress.getAttribute("checked"));

        } catch (e) { } 
    }
};

function onLoad(activatedWhileWindowOpen) {
  if (AppConstants.platform == "linux")
    window.resizeBy(35, 0);
  else if (AppConstants.platform == "macosx")
    window.resizeBy(150, 0);
  WL.injectCSS("chrome://messenger/skin/menulist.css");
  WL.injectCSS("chrome://messenger/skin/input-fields.css");
  WL.injectElements(`
    <tab id="FolderAccountTab" label="Folder Account" insertafter="GeneralTab"/>
    <vbox id="FolderAccountPanel" insertafter="GeneralPanel">
      <vbox id="nameBox" class="input-container">
        <label id="faMenulistLabel" value="From Account:" accesskey="F" control="faMenulist" align="start" />
        <vbox>
          <menulist is="menulist-editable" id="faMenulist" type="description" disableautoselect="false">
            <menupopup id="faMenulistPopup"/>
          </menulist>
          <hbox>
            <checkbox id="faOverrideReturnAddress" label="Ignore on Reply (i.e. let Thunderbird choose)" accesskey="I"/>
          </hbox>
          <spacer height="6"/>
        </vbox>
        <label id="faDefaultToLabel" value="Default To:" control="faDefaultTo" accesskey="T"/>
        <hbox class="input-container">
          <html:input id="faDefaultTo" type="text" class="input-inline"/>
          <checkbox id="faAddToCcOnReply" label="Add to CC list on Reply" accesskey="C"/>
        </hbox>
        <label id="faDefaultReplyToLabel" value="Additional Reply-To:" control="faDefaultReplyTo" accesskey="R"/>
        <hbox class="input-container">
          <html:input id="faDefaultReplyTo" type="text" class="input-inline"/>
          <checkbox id="faReplyToOnReplyForward" label="Use also on Reply and Forward" accesskey="U"/>
        </hbox>
      </vbox>
      <spacer height="6"/>
      <hbox>
        <spacer flex="1"/>
        <button label="Global Options" oncommand="window.notifyTools.notifyBackground({ command: 'openOptionsPage' });" accesskey="O"
        id="faOptions"/>
      </hbox>
    </vbox>
  `);
  folderAccountProps.addTab();
}

function onUnload(deactivatedWhileWindowOpen) {}
