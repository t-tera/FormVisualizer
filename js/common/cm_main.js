const tglVisualizeForm = () => {
    return new Promise((resolve, reject) => {
        sendCmdToTab("form-visualizer.get-visualize-stat").then((response) => {
            const opts = {newStat: !response.stat};
            sendCmdToTab("form-visualizer.tgl-visualize-form", opts).then(() => {
                resolve(opts.newStat);
            });
        });
    });
};

const clearCookies = () => {
    return new Promise((resolve, reject) => {
        const promises = [];
        promises.push(browser.browsingData.removeLocalStorage({}));
        promises.push(browser.browsingData.removeCookies({}));

        Promise.all(promises).then(() => {
            sendCmdToTab("form-visualizer.flash-tab");
            resolve();
        });
    });
};

const showSource = () => {
    return new Promise((resolve, reject) => {
        sendCmdToTab("form-visualizer.get-source").then((response) => {
            const title = response.title || response.url;
            const cssUrl = browser.extension.getURL("/content/src.css");
            const baseURI = response.baseURI.match(/^https?:/) ? response.baseURI : '';
            const hilit = wrapHilitHTML(response.source);
            const source = '<html><head>'
                + '<base href="' + h(baseURI) + '">'
                + '<link rel="stylesheet" href="' + h(cssUrl) + '">'
                + '<title>Src - ' + h(title) + '</title></head>'
                + '<body>' + hilit + '</body></html>';
            const blob = new Blob([source], {type: "text/html; charset=UTF-8"});
            const blobUrl = URL.createObjectURL(blob);

            browser.tabs.create({url: blobUrl, index: response.index + 1}).then(() => {
                URL.revokeObjectURL(blobUrl);
                resolve();
            });
        });
    });
};

const sendCmdToTab = (command, opts) => {
    return new Promise((resolve, reject) => {
        browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, {command, opts}).then((response) => {
                response = response || {};
                response.index = tabs[0].index;
                resolve(response);
            });
        });
    });
};

const h = (s) => {
    return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\x22/g, '&quot;')
        .replace(/\x27/g, '&#39;');
};

const h2 = (s) => {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
};

const h3 = (s) => {
    return s.replace(/&/g, '&amp;').replace(/\x22/g, '&quot;');
};

