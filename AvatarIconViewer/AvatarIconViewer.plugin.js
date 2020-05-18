/**
 * @name AvatarIconViewer
 * @website https://github.com/rauenzi/BetterDiscordAddons/tree/master/Plugins/aivViewer
 * @source https://raw.githubusercontent.com/rauenzi/BetterDiscordAddons/master/Plugins/aivViewer/aivViewer.plugin.js
 */

 function print(arg) { console.log(arg); }

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
        github:"https://github.com/DaanVink/BetterDiscordPlugins/blob/master/AvatarIconViewer/AvatarIconViewer.plugin.js",
        github_raw:"https://raw.githubusercontent.com/DaanVink/BetterDiscordPlugins/master/AvatarIconViewer/AvatarIconViewer.plugin.js"},
        defaultConfig:[
            {   type:"switch",
                id:"contextMenus",
                name:"Context Menus",
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

    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {
    const {Patcher, PluginUtilities, Toasts, DiscordModules, DiscordClasses, DiscordSelectors, Utilities, DOMTools} = Api;
    const MenuActions = DiscordModules.ContextMenuActions;
    const MenuItem = ZLibrary.DiscordModules.ContextMenuItem;

    const path = require("path");
    const process = require("process");
    const request = window.require("request");
    const fs = require("fs");
    const { clipboard, nativeImage } = require("electron");

    const escapeHTML = function (str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
    }

    return class AvatarIconViewer extends Plugin {
        constructor() {
            super();

            this.contextMenuPatches = [];

            this.css = `
            .member-perms-header {
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
                background-color: #7289da;
            }

            .aiv-button:active {
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
            if (this.settings.contextMenus) this.bindContextMenus(this.promises.state);
        }

        async bindContextMenus(promiseState) {
            this.patchGuildContextMenu(promiseState);
            this.patchUserContextMenu(promiseState);
        }

        unbindContextMenus() {
            for (const cancel of this.contextMenuPatches) cancel();
        }

        async patchGuildContextMenu(promiseState) {
            const GuildContextMenu = await PluginUtilities.getContextMenu("GUILD_ICON_");
            if (promiseState.cancelled) return;

            this.contextMenuPatches.push(Patcher.after(GuildContextMenu, "default", (_, [props], retVal) => {
                const original = retVal.props.children[0].props.children;
                const newItem = new MenuItem({label: this.strings.guildContextLabel, action: () => {
                    MenuActions.closeContextMenu();
                    this.showModal(this.setupGuildModal(props.guild));
                }});
                if (Array.isArray(original)) original.unshift(newItem);
                else retVal.props.children[0].props.children = [original, newItem];
            }));
            PluginUtilities.forceUpdateContextMenus();
        }

        async patchUserContextMenu(promiseState) {
            const UserContextMenu = await PluginUtilities.getContextMenu("USER_CHANNEL_");
            if (promiseState.cancelled) return;

            this.contextMenuPatches.push(Patcher.after(UserContextMenu, "default", (_, [props], retVal) => {
                var original = retVal.props.children.props.children.props.children[0].props.children;
                const newItem = new MenuItem({label: this.strings.userContextLabel, action: () => {
                    MenuActions.closeContextMenu();
                    this.showModal(this.setupUserModal(props.user));
                }});
                
                if (Array.isArray(original)) original.unshift(newItem);
                else retVal.props.children.props.children.props.children[0].props.children = [original, newItem];
            }));
            PluginUtilities.forceUpdateContextMenus();
        }

        onStop() {
            PluginUtilities.removeStyle(this.getName());
            this.promises.cancel();
            this.unbindContextMenus();
        }

        setupUserModal(user) {
            const url = "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".webp?size=2048";
            return this.createModal(user.username, url, true);
        }

        setupGuildModal(guild) {
            if (guild.icon != null) { 
                const url = "https://cdn.discordapp.com/icons/" + guild.id + "/" + guild.icon + ".webp?size=4096";
                return this.createModal(guild.name, url, false);
            }
            else {
                Toasts.error("Icon is null!");
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
                Toasts.success("Copied link to clipboard!");
                modal.addClass("closing");
                setTimeout(() => { modal.remove(); }, 300);
            };

            modal.find(".aiv-copyImage").onclick = function copyImage() { 
                request({url: url.replace(".webp", ".png"), encoding: null}, (error, response, buffer) => {
                    if (error) return Toasts.error("Failed to copy image: " + error);
                    
                    if (process.platform === "win32" || process.platform === "darwin") {
                        clipboard.write({image: nativeImage.createFromBuffer(buffer)});
                    }
                    else {
                            const file = path.join(process.env.HOME || process.env.USERPROFILE, "i2ctemp.png");
                            fs.writeFileSync(file, buffer, {encoding: null});
                            clipboard.write({image: file});
                            fs.unlinkSync(file);
                    }
                    Toasts.success("Copied image to clipboard!");
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

        showModal(modal) {
            const popout = document.querySelector(DiscordSelectors.UserPopout.userPopout);
            if (popout) popout.style.display = "none";
            const app = document.querySelector(".app-19_DXt");
            if (app) app.append(modal);
            else document.querySelector("#app-mount").append(modal);
        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            panel.addListener((id, checked) => {
                if (id == "contextMenus") {
                }
            });
            return panel.getElement();
        }
    };
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();