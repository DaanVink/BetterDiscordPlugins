/**
 * @name AvatarIconViewer
 * @website https://github.com/rauenzi/BetterDiscordAddons/tree/master/Plugins/aivViewer
 * @source https://raw.githubusercontent.com/rauenzi/BetterDiscordAddons/master/Plugins/aivViewer/aivViewer.plugin.js
 */
/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/

function print(args) { console.log(args) }

var AvatarIconViewer = (_ => {
    const config = {
        info:{
            name:"AvatarIconViewer",
            authors:[{
                name:"DavinMiler",
                discord_id:"275215231918276608"
            }],
        version:"1.0.0",
        description:"Allows you to view and copy a user's profile picture.",
        github:"https://github.com/rauenzi/BetterDiscordAddons/tree/master/Plugins/aivViewer",
        github_raw:"https://raw.githubusercontent.com/rauenzi/BetterDiscordAddons/master/Plugins/aivViewer/aivViewer.plugin.js"},
        defaultConfig:[
            {   type:"switch",
                id:"contextMenus",
                name:"Context Menus",
                note:"Toggles colorizing of typing notifications.",
                value:true
            }
        ],
        strings:{
            en:{
                userContextLabel:"View Profile Picture",
                guildContextLabel:"View Server Icon",
                userHeader: {
                    "header": "${name}'s Profile Picture",
                    
                },
                guildHeader: {
                    "header": "${name}'s Server Icon",
                    
                },
                copiedImage: "Copied image to clipboard!",
                copiedLink: "Copied link to clipboard!",
                copyFailed: "Failed to copy to clipboard!",
                settings:{
                    contextMenus:{
                        name:"Context Menu Button",
                        note:"Adds a button to view the profile picture to select context menus."}
                    }
                }
            },
            main:"index.js"};
    
        return !global.ZeresPluginLibrary ? class {
        constructor() {this._config = config;}
        getName() {return config.info.name;}
        getAuthor() {return config.info.authors.map(a => a.name).join(", ");}
        getDescription() {return config.info.description;}
        getVersion() {return config.info.version;}
        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                }
            });
            
        }
        start() {
        }

        

        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {
    const {PluginUtilities, Toasts, DiscordClasses, DiscordSelectors, Utilities, DOMTools} = Api;

    const path = require("path");
    const process = require("process");
    const request = window.require("request");
    const fs = require("fs");
    const { clipboard, nativeImage } = require("electron");

    const escapeHTML = DOMTools.escapeHTML ? DOMTools.escapeHTML : function(html) {
        const textNode = document.createTextNode("");
        const spanElement = document.createElement("span");
        spanElement.append(textNode);
        textNode.nodeValue = html;
        return spanElement.innerHTML;
    };

    return class AvatarIconViewer extends Plugin {
        constructor() {
            super();

            this.css = `.member-perms-header {
    display: flex;
    justify-content: space-between;
}


/* Modal */

@keyframes aiv-backdrop {
    to { opacity: 0.85; }
}

@keyframes aiv-modal-wrapper {
    to { transform: scale(1); opacity: 1; }
}

@keyframes aiv-backdrop-closing {
    to { opacity: 0; }
}

@keyframes aiv-modal-wrapper-closing {
    to { transform: scale(.7); opacity: 0; }
}

#aiv-modal-wrapper .callout-backdrop {
    animation: aiv-backdrop 250ms ease;
    animation-fill-mode: forwards;
    opacity: 0;
    background-color: rgb(0, 0, 0);
    transform: translateZ(0px);
}

#aiv-modal-wrapper.closing .callout-backdrop {
    animation: aiv-backdrop-closing 200ms linear;
    animation-fill-mode: forwards;
    animation-delay: 50ms;
    opacity: 0.85;
}

#aiv-modal-wrapper.closing .modal-wrapper {
    animation: aiv-modal-wrapper-closing 250ms cubic-bezier(0.19, 1, 0.22, 1);
    animation-fill-mode: forwards;
    opacity: 1;
    transform: scale(1);
}

#aiv-modal-wrapper .modal-wrapper {
    animation: aiv-modal-wrapper 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation-fill-mode: forwards;
    transform: scale(0.7);
    transform-origin: 50% 50%;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    contain: content;
    justify-content: center;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    user-select: none;
    z-index: 1000;
}

#aiv-modal-wrapper .modal-body {
    background-color: #36393f;
    height: 440px;
    width: auto;
    flex-direction: column;
    overflow: hidden;
    display: flex;
    flex: 1;
    padding: 25px 25px 0px 25px;
    contain: layout;
    position: relative;

    border-radius: 0px 0px 5px 5px;
}

#aiv-modal-wrapper .header {
    box-shadow: 0 2px 3px 0 rgba(0,0,0,.2);
    padding: 12px 20px;
    z-index: 1;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    line-height: 19px;
    border-radius: 5px 5px 0px 0px;
}

.aiv-header {
    background-color: #202225;
}

.aiv-imgContainer {
}

.aiv-buttonwrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding-top: 15px;
    padding-bottom: 15px;
    width: 100%;
}

.aiv-button {
    min-width: 125px;
    min-height: 38px;
    width: 25%;

    margin-left: 5px;
    margin-right: 5px;

    display: flex;

    color: #fff;
    background-color: #7289da;

    border-radius: 3px;
    border: none;

    line-height: 16px;
    font-size: 16px;
    font-weight: 500;
    align-items: center;
    justify-content: center;


    transition: background-color .17s ease,color .17s ease;
}

.aiv-button:hover {
    background-color: #677bc4;
}
`;

            this.listHTML = `<div class="member-perms-header \${bodyTitle}">`;

            this.modalHTML = `<div id="aiv-modal-wrapper">
        <div class="callout-backdrop \${backdrop}"></div>
        <div class="modal-wrapper \${modal}">
            <div id="aiv-modal" class="\${inner}">
                <div class="header aiv-header"><div class="title">\${header}</div></div>
                <div class="modal-body"">
                    <div class="aiv-imgContainer"></div>
                    <div class="aiv-buttonwrapper">
                        <div class="aiv-button aiv-copyLink">Copy image link</div>
                        <div class="aiv-button aiv-copyImage">Copy image</div>
                        <div class="aiv-button aiv-openBrowser">Open in browser</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
        }

        onStart() {
            PluginUtilities.addStyle(this.getName(), this.css);

            this.modalHTML = Utilities.formatTString(this.modalHTML, DiscordClasses.Backdrop);
            this.modalHTML = Utilities.formatTString(this.modalHTML, DiscordClasses.Modals);

            this.promises = {state: {cancelled: false}, cancel() {this.state.cancelled = true;}};

            if (!window.BDFDB) window.BDFDB = {myPlugins:{}};
			if (window.BDFDB && window.BDFDB.myPlugins && typeof window.BDFDB.myPlugins == "object") window.BDFDB.myPlugins[this.getName()] = this;
			let libraryScript = document.querySelector("head script#BDFDBLibraryScript");
			if (!libraryScript || (performance.now() - libraryScript.getAttribute("date")) > 600000) {
				if (libraryScript) libraryScript.remove();
				libraryScript = document.createElement("script");
				libraryScript.setAttribute("id", "BDFDBLibraryScript");
				libraryScript.setAttribute("type", "text/javascript");
				libraryScript.setAttribute("src", "https://mwittrien.github.io/BetterDiscordAddons/Plugins/BDFDB.min.js");
				libraryScript.setAttribute("date", performance.now());
				libraryScript.addEventListener("load", _ => {this.initialize();});
				document.head.appendChild(libraryScript);
            }
            
            else if (window.BDFDB && typeof BDFDB === "object" && BDFDB.loaded) this.initialize();
			this.startTimeout = setTimeout(_ => {
				try {return this.initialize();}
				catch (err) {console.error(`%c[${this.getName()}]%c`, "color: #3a71c1; font-weight: 700;", "", "Fatal Error: Could not initiate plugin! " + err);}
			}, 30000);


        }

        initialize() {     
            if (window.BDFDB && typeof BDFDB === "object" && BDFDB.loaded) {
                BDFDB.PluginUtils.init(this);
			}
            else console.error(`%c[${this.getName()}]%c`, "color: #3a71c1; font-weight: 700;", "", "Fatal Error: Could not load BD functions!");

        }

        async onStop() {
            PluginUtilities.removeStyle(this.getName());
            this.promises.cancel();
        }


        showModal(modal) {
            const popout = document.querySelector(DiscordSelectors.UserPopout.userPopout);
            if (popout) popout.style.display = "none";
            const app = document.querySelector(".app-19_DXt");
            if (app) app.append(modal);
            else document.querySelector("#app-mount").append(modal);
        }

        createModalUser(name, id) {
            let bdUser = BDFDB.LibraryModules.UserStore.getUser(id);
            var url = BDFDB.LibraryModules.IconUtils.getUserAvatarURL(bdUser);
            url = url.replace("?size=128", "?size=2048");
            return this.createModal(name, url, true);
        }

        createModalGuild(name, id, icon) {
            if (icon != null) { 
                const url = "https://cdn.discordapp.com/icons/" + id + "/" + icon + ".webp?size=4096"
                return this.createModal(name, url, false);
            }
            else {
                Toasts.error("Icon is null!")
            }
        }

        createModal(name, url, isUser) {
            const modal = DOMTools.createElement(Utilities.formatTString(Utilities.formatTString(this.modalHTML, isUser ? this.strings.userHeader : this.strings.guildHeader), {name: escapeHTML(name)}));
            modal.find(".callout-backdrop").on("click", () => {
                modal.addClass("closing");
                setTimeout(() => { modal.remove(); }, 300);
            });

            const testimage = document.createElement("IMG");
            testimage.setAttribute("src", url);
            testimage.classList += "aiv-image";
            modal.find(".aiv-imgContainer").appendChild(testimage);

            modal.find(".aiv-copyLink").onclick = function copyLink() { 
                clipboard.writeText(url)
                Toasts.success(config.strings.en.copiedLink);
                modal.addClass("closing");
                setTimeout(() => { modal.remove(); }, 300);
            };

            modal.find(".aiv-copyImage").onclick = function copyImage() { 
                request({url: url.replace(".webp", ".png"), encoding: null}, (error, response, buffer) => {
                    if (error) return Toasts.error(config.strings.en.copyFailed);
                    
                    if (process.platform === "win32" || process.platform === "darwin") {
                        clipboard.write({image: nativeImage.createFromBuffer(buffer)});
                    }
                    else {
                            const file = path.join(process.env.HOME || process.env.USERPROFILE, "i2ctemp.png");
                            fs.writeFileSync(file, buffer, {encoding: null});
                            clipboard.write({image: file});
                            fs.unlinkSync(file);
                    }
                    Toasts.success(config.strings.en.copiedImage);
                    modal.addClass("closing");
                    setTimeout(() => { modal.remove(); }, 300); 
                });
            };

            
            modal.find(".aiv-openBrowser").onclick = function openInBrowser() { 
                require('electron').shell.openExternal(url);
                modal.addClass("closing");
                setTimeout(() => { modal.remove(); }, 300);
            };

            return modal;
        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            panel.addListener((id, checked) => {
                if (id == "contextMenus") {
                }
            });
            return panel.getElement();
        }

        onUserContextMenu (e) { 
            if (e.instance.props.user) {
				let [children, index] = BDFDB.ReactUtils.findChildren(e.returnvalue, {name:["FluxContainer(MessageDeveloperModeGroup)", "DeveloperModeGroup"]});
				children.splice(index > -1 ? index : children.length, 0, BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.ContextMenuItems.Group, {
					children: [
						BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.ContextMenuItems.Item, {
                            label: config.strings.en.userContextLabel,
                            action: _ => {
                                BDFDB.ContextMenuUtils.close(e.instance);
                                this.showModal(this.createModalUser(e.instance.props.user.username, e.instance.props.user.id));
                            }
						})
					]
				}));
            }
        }

        onGuildContextMenu (e) {
            if (e.instance.props.guild.icon) {
				let [children, index] = BDFDB.ReactUtils.findChildren(e.returnvalue, {name:["FluxContainer(MessageDeveloperModeGroup)", "DeveloperModeGroup"]});
				children.splice(index > -1 ? index : children.length, 0, BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.ContextMenuItems.Group, {
					children: [
						BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.ContextMenuItems.Item, {
                            label: config.strings.en.guildContextLabel,
                            action: _ => {
                                BDFDB.ContextMenuUtils.close(e.instance);
                                this.showModal(this.createModalGuild(e.instance.props.guild.name, e.instance.props.guild.id, e.instance.props.guild.icon));
                            }
						})
					]
				}));
            }
        }

    };
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/