// The input can be an HTML or XML doc
const hilitHTML = (html) => {
    let pos = 0, mode = 0, lastOPTag = null;
    let prevPos = -1, prevMode = -1, prevLastOPTag = -1;
    let ret = '';

    const hlen = html.length;

    const spn = (s, cls, raw) => {
        return '<span class="' + h3(cls) + '">' + (raw ? s : h2(s)) + '</span>';
    };

    const fixIdx = (target, needle, ofst) => {
        let t = target.indexOf(needle, ofst);
        return t === -1 ? target.length : t;
    };

    // Lax regex
    const tagRegex = new RegExp("^[^\\s\\d/<>][^\\s/<>]*");

    let dummyElm = document.createElement("span");

    const unescapeHTML = (s) => {
        if (s.indexOf("&") === -1) {
            return s;
        }
        dummyElm.innerHTML = s.replace(/</g, '&lt;');
        return dummyElm.textContent;
    };

    while (pos < hlen) {
        // Avoid getting stuck by infinite loop bugs
        if (prevPos === pos && prevMode === mode && prevLastOPTag === lastOPTag) {
            console.error("!ERROR! pos=" + pos + ", mode=" + mode + ", lastOPTag=" + lastOPTag);
            ret += spn(html.charAt(pos), "unk");
            pos += 1;
            mode = 0;
            lastOPTag = null;
        }

        prevPos = pos;
        prevMode = mode;

        let st = html.substr(pos, 10);

        if (mode === 0) {
            let endPos = null, cl = null;

            if (["script", "style"].includes(lastOPTag)) {
                endPos = fixIdx(html, "</" + lastOPTag + ">", pos);
                lastOPTag = null;
            }
            else if (st.startsWith("<!") || st.startsWith("<?")) {
                mode = 10;
                continue;
            }
            else if (st.startsWith("<")) {
                mode = 20;
                continue;
            }
            else {
                endPos = fixIdx(html, "<", pos);
            }

            if (endPos > pos) {
                ret += spn(html.substring(pos, endPos), "txt");
                pos = endPos;
            }
            continue;
        }
        else if (mode === 10) {
            let endPos = null, ofst = 0;

            if (st.startsWith("<!--")) {
                endPos = fixIdx(html, "-->", pos) + 3;
            }
            else if (st.startsWith("<![CDATA[")) {
                endPos = fixIdx(html, "]]>", pos) + 3;
            }
            else if (st.startsWith("<!DOCTYPE")) {
                endPos = fixIdx(html, "]>", pos) + 2;
            }
            else if (st.startsWith("<?")) {
                endPos = fixIdx(html, "?>", pos) + 2;
            }
            else {
                endPos = fixIdx(html, ">", pos) + 1;
            }

            ret += spn(html.substring(pos, endPos), "sptag");
            mode = 0;
            pos = endPos;
            continue;
        }
        else if (mode === 20) {
            let ofst = st.startsWith("</") ? 2 : 1;
            let tag = html.substring(pos + ofst);
            let mt = tag.match(tagRegex);

            if (mt === null) {
                ret += spn(html.substr(pos, ofst), "unk");
                pos += ofst;
                mode = 0;
                continue;
            }

            tag = mt[0];
            ret += h2(html.substr(pos, ofst));
            ret += spn(tag, "elm");

            mode = 30;
            pos += ofst + tag.length;

            lastOPTag = ofst === 1 ? tag.toLowerCase() : null;
            continue;
        }
        else if (mode === 30) {
            let stl = html.substring(pos);
            let mt = stl.match(/^\s+/);

            if (mt) {
                let sp = mt[0];
                ret += sp;
                pos += sp.length;
                continue;
            }
            else if (stl.startsWith("/>")) {
                ret += "/>";
                pos += 2;
                mode = 0;
                lastOPTag = null;
                continue;
            }
            else if (stl.startsWith(">")) {
                ret += ">";
                pos += 1;
                mode = 0;
                continue;
            }

            mt = stl.match(/^[^=>\s]+/);

            if (mt === null) {
                let endPos = fixIdx(html, ">", pos);
                ret += spn(html.substring(pos, endPos + 1), "unk");
                pos = endPos + 1;
                mode = 0;
                continue;
            }

            let atn = mt[0].trim().toLowerCase();
            ret += spn(mt[0], "atn");
            pos += mt[0].length;

            stl = stl.substring(mt[0].length);
            mt = stl.match(/^\s*=\s*/);

            if (mt === null) {
                continue;
            }
            else {
                ret += mt[0];
                pos += mt[0].length;
            }

            stl = stl.substring(mt[0].length);
            let quot = stl.startsWith('"') ? '"' : (stl.startsWith("'") ? "'" : null);
            let atv = null;
            let isLink = false
                || (["src"].includes(atn)
                    && ["bgsound", "embed", "frame", "iframe", "img", "input", "script"].includes(lastOPTag))
                || (["href"].includes(atn)
                    && ["a", "area", "link", "base"].includes(lastOPTag))
                || (["data", "codebase"].includes(atn)
                    && ["object"].includes(lastOPTag))
                || (["code"].includes(atn)
                    && ["applet"].includes(lastOPTag))
                || (["action"].includes(atn)
                    && ["form"].includes(lastOPTag))
                || (["formaction"].includes(atn)
                    && ["input", "button"].includes(lastOPTag))
                || (["background"].includes(atn)
                    && ["body", "table", "tr", "th", "td"].includes(lastOPTag));

            if (quot) {
                let sEndPos = fixIdx(stl, quot, 1);
                atv = stl.substring(1, sEndPos);
                pos += sEndPos + 1;
            }
            else {
                mt = stl.match(/^[^\s>]*/);
                let sEndPos = mt[0].length;
                atv = stl.substring(0, sEndPos);
                pos += sEndPos;
            }

            let atvHtml = null;

            if (isLink) {
                let url = unescapeHTML(atv);
                if (!url.match(/^[^\/?#]+:/) || url.trim().match(/^https?:/)) {
                    atvHtml = quot
                        + '<a href="view-source:'
                        + atv.replace(/\x22/g, '&quot;').replace(/\n/g, '')
                        + '">'
                        + h2(atv) + '</a>'
                        + quot;
                }
            }

            if (atvHtml === null) {
                atvHtml = h2(quot + atv + quot);
            }
            ret += spn(atvHtml, "atv", true);
            continue;
        }
    }
    return ret;
};

const wrapHilitHTML = (html) => {
    const hilited = hilitHTML(html).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = hilited.split(/\n/);

    let ret = '';
    lines.forEach((l, idx) => {
        ret += '<a class="hook"><span ln="' + (idx + 1) + '" class="srcl"></span></a>' + l + "\n";
    });

    const margin = 1 + ("" + lines.length).length * 0.5;
    return '<div class="src" style="margin-left: ' + margin + 'em">' + ret + '</div>';
};
