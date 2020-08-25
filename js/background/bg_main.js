window.bgGlobals = {respWorkBuf: {}, showResponseStatusConfig: true};

browser.webRequest.onHeadersReceived.addListener(
    (details) => {
        if (details.frameId !== 0) {
            return;
        }

        let key = `${details.tabId}_${details.requestId}`;
        (bgGlobals.respWorkBuf[key] = bgGlobals.respWorkBuf[key] || []).push(details);
    },
    {types: ["main_frame"], urls: ["<all_urls>"]}
);

browser.webRequest.onCompleted.addListener(
    (details) => {
        if (details.frameId !== 0) {
            return;
        }

        let key = `${details.tabId}_${details.requestId}`;

        if (bgGlobals.showResponseStatusConfig) {
            showResponseStatus(details.tabId, bgGlobals.respWorkBuf[key]);
        }

        delete bgGlobals.respWorkBuf[key];
    },
    {types: ["main_frame"], urls: ["<all_urls>"]}
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
