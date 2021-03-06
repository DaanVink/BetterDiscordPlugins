/**
 * @name AvatarIconViewer
 * @website https://github.com/DaanVink/BetterDiscordPlugins
 * @source https://raw.githubusercontent.com/DaanVink/BetterDiscordPlugins/master/AvatarIconViewer/AvatarIconViewer.plugin.js
 */

function print(args) {console.log(args)}


module.exports = (() => {
    
    const config = {
        info:{
            name:"AvatarIconViewer",
            authors:[{
                name:"DavinMiler",
                discord_id:"275215231918276608"
            }],
        version:"1.0.6",
        description:"Allows you to view and copy a user's profile picture.",
        github:"https://github.com/DaanVink/BetterDiscordPlugins/blob/master/AvatarIconViewer/AvatarIconViewer.plugin.js",
        github_raw:"https://raw.githubusercontent.com/DaanVink/BetterDiscordPlugins/master/AvatarIconViewer/AvatarIconViewer.plugin.js"},
        changelog: [{
            title: "Upgrades, people. Upgrades!",
            type: "added",
            items: ["We have a settings panel now!", "You can enable and disable where to show the buttons", "You can now choose to use the nickname when viewing an avatar"]
        },
        {
            title: "Squashed bugs on the menu.",
            type: "improved",
            items: ["Buttons no longer hide away when zoomed in", "Buttons in popout no longer multiply"]
        },],
        defaultConfig: [{
            type: "category",
            id: "contextMenus",
            name: "Context Menus",
            collapsible: true,
            shown: true,
            settings: [{
                    type: "switch",
                    id: "contextMenuUsers",
                    name: "Show in user context menu",
                    value: true
                }, {
                    type: "switch",
                    id: "contextMenuGuilds",
                    name: "Show in guild context menu",
                    value: true
                }]},
            {
            type: "category",
            id: "popoutMenus",
            name: "Popout Menu",
            collapsible: true,
            shown: true,
            settings: [{
                    type: "switch",
                    id: "popouts",
                    name: "Show button in user popout menu",
                    value: true
                    },
                ],
            },
            {
                type: "switch",
                id: "useNickname",
                name: "Use nickname when available",
                value: false
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
                copyFailed: "Failed to copy to clipboard!"
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
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {
    const {Patcher, WebpackModules, PluginUtilities, Toasts, DiscordClasses, DiscordSelectors, DiscordModules, Utilities, DOMTools, ReactComponents, ReactTools, DCM} = Api;

    const path = require("path");
    const process = require("process");
    const request = window.require("request");
    const fs = require("fs");
    const { clipboard, nativeImage } = require("electron");

    const UserStore = DiscordModules.UserStore;
    const GuildStore = DiscordModules.GuildStore;
    const SelectedGuildStore = DiscordModules.SelectedGuildStore;
    const MemberStore = DiscordModules.GuildMemberStore;

    const escapeHTML = function (str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
    }

    return class AvatarIconViewer extends Plugin {
        constructor() {
            super();
            this.css = `
            .member-perms-header {
                display: flex;
                justify-content: space-between;
            }

            @keyframes aiv-backdrop { to { opacity: 0.85; }}
            @keyframes aiv-modal-wrapper { to { transform: scale(1); opacity: 1; } }
            @keyframes aiv-backdrop-closing { to { opacity: 0; }}
            @keyframes aiv-modal-wrapper-closing { to { transform: scale(.7); opacity: 0; } }

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
                background-color: var(--background-secondary);
                height: auto;
                width: auto;
                flex-direction: column;
                overflow: hidden;
                display: flex;
                flex: 1;
                padding: 25px 25px 0px 25px;
                contain: layout;
                position: relative;
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

            .aiv-header { background-color: var(--background-tertiary); }

            .aiv-buttonwrapper {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                padding-top: 10px;
                padding-bottom: 10px;
                width: 100%;
                background-color: var(--background-secondary);
                border-radius: 0px 0px 5px 5px;
            }

            .aiv-button {
                min-width: 125px;
                min-height: 38px;
                width: 25%;
                margin-left: 25px;
                margin-right: 25px;
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

            .aiv-buttonPopout {
                height: 35px;
                width: 100%;
                margin: 0px;
            }

            /*.aiv-button:hover { background-color: #677bc4; }*/
            .aiv-button:hover {  background-color: #4e5d94;}
            .aiv-button:active { background-color: #4e5d94; }
            `;

            this.listHTML = `<div class="member-perms-header \${bodyTitle}">`;

            this.modalHTML = `<div id="aiv-modal-wrapper">
            <div class="callout-backdrop \${backdrop}"></div>
            <div class="modal-wrapper \${modal}">
                <div id="aiv-modal" class="\${inner}">
                    <div class="header aiv-header"><div class="title">\${header}</div></div>
                    <div class="modal-body"">
                        <div class="aiv-imgContainer"></div></div>
                        <div class="aiv-buttonwrapper">
                            <div class="aiv-button aiv-copyLink">Copy image link</div>
                            <div class="aiv-button aiv-copyImage">Copy image</div>
                            <div class="aiv-button aiv-openBrowser">Open in browser</div>
                        </div>
                    
                </div>
            </div>
        </div>`;
        
            this.popoutButtons = [];
            this.guildMenuPatches = [];
            this.userMenuPatches = [];
            this.cancelUserPopout = () => {
                
            };
        }
        
        
        initialize() {}

        onStart() {
            PluginUtilities.addStyle(this.getName(), this.css);

            this.modalHTML = Utilities.formatTString(this.modalHTML, DiscordClasses.Backdrop);
            this.modalHTML = Utilities.formatTString(this.modalHTML, DiscordClasses.Modals);
            if (this.settings.contextMenus.contextMenuGuilds) this.bindGuildContextMenus();
            if (this.settings.contextMenus.contextMenuUsers) this.bindUserContextMenus();
            this.promises = {state: {cancelled: false}, cancel() {this.state.cancelled = true;}};
            if (this.settings.popoutMenus.popouts) this.bindPopouts(this.promises.state);
        }

        onStop() {
            PluginUtilities.removeStyle(this.getName());
            this.unbindGuildContextMenus();
            this.unbindUserContextMenus();
            this.unbindPopouts();
        }

        unbindPopouts() { this.cancelUserPopout(); }
        async bindGuildContextMenus() { this.patchGuildContextMenus(); }
        async bindUserContextMenus() { this.patchUserContextMenus(); }
        unbindGuildContextMenus() { for (const cancel of this.guildMenuPatches) cancel(); }
        unbindUserContextMenus() { for (const cancel of this.userMenuPatches) cancel(); }

        patchGuildContextMenus() {
            const GuildContextMenu = WebpackModules.getModule(m => m.default && m.default.displayName == "GuildContextMenu");
            this.guildMenuPatches.push(Patcher.after(GuildContextMenu, "default", (_, [props], retVal) => {
                const original = retVal.props.children[0].props.children;
                const aivButton = DCM.buildMenuItem({label: "View Icon", action: () => {
                    this.setupGuildModal(props.guild);
                }});
                if (Array.isArray(original)) original.splice(1, 0, aivButton);
                else retVal.props.children[0].props.children = [original, aivButton];
            }));
        }

        setupGuildModal(guild) {
            if (guild.icon != null) { 
                var url = "https://cdn.discordapp.com/icons/" + guild.id + "/" + guild.icon + ".webp?size=4096";
                if (url.includes("/a_")) {
                    url = url.replace(".webp", ".gif");
                }
                this.showModal(this.createModal(guild.name, url, false));
            }
            else {
                Toasts.error("Server has no icon!");
            }
        }


        patchUserContextMenus() {
            const ContextMenus = WebpackModules.findAll(({ default: { displayName } }) => displayName && (displayName.endsWith('UserContextMenu')));
            for (const UserContextMenu of ContextMenus) {
                this.userMenuPatches.push(Patcher.after(UserContextMenu, "default", (_, [props], retVal) => {
                    var user = props.user;
                    const original = retVal.props.children.props.children[0].props.children[0];
                    if (this.settings.useNickname) {
                        const guildId = SelectedGuildStore.getGuildId();
                        const guild = GuildStore.getGuild(guildId);
                        if (guild) {
                            const guildMember = MemberStore.getMember(guildId, props.user.id);
                            if (guildMember.nick) user.nick = guildMember.nick;
                        }
                    }
                    const aivButton = DCM.buildMenuItem({label: "View Avatar", action: () => {
                        this.setupUserModal(user);
                    }});
                    if (Array.isArray(original)) original.splice(1, 0, aivButton);
                    else retVal.props.children.props.children[0].props.children[0] = [original, aivButton];
                }));
            }
        }
        
        setupUserModal(user) {
            var url = "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".webp?size=1024";
            if (url.includes("/a_")) {
                url = url.replace(".webp", ".gif");
            }
            if (this.settings.useNickname && user.nick) user.username = user.nick;
            this.showModal(this.createModal(user.username, url, true));
        }
      
        createModal(name, url, isUser) {
            const modal = DOMTools.createElement(Utilities.formatTString(Utilities.formatTString(this.modalHTML, isUser ? this.strings.userHeader : this.strings.guildHeader), {name: escapeHTML(name)}));
            modal.querySelector(".callout-backdrop").addEventListener("click", () => {
                modal.classList.add("closing");
                modal.addEventListener("animationend", () => { modal.remove(); }, 300);
            });

            const image = document.createElement("IMG");
            image.setAttribute("src", url);
            image.classList += "aiv-image";
            modal.getElementsByClassName("aiv-imgContainer")[0].appendChild(image);

            modal.getElementsByClassName("aiv-copyLink")[0].onclick = function() { 
                const { clipboard } = require("electron");
                clipboard.writeText(url);
                Toasts.success("Copied link to clipboard!");
                modal.classList += "closing";
                modal.addEventListener("animationend", () => { modal.remove(); }, 300);
            };

            modal.getElementsByClassName("aiv-copyImage")[0].onclick = function() { 
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
                    modal.classList += "closing";
                   modal.addEventListener("animationend", () => { modal.remove(); }, 300);
                });
            };

            
            modal.getElementsByClassName("aiv-openBrowser")[0].onclick = function() { 
                require('electron').shell.openExternal(url);
                modal.classList += "closing";
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

        async bindPopouts(promiseState) {
            const pViewer = this;
            const popoutMount = function() {
                const popout = DiscordModules.ReactDOM.findDOMNode(this);
                const user = this.props.guildMember;
                var button = document.createElement("button");
                button.innerText = "View avatar";
                button.classList.add("aiv-button");
                button.classList.add("aiv-buttonPopout");
                button.addEventListener("click", function() { pViewer.setupUserModal(UserStore.getUser(user.userId)) } );
                popout.appendChild(button);
                pViewer.popoutButtons.push(button)
            };
            
            const UserPopout = await ReactComponents.getComponentByName("UserPopout", DiscordSelectors.UserPopout.userPopout);
            if (promiseState.cancelled) return;
            this.cancelUserPopout = Patcher.after(UserPopout.component.prototype, "componentDidMount", (thisObject) => {
                const bound = popoutMount.bind(thisObject); bound();
            });
            const instance = ReactTools.getOwnerInstance(document.querySelector(DiscordSelectors.UserPopout.userPopout), {include: ["UserPopout"]});
            if (!instance) return;
            popoutMount.bind(instance)();

            const popoutInstance = ReactTools.getOwnerInstance(document.querySelector(DiscordSelectors.UserPopout.userPopout), {include: ["Popout"]});
            if (!popoutInstance || !popoutInstance.updateOffsets) return;
            popoutInstance.updateOffsets();

        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            panel.addListener((id, checked) => {
                if (id == "popoutMenus") {
                    if (this.settings[id][checked]) this.bindPopouts({state: {cancelled: false}, cancel() {this.state.cancelled = true;}});
                    else this.unbindPopouts();
                }
                if (id == "contextMenus") {
                    if (checked == "contextMenuGuilds") {
                        if (this.settings[id][checked]) this.bindGuildContextMenus();
                        else this.unbindGuildContextMenus();
                    }
                    if (checked == "contextMenuUsers") {
                        if (this.settings[id][checked]) this.bindUserContextMenus();
                        else this.unbindUserContextMenus();
                    }
                }
            });
            return panel.getElement();
        }

    };
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();