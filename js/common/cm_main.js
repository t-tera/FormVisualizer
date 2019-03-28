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
            const cssUrl = browser.extension.getURL("/content/src.css");
            const source = '<html><head><link rel="stylesheet" href="' + h(cssUrl) + '"></head><body style="">' + hilit + '</body></html>';
            const blob = new Blob([source], {type: "text/html"});
            const url = URL.createObjectURL(blob);

            browser.tabs.create({url}).then(() => {
                URL.revokeObjectURL(url);
                resolve();
            });
        });
    });
};

const sendCmdToTab = (command, opts) => {
    return new Promise((resolve, reject) => {
        browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, {command, opts}).then((response) => {resolve(response)});
        });
    });
};

const h = (s) => {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\x27/g, '&#39;');
};

const h2 = (s) => {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
};

const hilitHTML = (html) => {
    let pos = 0, mode = 0, lastOPTag = null;
    let prevPos = -1, prevMode = -1, prevLastOPTag = -1;
    let ret = '';

    const hlen = html.length;

    const spn = (s, cls) => {
        return "<span class=\"" + h(cls) + "\">" + h2(s) + "</span>";
    };

    const fixIdx = (n) => {
        return n === -1 ? hlen : n;
    };

    const tagRegex = new RegExp("^[^\\s/>]+");

    while (pos < hlen) {
        // Avoid getting stuck by infinite loop bugs
        if (prevPos === pos && prevMode === mode && prevLastOPTag === lastOPTag) {
            ret += "\n" + spn("!ERROR! pos=" + pos + ", mode=" + mode + ", lastOPTag=" + (lastOPTag ? 1 : 0), "err");
            break;
        }

        prevPos = pos;
        prevMode = mode;

        let st = html.substr(pos, 10);

        if (mode === 0) {
            let endPos = null, cl = null;

            if (lastOPTag === "script" || lastOPTag === "style") {
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

            ret += spn(html.substring(pos, endPos), "txt");
            pos = endPos;
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
                let endPos = fixIdx(html.indexOf(">", pos)) + 1;
                ret += spn(html.substring(pos, endPos), "unk");
                pos = endPos;
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

            mt = stl.match(/^([^=]+)=/);

            if (mt === null) {
                let endPos = fixIdx(html.indexOf(">", pos));
                ret += spn(html.substring(pos, endPos), "unk");
                pos = endPos + 1;
                mode = 0;
                continue;
            }

            ret += spn(mt[1], "atn");
            ret += "=";
            pos += mt[0].length;

            stl = stl.substring(mt[0].length);

            let attrEndPos = null;

            if (stl.length > 1 && stl.startsWith('"')
                && (attrEndPos = stl.indexOf('"', 1)) !== -1) {
                ret += spn(stl.substring(0, attrEndPos + 1), "atv");
                pos += attrEndPos + 1;
            }
            else {
                let endPos = fixIdx(html.indexOf(">", pos));
                ret += spn(html.substring(pos, endPos), "unk");
                pos = endPos + 1;
                mode = 0;
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
        ret += '<a class="hook"><span ln="' + lnum + '" class="srcl"></span></a>' + l + "\n";
    });
    return '<div class="src">' + ret + '</div>';
};
