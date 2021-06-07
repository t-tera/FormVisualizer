const SHOW_URL_TYPES = [
    //"beacon",
    "csp_report",
    //font
    //image
    //imageset
    "main_frame",
    "object",
    "object_subrequest",
    "ping",
    //script
    //speculative
    //stylesheet
    "sub_frame",
    "web_manifest",
    "websocket",
    //xbl
    "xmlhttprequest",
    //xslt
    //other
];

window.bgGlobals = {respWorkBuf: {}, showResponseStatusConfig: true, showFetchedURLsConfig: true};

browser.webRequest.onHeadersReceived.addListener(
    (details) => {
        let key = `${details.tabId}_${details.requestId}`;
        (bgGlobals.respWorkBuf[key] ||= []).push(details);
    },
    {types: SHOW_URL_TYPES, urls: ["<all_urls>"]}
);

browser.webRequest.onCompleted.addListener(
    (details) => {
        let key = `${details.tabId}_${details.requestId}`;

        let showStatus = bgGlobals.showResponseStatusConfig;
        let showUrl = bgGlobals.showFetchedURLsConfig;

        if (showStatus && details.type === 'main_frame') {
            showStatusUrl(details.tabId, bgGlobals.respWorkBuf[key], 'response-status');
        }

        if (showUrl) {
            showStatusUrl(details.tabId, bgGlobals.respWorkBuf[key], 'fetched-url');
        }

        delete bgGlobals.respWorkBuf[key];
    },
    {types: SHOW_URL_TYPES, urls: ["<all_urls>"]}
);

browser.commands.onCommand.addListener((command) => {
    if (command == "form-visualizer.clear-cookies") {
        clearCookies();
    }
    if (command == "form-visualizer.tgl-visualize-form") {
        tglVisualizeForm();
    }
    if (command == "form-visualizer.show-source") {
        showSource();
    }
});

browser.menus.create({
    id: "form-visualizer.edit-link",
    title: "Edit link",
    contexts: ["link"]
});

browser.menus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "form-visualizer.edit-link") {
        sendCmdToTab(info.menuItemId, {"targetElementId": info.targetElementId});
    }
});

browser.runtime.onMessage.addListener((msg, sender) => {
    if (msg.command === "form-visualizer.bg-open-node-edit") {
        msg.command = "form-visualizer.open-node-edit";
        msg.origSender = sender;
        return browser.tabs.sendMessage(msg.origSender.tab.id, msg, {frameId: 0});
    }
    else if (msg.command === "form-visualizer.bg-finish-node-edit") {
        msg.command = "form-visualizer.finish-node-edit";
        return browser.tabs.sendMessage(msg.origSender.tab.id, msg, {frameId: msg.origSender.frameId});
    }
});
