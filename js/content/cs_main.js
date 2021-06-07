(() => {
    const NAME_PREFIX = '_formVisualizer';

    if (window[NAME_PREFIX]) {
        return;
    }

    window[NAME_PREFIX] = {};

    const flashTab = () => {
        if (window.top != window) return;

        const style = document.documentElement.style;
        const origOpacity = style.opacity;
        style.opacity = 0;
        setTimeout(() => {style.opacity = origOpacity}, 50);
        setTimeout(() => {style.opacity = 0}, 100);
        setTimeout(() => {style.opacity = origOpacity}, 150);
    };

    const enableDragMove = (grabElm, moveElm) => {
        var self = this;

        self.dragElm = null;
        self.moveElm = moveElm;

        self.onMouseDown = function(ev) {
            ev.cancelBubble = true;
            self.moveElm.myOffset = {x: moveElm.offsetLeft - ev.clientX, y: moveElm.offsetTop - ev.clientY};
            self.dragElm = this;
        }

        self.onMouseMoveDoc = function(ev) {
            if (self.dragElm == null) {
                return true;
            }

            if (ev.clientX < 0 || ev.clientX > window.innerWidth
                || ev.clientY < 0 || ev.clientY > window.innerHeight) {
                return false;
            }

            var elm = self.moveElm;
            elm.style.left = (ev.clientX + elm.myOffset.x) + 'px';
            elm.style.top  = (ev.clientY + elm.myOffset.y) + 'px';

            return false;
        };

        self.onMouseUpDoc = function(ev) {
            self.dragElm = null;
        };

        var doc = moveElm.ownerDocument;
        doc.addEventListener("mousemove", self.onMouseMoveDoc, false);
        doc.addEventListener("mouseup", self.onMouseUpDoc, false);
        grabElm.onmousedown = self.onMouseDown;
    };

    const FormVisualizer = () => {
        var self = FormVisualizer;

        self.tglVisualize = function(newStat) {
            self.setStatFlg(newStat);
            self.toggleVisualizer(newStat);
        };

        self.getCurrentStat = function() {
            return window[NAME_PREFIX].stat;
        };

        self.setStatFlg = function(newStat) {
            window[NAME_PREFIX].stat = newStat;
        };

        self.toggleVisualizer = function(s) {
            s ? self.visualizerDocOn() : self.visualizerDocOff();
        };

        self.nl2Arr = function(nd) {
            var arr = new Array();
            for (i = 0, ndlen = nd.length; i < ndlen; i++) {
                arr.push(nd.item(i));
            }
            return arr;
        };

        self.visualizerDocOn = function() {
            var iarr = new Array();
            iarr = iarr.concat(self.nl2Arr(self.getElms('input')));
            iarr = iarr.concat(self.nl2Arr(self.getElms('select')));
            iarr = iarr.concat(self.nl2Arr(self.getElms('option')));
            iarr = iarr.concat(self.nl2Arr(self.getElms('textarea')));
            iarr.forEach((n) => {self.visualizeNode(n)});

            var farr = new Array();
            farr = farr.concat(self.nl2Arr(self.getElms('form')));
            farr.forEach((n) => {self.visualizeNode(n)});

            var obarr = new Array();
            obarr = obarr.concat(self.nl2Arr(self.getElms('object')));
            obarr = obarr.concat(self.nl2Arr(self.getElms('applet')));
            obarr = obarr.concat(self.nl2Arr(self.getElms('embed')));
            obarr.forEach((n) => {self.visualizeNode(n)});

            var ifarr = new Array();
            ifarr = ifarr.concat(self.nl2Arr(self.getElms('iframe')));
            ifarr.forEach((n) => {self.visualizeNode(n)});

            self.visualizeNode(null, {type: "script"});

            self.borderSet(farr, '3px dotted #F00');
            self.borderSet(ifarr, '3px dotted #00F');
        };

        self.visualizerDocOff = function() {
            var d = document;
            var spans = d.getElementsByClassName('cls' + NAME_PREFIX);
            for (var i = spans.length - 1; i >= 0; i--) {
                var n = spans.item(i);
                if (n.tagName == 'SPAN' || n.tagName == 'DIV' || n.tagName == 'IFRAME') {
                    n.parentNode.removeChild(n);
                }
            }
            self.borderUnSet(self.getElms('form'));
            self.borderUnSet(self.getElms('iframe'));
        };

        self.getChildNodes = function(span) {
            var d = document;
            var n = span.relatedNode;
            var editArgs = JSON.parse(span.dataset.editArgs);

            return self.exist(editArgs.txt)
                ? [d.createTextNode(editArgs.txt)] : self.getElmLabelNodes(n);
        };

        self.getNDInfo = function(n, o) {
            var d = document;
            var tag = n ? self.getTagName(n) : null;

            if (["input", "select", "option", "textarea"].indexOf(tag) > -1) {
                return {node: n,
                        ndtype: 'input',
                        editArgs: {name: n.name, value: n.value, disabled: n.disabled},
                        color: tag == 'option' ? 'greenyellow' : 'yellow',
                        editable: tag != 'option' && self.exist(n.name),
                        pos: tag == 'option' ? 2 : 1};
            }
            else if (["form"].indexOf(tag) > -1) {
                return {node: n,
                        ndtype: 'form',
                        editArgs: {method: n.method, enctype: n.enctype, target: n.target, action: n.action},
                        color: '#f9c',
                        editable: true,
                        pos: 0};
            }
            else if (["object", "applet", "embed"].indexOf(tag) > -1) {
                return {node: n,
                        ndtype: 'url',
                        editArgs: {url: self.getObjUrl(n)},
                        color: 'lime',
                        editable: true,
                        pos: 1};
            }
            else if (["iframe"].indexOf(tag) > -1) {
                return {node: n,
                        ndtype: 'url',
                        editArgs: {url: n.src},
                        color: 'lightblue',
                        editable: true,
                        pos: 0};
            }
            else if (["a"].indexOf(tag) > -1) {
                return {node: n,
                        ndtype: 'url',
                        editArgs: {url: n.href, dummySpan: true},
                        color: 'transparent',
                        editable: false,
                        pos: 0};
            }
            else if (o) {
                if (o.type == "script") {
                    var ststr = self.getElms('script').length > 0 ? ' \x3CTAG\x3E ':'';
                    var hsrc = d.documentElement.innerHTML.toLowerCase();
                    if (hsrc.indexOf('javascript:') > -1 || hsrc.indexOf('vbscript:') > -1) {
                        ststr += ' \x3CSCHEME?\x3E ';
                    }
                    if (hsrc.match(/\son\w{4,}\s*=/)) {
                        ststr += ' \x3CEVENT?\x3E ';
                    }
                    if (ststr.length > 0) {
                        return {node: d.body.firstChild,
                                ndtype: 'script',
                                editArgs: {txt: ststr},
                                color: 'red',
                                pos: 0,
                                fixpos: 1};
                    }
                }
            }
            return null;
        };

        self.visualizeNode = function(n, o) {
            var d = document;
            var ndInfo = self.getNDInfo(n, o);

            if (!ndInfo) {
                return;
            }

            var n = ndInfo.node;
            var editArgs = ndInfo.editArgs;

            var span = d.createElement('span');

            span.ndtype = ndInfo.ndtype;
            span.id = 'spanId' + NAME_PREFIX + '_' + Math.round(Number.MAX_SAFE_INTEGER * Math.random());
            span.className = 'cls' + NAME_PREFIX;
            span.dataset.editArgs = JSON.stringify(editArgs);
            span.style.backgroundColor = ndInfo.color;
            span.style.border = '1px solid #000';
            span.style.color = 'black';
            span.style.fontStyle = 'normal';
            span.style.fontWeight = 'normal';
            span.style.fontSize = '9pt';
            span.style.fontFamily = 'sans-serif';
            span.style.margin = '0 4px 0 0';
            span.style.padding = '0 2px';
            span.style.textIndent = 0;
            span.style.lineHeight = "12pt";
            span.style.wordBreak = 'break-all';
            span.style.display = 'inline-block';
            span.style.whiteSpace = 'nowrap';

            if (n instanceof HTMLElement) {
                var tag = self.getTagName(n);
                if (tag == "option" && !n.hasAttribute("value")) {
                    n.setAttribute("value", n.textContent);
                }
                span.relatedNode = n;
            }

            if (ndInfo.editable == true) {
                span.style.cursor = 'pointer';

                var cf = function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    e.cancelBubble = true;
                    self.openEditWin(this);
                };
                span.addEventListener('click', cf, false);
            }

            if (editArgs.dummySpan == true) {
                span.style.display = 'none';
            }

            if (ndInfo.fixpos == undefined) {
                var np = n;
                var hidden = false;
                while (1) {
                    if (getComputedStyle(np, '').display == 'none') {
                        n = np;
                        hidden = true;
                    }
                    if (np.parentNode == null || np.parentNode == d) {
                        break;
                    }
                    np = np.parentNode;
                }
                if (hidden) {
                    span.style.opacity = 0.6;
                    span.style.borderStyle = 'dotted';
                }
            }

            // firstChild
            if (ndInfo.pos == 2) {
                if (n.firstChild) {
                    n.insertBefore(span, n.firstChild);
                }
                else {
                    n.appendChild(span);
                }
            }
            // insertAfter
            else if (ndInfo.pos == 1) {
                n.parentNode.insertBefore(span, n.nextSibling);
            }
            // insertBefore
            else {
                n.parentNode.insertBefore(span, n);
            }
            ndInfo.node[NAME_PREFIX + 'Label'] = span;

            var cnds = self.getChildNodes(span);
            self.setChildNodes(span, cnds);

            return span;
        };

        self.visualizeNodeBySpan = function(span) {
            var n = span.relatedNode;
            span.parentNode.removeChild(span);
            self.visualizeNode(n);
        };

        self.borderUnSet = function(nds) {
            for (var i = 0, ndlen = nds.length; i < ndlen; i++) {
                nds[i].style.border = nds[i].borderStyleBackup;
                nds[i].borderStyleBackup = undefined;
            }
        };

        self.borderSet = function(nds, borderstyle) {
            for (var i = 0, ndlen=nds.length; i < ndlen; i++) {
                nds[i].borderStyleBackup = nds[i].style.border;
                nds[i].style.border = borderstyle;
            }
        };

        self.getElms = function(t) {
            return document.getElementsByTagName(t);
        };

        self.getTagName = function(n) {
            try {
                if (n instanceof HTMLFormElement) {
                    return "form";
                }
                return n.tagName.toLowerCase();
            }
            catch (err) {
                console.error(err);
            }
            return null;
        };

        self.getFormAction = function(nd) {
            var u = typeof(nd.action) == "string" ? nd.action : nd.getAttribute('action');
            return self.getAbsUrl(u, nd.ownerDocument);
        };

        self.getAbsUrl = function(u, d) {
            if (u.indexOf('http:') == 0 || u.indexOf('https:') == 0) {
                return u;
            }
            var a = d.createElement('a');
            a.href = u;
            return a.href;
        };

        self.getMethod = function(n) {
            var mt = typeof(n.method) == "string" ? n.method : n.getAttribute('method');
            return self.exist(mt) && mt.length > 0 ? mt.toLowerCase() : 'get';
        };

        self.getFormAttr = function(n, attr) {
            var at = typeof(n[attr]) == "string" ? n[attr] : n.getAttribute(attr);
            return self.exist(at) && at.length > 0 ? at : '';
        };

        self.getObjUrl = function(n) {
            var tag = self.getTagName(n);
            if (tag == 'object') {
                return n.data;
            }
            else if (tag == 'applet') {
                var codebase = n.getAttribute('codebase');
                if (self.exist(codebase) && codebase.length > 0 && codebase.substr(-1) != '/') {
                    codebase += '/';
                }
                return (self.exist(codebase) ? codebase : '') + n.code;
            }
            else if (tag == 'embed') {
                return n.src;
            }
        };

        self.setObjUrl = function(n, url) {
            var tag = self.getTagName(n);
            if (tag == 'object') {
                n.data = url;
            }
            else if (tag == 'applet') {
                const mt = url.match(/^([\s\S]*)\/([^\/]*)$/);
                if (mt) {
                    n.codebase = mt[1];
                    n.code = mt[2];
                }
                else {
                    n.codebase = '';
                    n.code = url;
                }
            }
            else if (tag == 'embed') {
                n.src = url;
            }
        };

        self.getElmLabelNodes = function(n) {
            var d = document;
            var dl = '\u2503';
            var tag = self.getTagName(n);
            var name = tag == 'form' ? n.getAttribute('name') : n.name;

            if (tag == 'form') {
                return [d.createTextNode(tag + dl + self.getMethod(n) + dl + self.shorten(self.getFormAction(n)))];
            }
            if (tag == 'textarea' || tag == 'select') {
                var retnds = [];
                retnds.push(d.createTextNode(tag + dl));
                var bldnd = d.createElement('b');
                bldnd.textContent = self.shorten(name);
                retnds.push(bldnd);
                return retnds;
            }
            else if (tag == 'input') {
                var retnds = [];
                retnds.push(d.createTextNode(self.shortenInputType(n.type) + dl));
                var bldnd = d.createElement('b');
                bldnd.textContent = self.shorten(name);
                retnds.push(bldnd);
                retnds.push(d.createTextNode(dl + self.shorten(n.value)));
                return retnds;
            }
            else if (tag == 'option') {
                return [d.createTextNode(self.shorten(n.value) + ": ")];
            }
            else if (tag == 'iframe') {
                return [d.createTextNode(tag + dl + self.shorten(n.src))];
            }
            else if (tag == 'object' || tag == 'applet' || tag == 'embed') {
                var url = self.getAbsUrl(self.getObjUrl(n), n.ownerDocument);
                var type = (tag == 'applet' ? null : n.type);
                return [d.createTextNode(tag + dl + (self.exist(type) ? type + dl : '') + self.shorten(url))];
            }
            return [];
        };

        self.openEditWin = function(span) {
            var rnode = span.relatedNode;
            var tag = self.getTagName(rnode);

            if (tag == 'select' && rnode.selectedIndex == -1) {
                return;
            }

            browser.runtime.sendMessage({
                command: 'form-visualizer.bg-open-node-edit',
                spanId: span.id,
                editArgs: JSON.parse(span.dataset.editArgs),
                tagName: tag,
                typeAttrVal: rnode.type,
                ndtype: span.ndtype
            });
        };

        self.openEditWinByNode = function(n) {
            var span = self.visualizeNode(n);
            self.openEditWin(span);
        };

        self.removeAllChildren = function(n) {
            while (n.lastChild) {
                n.removeChild(n.lastChild);
            }
        };

        self.setChildNodes = function(par, nds) {
            self.removeAllChildren(par);
            for (var i = 0; i < nds.length; i++) {
                par.appendChild(nds[i]);
            }
        };

        self.exist = function(s) {
            return s != undefined && s != null;
        };

        self.shorten = function(s) {
            if (!self.exist(s)) {return '';}

            var maxlen = 60;
            var snipmark = '\u2026\u2026';
            return (s.length > maxlen + snipmark.length)
                ? s.substr(0, maxlen / 2 - 1) + snipmark + s.substr(-maxlen / 2 + 1) : s;
        };

        self.shortenInputType = function(type) {
            const map = {checkbox: "check"};
            return self.exist(map[type]) ? map[type] : type;
        };

        self.openNodeEditDialog = function(msg) {
            const ndtype = msg.ndtype;
            const editArgs = msg.editArgs;

            const ifrm = document.createElement('iframe');
            ifrm.id = "edit_box_form";
            ifrm.className = 'cls' + NAME_PREFIX;
            ifrm.style.position = "fixed";
            ifrm.style.top = 0;
            ifrm.style.bottom = 0;
            ifrm.style.right = 0;
            ifrm.style.left = 0;
            ifrm.style.zIndex = 2147483647;
            ifrm.style.background = "transparent";
            ifrm.style.borderStyle = "none";
            ifrm.style.overflow = "hidden";
            ifrm.style.width = "100%";
            ifrm.style.height = "100%";

            document.body.appendChild(ifrm);

            const hideTmpSel = () => {
                Array.prototype.forEach.call(ifrm.contentDocument.getElementsByClassName("tmpSel"), (elm) => {
                    elm.style.display = 'none';
                });
            };

            const setupTmpSel = (form, nm) => {
                const txtElm = form[nm];
                const selElm = form[nm + "_sel"];

                txtElm.onclick = (ev) => {
                    ev.cancelBubble = true;
                    const toDisp = selElm.style.display != 'inline-block';
                    hideTmpSel();
                    selElm.style.display = toDisp ? 'inline-block' : 'none';

                    if (toDisp) {
                        selElm.value = txtElm.value;
                    }
                };
                txtElm.onchange = (ev) => {hideTmpSel()};
                selElm.onclick = (ev) => {
                    ev.cancelBubble = true;
                    txtElm.value = selElm.value;
                    hideTmpSel();
                }
                selElm.onchange = selElm.onclick;
            };

            const editDone = (ev, canceled) => {
                ev.cancelBubble = true;
                ifrm.parentNode.removeChild(ifrm);
                msg.command = 'form-visualizer.bg-finish-node-edit';
                msg.canceled = canceled;
                browser.runtime.sendMessage(msg);
            };

            const formOnSubmit = (ev, form) => {
                if (ndtype == "input"
                    && msg.tagName == "input"
                    && (msg.typeAttrVal == "text" || msg.typeAttrVal == "password")
                    && form.i_value.value.indexOf("\n") >= 0) {

                    if (!confirm('The type attr will be set to "hidden" to preserve line breaks. Is this OK?')) {
                        return false;
                    }
                }

                if (ndtype == "form") {
                    editArgs.method = form.i_method.value;
                    editArgs.enctype = form.i_enctype.value;
                    editArgs.target = form.i_target.value;
                    editArgs.action = form.i_action.value;
                }
                else if (ndtype == "input") {
                    editArgs.disabled = form.i_disabled.checked;
                    editArgs.name = form.i_name.value;
                    editArgs.value = form.i_value.value;
                }
                else if (ndtype == "url") {
                    editArgs.url = form.i_url.value;
                }

                editDone(ev, false);
                return false;
            };

            const ifrmOnLoad = (ev) => {
                const ifrmdoc = ifrm.contentDocument;
                const editBox = ifrmdoc.getElementById("edit_box");
                const editBoxTitle = ifrmdoc.getElementById("edit_box_title");
                const form = ifrmdoc.getElementById("edit_box_form");
                const enterToSubmit = (ev) => {if (ev.keyCode == 13) form.onsubmit(ev)};
                const doCancel = (ev) => {editDone(ev, true)};

                ifrmdoc.body.onclick = form.i_cancelBtn.onclick = doCancel;
                ifrmdoc.body.onkeydown = (ev) => {if (ev.keyCode == 27) {doCancel(ev)}};
                form.onsubmit = (ev) => {return formOnSubmit(ev, form)};

                setupTmpSel(form, "i_enctype");
                setupTmpSel(form, "i_target");

                editBox.onclick = (ev) => {
                    ev.cancelBubble = true;
                    hideTmpSel(ifrm);
                };

                enableDragMove(editBoxTitle, editBox);

                const rowElms = form.getElementsByTagName("table").item(0)
                    .getElementsByTagName("tr");

                for (let i = rowElms.length - 1; i >= 0; i--) {
                    let rowElm = rowElms.item(i);
                    if (ndtype == "form" && !rowElm.classList.contains("row_form")
                        || ndtype == "input" && !rowElm.classList.contains("row_input")
                        || ndtype == "url" && !rowElm.classList.contains("row_url")) {
                        rowElm.parentNode.removeChild(rowElm);
                    }
                }

                if (ndtype == "form") {
                    editBoxTitle.textContent = "Edit form element";
                    form.i_method.value = editArgs.method ? editArgs.method.toLowerCase() : "get";
                    form.i_enctype.value = editArgs.enctype;
                    form.i_target.value = editArgs.target;
                    form.i_action.value = editArgs.action;
                    form.i_action.onkeydown = enterToSubmit;
                }
                else if (ndtype == "input") {
                    editBoxTitle.textContent = "Edit form control element";
                    form.i_disabled.checked = editArgs.disabled;
                    form.i_name.value = editArgs.name;
                    form.i_value.value = editArgs.value;
                    form.i_multiline.parentElement.style.display = 'inline';
                    form.i_multiline.checked = editArgs.value.indexOf("\n") > -1;
                    form.i_value.onkeydown = (ev) => {
                        if (!form.i_multiline.checked) {
                            enterToSubmit(ev);
                        }
                    };
                }
                else {
                    editBoxTitle.textContent = "Edit URL attribute";
                    form.i_url.value = editArgs.url;
                    form.i_url.onkeydown = enterToSubmit;
                }

                const autoFocus = form.getElementsByClassName("autofocus")[0];

                if (autoFocus) {
                    autoFocus.focus();
                    autoFocus.setSelectionRange(0, 0);
                }
            };

            ifrm.onload = (ev) => {
                try {
                    ifrmOnLoad(ev);
                }
                catch (err) {
                    console.error(err);
                }
            };

            ifrm.src = browser.extension.getURL("/content/edit_box.html");;
        };
        self.finishNodeEdit = function(msg) {
            var ndtype = msg.ndtype;
            var editArgs = msg.editArgs;
            var span = document.getElementById(msg.spanId);

            if (!span) {
                console.error("No span found: " + msg.spanId);
            }

            var rnode = span.relatedNode;
            var tag = self.getTagName(rnode);

            if (!msg.canceled) {
                const updSpans = editArgs.dummySpan ? [] : [span];

                if (ndtype == "form") {
                    rnode.setAttribute("method", editArgs.method);
                    rnode.setAttribute("enctype", editArgs.enctype);
                    rnode.setAttribute("target", editArgs.target);
                    rnode.setAttribute("action", editArgs.action);
                }
                else if (ndtype == "input") {
                    rnode.disabled = editArgs.disabled;
                    rnode.name = editArgs.name;

                    if (tag == "select") {
                        var option = rnode.options[rnode.selectedIndex];
                        option.setAttribute("value", editArgs.value);
                        updSpans.push(option.firstChild);
                    }
                    if (editArgs.value.indexOf("\n") >= 0
                        && (rnode.type == "text" || rnode.type == "password")) {
                        rnode.type = "hidden";
                    }
                    rnode.value = editArgs.value;
                }
                else if (ndtype == "url") {
                    var url = editArgs.url;
                    if (tag == "a") {
                        let av = rnode;
                        while (av && av.tagName != "A") {
                            av = av.parentElement;
                        }
                        if (av) {
                            av.href = url;
                        }
                    }
                    else if (tag == "iframe") {
                        rnode.src = url;
                    }
                    else {
                        self.setObjUrl(rnode, url);
                    }
                }

                updSpans.forEach((updSpan) => {
                    self.visualizeNodeBySpan(updSpan);
                });
            }

            if (editArgs.dummySpan) {
                span.parentNode.removeChild(span);
            }
        };
    };

    FormVisualizer();

    browser.runtime.onMessage.addListener((msg) => {
        const isSelfTop = window.top === window;

        if (msg.command === "form-visualizer.flash-tab") {
            flashTab();
        }
        else if (msg.command === "form-visualizer.get-visualize-stat") {
            if (isSelfTop) {
                return Promise.resolve({stat: FormVisualizer.getCurrentStat()});
            }
        }
        else if (msg.command === "form-visualizer.tgl-visualize-form") {
            FormVisualizer.tglVisualize(msg.opts.newStat);
        }
        else if (msg.command === "form-visualizer.open-node-edit") {
            if (isSelfTop) {
                FormVisualizer.openNodeEditDialog(msg);
            }
        }
        else if (msg.command === "form-visualizer.finish-node-edit") {
            FormVisualizer.finishNodeEdit(msg);
        }
        else if (msg.command === "form-visualizer.edit-link") {
            let n = browser.menus.getTargetElement(msg.opts.targetElementId);

            do {
                if (n.tagName === "A") {
                    FormVisualizer.openEditWinByNode(n);
                    return;
                }
            }
            while (n = n.parentElement);
        }
        else if (msg.command === "form-visualizer.get-source") {
            if (isSelfTop) {
                let ret = {
                    url: window.location.href,
                    title: document.title,
                    source: document.documentElement.outerHTML,
                    baseURI: document.baseURI,
                };
                return Promise.resolve(ret);
            }
        }
        else if (msg.command === "form-visualizer.show-response-status") {
            if (window !== window.top) return;
            var statuses = [];

            for (let details of msg.opts.detailsArr) {
                var status = details.statusCode;
                if (details.fromCache) {
                    status = `(${status})`;
                }
                statuses.push(status);
            }

            var show = () => {
                var animName = `fadeIn${NAME_PREFIX}`;
                var style = document.createElement("style");
                style.textContent = `@keyframes ${animName} {0% {background-color: steelblue}}`;
                document.head.appendChild(style);
                var span = document.createElement('span');
                span.textContent = `Status: ${statuses.join(' \u2192 ')}`;
                span.style.cssText = 'position: fixed; right: 0; top: 0; background-color: purple; color: white;'
                    + ` font-size: 10pt; padding: 0 3px; cursor: pointer; z-index: 2147483647; animation: ${animName} 7s ease;`;
                span.title = 'Dismiss';
                span.className = 'hogehoge';
                document.documentElement.appendChild(span);
                var remove = () => {document.documentElement.removeChild(span)};
                setTimeout(remove, 20000);
                span.addEventListener('click', remove, false);
            };

            if (document.readyState == 'loading') {
                document.addEventListener('DOMContentLoaded', show, false);
            }
            else {
                show();
            }
        }
        else if (msg.command === "form-visualizer.show-fetched-url") {
            if (window !== window.top) return;

            let cmsg = '', len = 25;

            for (let i = 0; i < msg.opts.detailsArr.length; i++) {
                let details = msg.opts.detailsArr[i];
                let status = details.statusCode;

                if (details.fromCache) {
                    continue;
                }

                let line = '';

                if (i === 0) {
                    line += `FV: ${details.type}`;
                }

                line += ' '.repeat(len - line.length);
                cmsg += (i > 0 ? '\n' : '') + line;

                let urlBase = details.url.split(/[#?]/)[0];
                let urlRest = details.url.substring(urlBase.length);
                let url = urlBase + (urlRest.length > 80 ? urlRest.substring(0, 80) + '\u2026' : urlRest);
                cmsg += `${status} ${url}`;
            }

            if (cmsg.length) {
                console.log(cmsg);
            }
        }
    });
})();
