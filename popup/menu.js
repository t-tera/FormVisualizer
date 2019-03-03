const listenForClicks = () => {
    document.addEventListener("click", (e) => {
        if (e.target.id === "formVisualizeBtn") {
            tglVisualizeForm().then(() => {window.close()});
        }
        else if (e.target.id === "clearCookiesBtn") {
            clearCookies().then(() => {window.close()});
        }
    });
}

listenForClicks();
