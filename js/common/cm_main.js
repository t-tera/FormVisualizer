const tglVisualizeForm = () => {
    return new Promise((resolve, reject) => {
        sendCmdToTab("form-visualizer.tgl-visualize-form");
        resolve();
    });
};

const clearCookies = () => {
    return new Promise((resolve, reject) => {
        browser.cookies.getAll({storeId: "firefox-default", firstPartyDomain: null})
            .then((cookies) => {
                const promises = [];
                for (let cookie of cookies) {
                    const params = {
                        url: "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path,
                        name: cookie.name,
                        storeId: cookie.storeId,
                    };
                    promises.push(browser.cookies.remove(params));
                }
                Promise.all(promises).then(() => {
                    sendCmdToTab("form-visualizer.flash-tab");
                    resolve();
                });
            });
    });
};

const sendCmdToTab = (command, opts) => {
    browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
        return browser.tabs.sendMessage(tabs[0].id, {command, opts});
    });
};
