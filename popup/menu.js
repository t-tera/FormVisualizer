(() => {
    document.addEventListener("click", (e) => {
        const id = e.target.id;
        let prom = null;

        if (id === "formVisualizeBtn") {
            prom = tglVisualizeForm;
        }
        else if (id === "clearCookiesBtn") {
            prom = clearCookies;
        }
        else if (id === "clearCacheBtn") {
            prom = clearCache;
        }
        else if (id === "showSourceBtn") {
            prom = showSource;
        }

        if (prom) {
            prom().then(() => {window.close()});
        }
    });

    const showResponseStatusChk = document.getElementById("showResponseStatusChk");

    const restoreOptions = async () => {
        let bgWin  = await browser.runtime.getBackgroundPage();
        showResponseStatusChk.checked = bgWin.bgGlobals.showResponseStatusConfig;
    };

    document.addEventListener('DOMContentLoaded', restoreOptions);

    showResponseStatusChk.addEventListener("change", async (e) => {
        let bgWin  = await browser.runtime.getBackgroundPage();
        bgWin.bgGlobals.showResponseStatusConfig = e.currentTarget.checked;
    });
})();
