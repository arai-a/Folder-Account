
var folderAccountProps = {

    addTab: function() {

        // Get the "mail" prefrence branch
        var allPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        var prefs = allPrefs.getBranch("mail.");   
        var accounts = new Array();
        accounts = prefs.getCharPref("accountmanager.accounts").split(',');     // accountmanager.accounts is a comma delimited list of accounts


        // Retrieve any stored user settings...

        var folderURI =  window.arguments[0].folder.URI;


        var userSettings = allPrefs.getBranch("extensions.folderaccount.");   
        var defaultFrom;
        var defaultTo;
        var overrideReturnAddress;
        var addToCcOnReply;
        var replyToOnReplyForward;
        var defaultReplyTo;
        
        let sortAccounts;
        
        // Selected From: account
        try {
            defaultFrom = userSettings.getCharPref(folderURI);      
        } catch (e) {
            defaultFrom = "Use Default";
        }


        // Selected To: address
        try {
            defaultTo = userSettings.getCharPref("to." + folderURI);
        } catch (e) {
            defaultTo = "";
        }
 
         // Include address in CC on reply?
         try {
             addToCcOnReply = userSettings.getCharPref("addToCcOnReply." + folderURI);
         } catch (e) {
             addToCcOnReply = "false";
         }

         // Include RepyTo on reply?
         try {
             replyToOnReplyForward = userSettings.getCharPref("replyToOnReplyForward." + folderURI);
         } catch (e) {
             replyToOnReplyForward = "false";
         }
         
         try {
             defaultReplyTo = userSettings.getCharPref("replyTo." + folderURI);
         } catch (e) {
             defaultReplyTo = "";
         }


         // Override default return address?
         try {
             overrideReturnAddress = userSettings.getCharPref("overrideReturnAddress." + folderURI);
         } catch (e) {
             overrideReturnAddress = "false";
         }

         try {
             sortAccounts = userSettings.getCharPref("sortAccounts");
         } catch (e) {
             sortAccounts = "false";
         }

        let menuListEntries = []
        
        for (var i=0; i<accounts.length; i++) {
            try {  // This try/catch will take care of accounts that have no associated identities.  These we want to skip.
            
            
                // We won't use email, but this will error out if the user doesn't have one set for this type
                // of account (e.g. News & Blogs, Local Folders), which gives us an easy way to skip entries that have no email
                
                // Single personalities assocated with an account look like this:
                // user_pref("mail.account.account2.identities", "id1");

                // Multiple personalities associated with an account look like this:
                // user_pref("mail.account.account2.identities", "id1,id6");

                var idents = prefs.getCharPref("account." + accounts[i] + ".identities").split(',');
            
                for (var j=0; j<idents.length; j++) {
            
                    try {    
                        var ident = idents[j];
                        var email = prefs.getCharPref("identity." + ident + ".useremail");

                        // OK, passed the test, now get the account name
                        var server = prefs.getCharPref("account." + accounts[i] + ".server");

                        var acctname = "";

                        let hasFullName = true;
                        try {
                          acctname += prefs.getCharPref("identity." + ident + ".fullName") + " <";
                        } catch (e) {
                          hasFullName = false;
                        };
                        acctname += email + (hasFullName ? "> " : " ");
                        try {
                          acctname += "(" + prefs.getCharPref("identity." + ident + ".label") + ") ";
                        } catch (e) {};
                        acctname += "[" + prefs.getCharPref("server." + server + ".name") + "]";                          
                        menuListEntries[acctname] = ident;

                    } catch(e) { }  // Nothing to do but skip this identity...
                }


            } catch(e) { }  // Nothing to do but skip this account...

        }

        var menuList = document.getElementById("mlFolderAccount");
        menuList.selectedItem = menuList.appendItem("Use Default", "Use Default");      

        let entriesArray = Object.entries(menuListEntries);
        if (sortAccounts == "true")
          entriesArray = entriesArray.sort((a, b) => (a > b));
        for (const [a, i] of entriesArray) {
          let menuItem = menuList.appendItem(a, i);
          if (defaultFrom == i) {
            menuList.selectedItem = menuItem;
          }              
        }

        document.getElementById("mlFolderAccountDefaultTo").setAttribute("value", defaultTo);
        document.getElementById("mlFolderAccountAddToCcOnReply").checked = (addToCcOnReply == "true");
        document.getElementById("mlFolderAccountReplyToOnReplyForward").checked = (replyToOnReplyForward == "true");
        document.getElementById("mlFolderAccountOverrideReturnAddress").checked = (overrideReturnAddress == "true");
        document.getElementById("mlFolderAccountDefaultReplyTo").setAttribute("value", defaultReplyTo);  // (by Jakob)

        document.getElementById("mlFolderAccountSortAccounts").checked = (sortAccounts == "true");

        document.addEventListener("dialogaccept", function(event) {
        	folderAccountProps.saveAccountPrefs();
        });

    },


/////

    // Removes leading whitespaces
    LTrim: function ( value ) {
        var re = /\s*((\S+\s*)*)/;
        return value.replace(re, "$1");
    },

    // Removes ending whitespaces
    RTrim: function ( value ) {
        var re = /((\s*\S+)*)\s*/;
        return value.replace(re, "$1");
    },

    // Removes leading and ending whitespaces
    trim: function ( value ) {
        return folderAccountProps.LTrim(folderAccountProps.RTrim(value));
    },



    saveAccountPrefs: function() {

        // Get value of our box:

        try {

            var mlFrom                    = document.getElementById("mlFolderAccount");
            var mlTo                      = document.getElementById("mlFolderAccountDefaultTo");
            var mlAddToCcOnReply          = document.getElementById("mlFolderAccountAddToCcOnReply");
            var mlReplyToOnReplyForward	  = document.getElementById("mlFolderAccountReplyToOnReplyForward");
            var mlOverrideReturnAddress   = document.getElementById("mlFolderAccountOverrideReturnAddress");
            var mlReplyTo                 = document.getElementById("mlFolderAccountDefaultReplyTo");  // (by Jakob)
            
            let mlSortAccounts            = document.getElementById("mlFolderAccountSortAccounts");

            var folderURI =  window.arguments[0].folder.URI;

            var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
            prefs = prefs.getBranch("extensions.folderaccount.");   

            if(mlFrom.value == "Use Default") {
                // If the value is "Use Default", then we'll just delete the relevant saved preference
                // Need to use try/catch because if pref doesn't exist, clearUserPref will bomb
                try {
                    prefs.clearUserPref(folderURI);
                    } catch (e) { }

            } else {

                // Otherwise, save the preference
                prefs.setCharPref(folderURI,mlFrom.value);
            }
            
            mlTo.value = folderAccountProps.trim(mlTo.value);   // Strip leading and trailing spaces
            mlReplyTo.value = folderAccountProps.trim(mlReplyTo.value); 

            if(mlTo.value == "") {
                // If the value is blank, then we'll just delete the relevant saved preference
                // Need to use try/catch because if pref doesn't exist, clearUserPref will bomb
                try {
                    prefs.clearUserPref("to." + folderURI);
                } catch (e) { }

            } else {
                // Otherwise, save the preference
                prefs.setCharPref("to." + folderURI,mlTo.value);
            }


            // Save state of our checkbox
            prefs.setCharPref("addToCcOnReply." + folderURI, mlAddToCcOnReply.getAttribute("checked"));
            prefs.setCharPref("replyToOnReplyForward." + folderURI, mlReplyToOnReplyForward.getAttribute("checked"));
            prefs.setCharPref("overrideReturnAddress." + folderURI, mlOverrideReturnAddress.getAttribute("checked"));
            prefs.setCharPref("replyTo." + folderURI,mlReplyTo.value);

            prefs.setCharPref("sortAccounts", mlSortAccounts.getAttribute("checked"));
            
        } catch (e) { } 
    }
};

function onLoad(activatedWhileWindowOpen) {
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
            <spacer flex="1"/>
            <checkbox id="mlFolderAccountSortAccounts" label="Sort (next time)" accesskey="S"/>
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
    </vbox>
  `);
  folderAccountProps.addTab();
}

function onUnload(deactivatedWhileWindowOpen) {}
