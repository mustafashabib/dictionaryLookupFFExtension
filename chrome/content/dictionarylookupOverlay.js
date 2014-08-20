// Encapsulate Dictionary Lookup Extension in its
// own scope to avoid conflicts with other addons
(function() {

// Dictionary Lookup Extension object
var DLE = {
	
	initialised: false,
	
	currentWord: "",
	selectedText: "",
	currentURL: "",
	
	httpRequest: null,
	httpRequestCallbackFunction: null,
	
	contentAreaContextMenu: null,
	dictionarylookupSubMenu: null,
	dictionarylookupMenuPopup: null,
	
	DLEDebugDIV: null,
	
	init: function() {
		if (this.initialised === false ) {
			if ( this.contentAreaContextMenu === null ) {
				this.contentAreaContextMenu = document.getElementById("contentAreaContextMenu");
			}
			this.contentAreaContextMenu.addEventListener("popupshowing", function(evt) {
				// Make sure the target triggering this event is the context menu
				if ( this.id == evt.target.id ) {
					DLE.contextPopupShowing();
				}
			}, false);
			
			if ( this.dictionarylookupSubMenu === null ) {
				this.dictionarylookupSubMenu = document.getElementById("dictionarylookup_submenu");
			}
			
			this.dictionarylookupSubMenu.addEventListener("mouseover", function(evt) {
				// Make sure the target triggering this event is the 'Define...' menu item
				if ( this.id == evt.target.id ) {
					DLE.lookup();
				}
			}, false);
			
			if ( this.dictionarylookupMenuPopup === null ) {
				this.dictionarylookupMenuPopup = document.getElementById("dictionarylookup_popup");
			}
			
			this.initialised = true;
		}
	},
	
	contextPopupShowing: function () {
		if ( this.dictionarylookupSubMenu === null ) {
			this.dictionarylookupSubMenu = document.getElementById("dictionarylookup_submenu");
		}
		
		if ( this.dictionarylookupSubMenu !== null ) {
			this.dictionarylookupSubMenu.hidden = !(gContextMenu.isContentSelected 
													|| gContextMenu.onTextInput);
		}
	},
	
	debug: function(message) {
		if ( this.DLEDebugDIV === null) {
			this.DLEDebugDIV = this.createDebugDIV();
		}
		this.DLEDebugDIV.innerHTML += message + "<br />";
	},
	
	createDebugDIV: function() {
		var focusedWindow = document.commandDispatcher.focusedWindow,
			pageDoc = focusedWindow.document,
			debugDIV = pageDoc.createElement("div");
			
		debugDIV.id = "DLEDebugDIV";
		debugDIV.style.background = "#fff";
		debugDIV.style.color = "#222";
		debugDIV.style.opacity = 0.7;
		debugDIV.style.position = "absolute";
		debugDIV.style.top = 0;
		debugDIV.style.left = 0;
		debugDIV.style.zIndex = 99999;
		
		pageDoc.body.appendChild(debugDIV);
		
		return pageDoc.getElementById("DLEDebugDIV");
	},
	
	// this trim was suggested by Tobias Hinnerup
	trim: function(str) {
		return(str.replace(/^\s+/,'').replace(/\s+$/,''));
	},
	
	replaceAll: function(str, search, replace) { 
		  return str.replace(new RegExp(search,"g"), replace);
	},
	
	stripHtml: function(s) {
		var d = s;
		// remove the script tags and their contents
		d =this.removeScriptTag(d);
		// remove comments
		d = this.removeComments(d);
		return d.replace(/<[^<>]*>/ig,"");
		
	},
	
	removeScriptTag: function(s) {
		return s.replace(/<script[^<>]*>.*<\/script>/ig,"");
	},
	
	removeComments: function(s) {
		return s.replace(/<!--.*-->/ig,"");
	},
	
	// HTMLParser - Taken from Mozilla Developer Network
	// HTML to DOM - https://developer.mozilla.org/en/Code_snippets/HTML_to_DOM
	HTMLParser: function(aHTMLString){
		var html = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "html", null),
			body = document.createElementNS("http://www.w3.org/1999/xhtml", "body");
			
		html.documentElement.appendChild(body);
	
		body.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]
			.getService(Components.interfaces.nsIScriptableUnescapeHTML)
			.parseFragment(aHTMLString, false, null, body));
	
		return body;
	},
	
	goToDefintion: function() {
		try {
			var newTab = gBrowser.addTab(this.currentURL);
	  		gBrowser.selectedTab = newTab;
		} catch(e) {
			//alert(e);
		}
	},
	
	addDefinitionLine: function(label, lineNum) {
		if ( this.trim(label) != "" ) {
			var newMenuItem = this.createMenuItem(label, lineNum);
			if ( newMenuItem !== null) {
				newMenuItem.addEventListener("command", function() {
					DLE.goToDefintion();
				}, false);
				newMenuItem.setAttribute("crop", "none");
			}
		}
	},
	
	createMenuItem: function(label, lineNum) {
		if (typeof label !== "string" || label == "") return null;
		
		var lineNum = lineNum || 1;
		
		var newMenuItem = document.createElement("menuitem");
		newMenuItem.setAttribute("id", "dictionarylookupline-" + lineNum);
		newMenuItem.setAttribute("label", label);
		this.dictionarylookupMenuPopup.appendChild(newMenuItem);
		
		return newMenuItem;
	},
	
	loadTextIntoSubMenu: function(text_to_load) {
		try
		{
			var menuitems = this.dictionarylookupMenuPopup.getElementsByTagName("menuitem");
			for(var i=menuitems.length - 1; i>=0; i--) 
			{
				var childItem = this.dictionarylookupMenuPopup.childNodes[i];
				this.dictionarylookupMenuPopup.removeChild(childItem);
			}
			
			text_to_load = this.replaceAll(text_to_load, '&nbsp;', " "); //replace &nbsp; with a space
			text_to_load = this.replaceAll(text_to_load, '\n', " MUSTAFA_SKIP "); //make new lines their own word
			var words = text_to_load.toString().split(" ");
			var wordsLength = words.length;
			var maxWordsPerLine = 8;
			var charsPerLine = 50;
			
			if(wordsLength >= 1)
			{
				var line="";
				for (var i=0; i<wordsLength; i++){
					var temp = line + " " + words[i];
					if (words[i] == "MUSTAFA_SKIP") {
						this.addDefinitionLine(line, i);
						line = "";
					} else if (temp.length > charsPerLine) {
						this.addDefinitionLine(line, i);
						line = words[i];
					} else {
						line = temp;
						if (i==wordsLength-1) {
							this.addDefinitionLine(line, i);
						}
					}
				}
			} else {
				this.loadTextIntoSubMenu("No Definition found", 1);
			}
			
			this.currentWord = this.selectedText;
			
		} catch(e) {
			var label = e;
			this.loadTextIntoSubMenu(label, 1);
		}
	}, // DLE.loadTextIntoSubMenu()
	
	getSelectedText: function() {
		var focusedWindow = document.commandDispatcher.focusedWindow,
			pageDoc = focusedWindow.document,
			activeElement = pageDoc.activeElement,
			selection = "";
		
		// TODO - figure out better logic to do this, it is ugly
		if (activeElement && ( activeElement.tagName.toLowerCase() == "textarea"
								|| (activeElement.tagName.toLowerCase() == "input" && activeElement.type == "text") ) ) {
			var text = activeElement.value,
				selectionStart = activeElement.selectionStart,
				selectionEnd = activeElement.selectionEnd;
				
			selection = text.substring(selectionStart, selectionEnd);
		} else {
			selection = focusedWindow.getSelection();
		}
		
		selection = selection.toString().replace( /[\.,;!#\$\/:\?'\(\)\[\]_\-\\]/ig, ""); //remove punctuation
		return this.trim(selection);
	},
	
	showDefinitionDictionaryDotCom: function() {
		try {
			var str = this.httpRequest.responseText;
			var htmlIndex=str.indexOf('<div class="luna-Ent"');
			
			if (htmlIndex > -1) {
				var DOMPars = this.HTMLParser(str);
				var htmlContainer = DOMPars.getElementsByClassName('luna-Ent')[0];
				var html = htmlContainer.getElementsByClassName('luna-Ent');
				var numItems = html.length <= 5 ? html.length : 5;
				var definition = "";
				for (var i=0; i < numItems; i++) {
					var thisDefinition = this.trim(html[i].textContent);
					thisDefinition = thisDefinition.replace(/^(\d\.)/g, "$1 ");
					if ( i < (numItems-1) ) thisDefinition+=" MUSTAFA_SKIP ";
					definition += thisDefinition;
				}
				
				this.loadTextIntoSubMenu(definition);
				
				return;
			}
			
			var iFirst = str.indexOf('><td valign="top">');
			if(iFirst == -1)
			{
				iFirst = str.indexOf('<ol type="1">');
				if(iFirst == -1)
				{
					iFirst = str.indexOf('<div class="body">');
					if(iFirst == -1)
					{
						this.loadTextIntoSubMenu("No Definition found", 1);
						return; //show NO DEF FOUND
					}
					else
					{
						var iStartOfDef = str.indexOf("<td>", iFirst) + 4;
						var iEndOfDef = str.indexOf("</td>", iStartOfDef);
						var definition = str.substring(iStartOfDef, iEndOfDef);
						
						this.loadTextIntoSubMenu(this.stripHtml(definition));
					}
				}
				else
				{
					var iStartOfDef = iFirst + 13;
					var iEndOfDef = str.indexOf("</ol>", iStartOfDef);
					var definitions = str.substring(iStartOfDef, iEndOfDef);
					
					this.loadTextIntoSubMenu(this.stripHtml(definitions));
				}
			}
			else
			{
				var iStartOfDef =  iFirst + 18;
				var iEndOfDef = str.indexOf("</td>", iStartOfDef);
	
				var firstDef = str.substring(iStartOfDef, iEndOfDef);
				
				if(firstDef=="1.&nbsp;"){
					startNextTD = str.indexOf('><td valign="top">', iStartOfDef) + 18;
					endNextTD = str.indexOf('</td>', startNextTD);
					
					firstDef = str.substring(startNextTD, endNextTD);
				} else {
					this.loadTextIntoSubMenu("No Definition found", 1);
				}
	
				this.loadTextIntoSubMenu(this.stripHtml(firstDef));
			}
		} catch(e) {
			alert("Error: "+e+"\ne.lineNumber: "+e.lineNumber+"\ne.fileName: "+e.fileName);
			this.loadTextIntoSubMenu("No Definition found", 1);
		}
	}, // DLE.showDefinitionDictionaryDotCom()

	showDefinitionDictionaryDotComUpdated: function() {
		try {
			var str = this.httpRequest.responseText;
			var htmlIndex=str.indexOf('<div class="def-content"');
			
			if (htmlIndex > -1) {
				console.log(str);
				var DOMPars = this.HTMLParser(str);
				//get the first def-content class
				var htmlContainer = DOMPars.getElementsByClassName('def-content')[0];
				//get the first span inside of it
				console.log(htmlContainer);
				var html = htmlContainer.getElementsByTagName('span')[0];
				console.log(html);
				//replace all the html tags inside of it with nothing
				var definition = html.innerHTML.replace(/<[^>]*>/g, "");

				this.loadTextIntoSubMenu(definition);
				
				return;
			}
			
			var iFirst = str.indexOf('><td valign="top">');
			if(iFirst == -1)
			{
				iFirst = str.indexOf('<ol type="1">');
				if(iFirst == -1)
				{
					iFirst = str.indexOf('<div class="body">');
					if(iFirst == -1)
					{
						this.loadTextIntoSubMenu("No Definition found", 1);
						return; //show NO DEF FOUND
					}
					else
					{
						var iStartOfDef = str.indexOf("<td>", iFirst) + 4;
						var iEndOfDef = str.indexOf("</td>", iStartOfDef);
						var definition = str.substring(iStartOfDef, iEndOfDef);
						
						this.loadTextIntoSubMenu(this.stripHtml(definition));
					}
				}
				else
				{
					var iStartOfDef = iFirst + 13;
					var iEndOfDef = str.indexOf("</ol>", iStartOfDef);
					var definitions = str.substring(iStartOfDef, iEndOfDef);
					
					this.loadTextIntoSubMenu(this.stripHtml(definitions));
				}
			}
			else
			{
				var iStartOfDef =  iFirst + 18;
				var iEndOfDef = str.indexOf("</td>", iStartOfDef);
	
				var firstDef = str.substring(iStartOfDef, iEndOfDef);
				
				if(firstDef=="1.&nbsp;"){
					startNextTD = str.indexOf('><td valign="top">', iStartOfDef) + 18;
					endNextTD = str.indexOf('</td>', startNextTD);
					
					firstDef = str.substring(startNextTD, endNextTD);
				} else {
					this.loadTextIntoSubMenu("No Definition found", 1);
				}
	
				this.loadTextIntoSubMenu(this.stripHtml(firstDef));
			}
		} catch(e) {
			alert("Error: "+e+"\ne.lineNumber: "+e.lineNumber+"\ne.fileName: "+e.fileName);
			this.loadTextIntoSubMenu("No Definition found", 1);
		}
	}, // DLE.showDefinitionDictionaryDotComUpdated()
	
	showDefinitionMerriamWebster: function(){
		try {
		var str = this.httpRequest.responseText;
		
		var iFirst = str.indexOf(">:<");
		if(iFirst == -1)
		{
			this.loadTextIntoSubMenu("No Definition found", 1);
			return; //show NO DEF FOUND
		}
		var iStartOfDef =  iFirst + 6;
		var iEndOfDef = str.indexOf("<b>: ", iStartOfDef);
		
		var firstDef = str.substring(iStartOfDef, iEndOfDef);	
		
		this.loadTextIntoSubMenu(this.stripHtml(firstDef));
		} catch(e) {
			this.loadTextIntoSubMenu(e);
		}
	}, // DLE.showDefinitionMerriamWebster()
	
	_httpExecuteCallback: function() {
		if (DLE.httpRequestCallbackFunction != null) {
			if (DLE.httpRequest.readyState == 4) {
				if (DLE.httpRequest.status >= 200 && DLE.httpRequest.status < 400) {
					DLE.httpRequestCallbackFunction();
					DLE.httpRequestCallbackFunction = null;
				}
			}
		}
	},
	
	_httpGet: function(url, callbackFunction) {
		this.httpRequest = false;
		this.httpRequestCallbackFunction = callbackFunction;
		this.httpRequest = new XMLHttpRequest();
		this.httpRequest.onreadystatechange = this._httpExecuteCallback;
		this.httpRequest.open('GET', url, true);
		this.httpRequest.send(null);
	},
	
	lookup: function() {
		this.selectedText = this.getSelectedText();
		if ( this.currentWord != this.selectedText ) {
			this.loadTextIntoSubMenu("Loading...");
			this.currentURL = "http://dictionary.reference.com/browse/" + this.selectedText;
			this._httpGet(this.currentURL , this.showDefinitionDictionaryDotComUpdated);
		}
	}
	
}; // DLE{}

// add listener to initialise Dictionary Lookup Extension
window.addEventListener("load", function() {
	DLE.init();
}, false);

})();
