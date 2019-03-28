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
        else if (id === "showSourceBtn") {
            prom = showSource;
        }

        if (prom) {
            prom().then(() => {window.close()});
        }
    });
})();
