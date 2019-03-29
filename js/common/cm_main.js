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

const showSource = () => {
    return new Promise((resolve, reject) => {
        sendCmdToTab("form-visualizer.get-source").then((response) => {
            const hilit = wrapHilitHTML(response.source);
            const title = response.title || response.url;
            const cssUrl = browser.extension.getURL("/content/src.css");
            const source = '<html><head>'
                + '<link rel="stylesheet" href="' + h3(cssUrl) + '">'
                + '<title>Src - ' + h2(title) + '</title></head>'
                + '<body>' + hilit + '</body></html>';
            const blob = new Blob([source], {type: "text/html"});
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

// The input could be an XML doc
const hilitHTML = (html) => {
    let pos = 0, mode = 0, lastOPTag = null;
    let prevPos = -1, prevMode = -1, prevLastOPTag = -1;
    let ret = '';

    const hlen = html.length;

    const spn = (s, cls) => {
        return "<span class=\"" + h3(cls) + "\">" + h2(s) + "</span>";
    };

    const fixIdx = (n) => {
        return n === -1 ? hlen : n;
    };

    const tagRegex = new RegExp("^[^\\s\\d/<>][^\\s/<>]*");

    while (pos < hlen) {
        // Avoid getting stuck by infinite loop bugs
        if (prevPos === pos && prevMode === mode && prevLastOPTag === lastOPTag) {
            console.log("!ERROR! pos=" + pos + ", mode=" + mode + ", lastOPTag=" + lastOPTag);
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
                endPos = fixIdx(html.indexOf("</" + lastOPTag + ">", pos));
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
                endPos = fixIdx(html.indexOf("<", pos));
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
                endPos = html.indexOf("-->", pos);
                ofst = 3;
            }
            else if (st.startsWith("<?")) {
                endPos = html.indexOf("?>", pos);
                ofst = 2;
            }
            else {
                endPos = html.indexOf(">", pos);
                ofst = 1;
            }

            endPos = fixIdx(endPos) + ofst;
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
                let endPos = fixIdx(html.indexOf(">", pos));
                ret += spn(html.substring(pos, endPos + 1), "unk");
                pos = endPos + 1;
                mode = 0;
                continue;
            }

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

            if (quot) {
                let endPos = fixIdx(stl.indexOf(quot, 1));
                ret += spn(stl.substring(0, endPos + 1), "atv");
                pos += endPos + 1;
            }
            else {
                mt = stl.match(/^[^\s>]*/);
                let endPos = mt[0].length;
                ret += spn(stl.substring(0, endPos), "atv");
                pos += endPos;
            }
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
        let lnum = "" + (idx + 1);
        lnum = " ".repeat(7 - lnum.length) + lnum;
        ret += '<span class="hook"><span ln="' + lnum + '" class="srcl"></span></span>' + l + "\n";
    });
    return '<div class="src">' + ret + '</div>';
};
