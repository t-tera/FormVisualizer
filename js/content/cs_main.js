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

    const FormVisualizer = () => {
        var self = FormVisualizer;

        self.tglVisualize = function() {
            var newstat = !self.getCurrentStat();
            self.markStatFlg(newstat);
            self.toggleVisualizer(newstat);
        };
        self.getCurrentStat = function() {
            return self.exist(document.getElementById('stat' + NAME_PREFIX));
        };
        self.markStatFlg = function(newstat) {
            var d = document;
            if (newstat) {
                var statelm = d.createElement('span');
                statelm.id = 'stat' + NAME_PREFIX;
                statelm.style.display = 'none';
                d.body.appendChild(statelm);
            }
            else {
                var statelm = d.getElementById('stat' + NAME_PREFIX);
                statelm.parentNode.removeChild(statelm);
            }
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
                if (n.tagName == 'SPAN' || n.tagName == 'DIV') {
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
                        editArgs: {method: n.method, action: n.action, enctype: n.enctype, target: n.target},
                        color: 'hotpink',
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
            span.style.fontSize = '12px';
            span.style.fontFamily = 'sans-serif';
            span.style.marginRight = '4px';

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

            var cf2 = function(e) {
                e.cancelBubble = true;
                self.openEditWin(this.parentNode);
            };

            if (tag == 'form') {
                return [d.createTextNode(tag + dl + self.getMethod(n) + dl + self.shorten(self.getFormAction(n)))];
            }
            if (tag == 'textarea' || tag == 'select') {
                var retnds = [];
                retnds.push(d.createTextNode(tag + dl));
                var bldnd = d.createElement('b');
                bldnd.textContent = self.shorten(name);
                bldnd.addEventListener('click', cf2, false);
                retnds.push(bldnd);
                return retnds;
            }
            else if (tag == 'input') {
                var retnds = [];
                retnds.push(d.createTextNode(n.type + dl));
                var bldnd = d.createElement('b');
                bldnd.textContent = self.shorten(name);
                bldnd.addEventListener('click', cf2, false);
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

            var maxlen=60;
            var snipmark='...[snip]...';
            return s.length > maxlen + snipmark.length ? s.substr(0,maxlen / 2) + snipmark + s.substr(-maxlen / 2) : s;
        };
        self.openNodeEditDialog = function(msg) {
            const html = `
<!DOCTYPE html>
<html>
<head>
<style>
body {
    margin: 0;
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #FFF8;
    font-size: 10pt;
    font-family: arial, sans-serif;
}
form#edit_box_form {
    width: 100%;
}
p#edit_box_title {
    margin: 5px;
    font-weight: bold;
    font-size: 11pt;
}
div#edit_box {
    background: whitesmoke;
    border: 1px outset lightgray;
    width: 480px;
    padding: 5px;
    box-shadow: 5px 5px 10px 5px rgba(0,0,0,0.3);
}
td.label {
    width: 60px;
}
textarea.valField {
    word-break: break-all;
}
textarea.valField, input.valField {
    width: 400px;
}
.valField {
    font-family: Consolas, "Courier New", monospace;
    font-size: 9pt;
}
table#main {
    width: 100%;
    margin: 10px;
}
select.tmpSel {
    position: absolute;
    display: none;
}
div.wrapTmpSel {
    position: relative;
}
p#btnPara {
    text-align: center;
    margin: 5px;
}
.btnMargin {
    margin-left: 2rem;
}
input.btn {
    padding: 2px 20px;
}
</style>
</head>
<body>
<div id="edit_box">
<form id="edit_box_form">
<p id="edit_box_title"></p>
<table class="main">
    <!-- form -->
    <tr class="row_form">
    <td class="label">Method</td>
    <td>
    <label><input type="radio" name="i_method" value="get" checked>GET</label>
    <label><input type="radio" name="i_method" value="post">POST</label>
    </td>
    </tr>

    <tr class="row_form">
    <td class="label">Enctype</td>
    <td>
    <input type="text" name="i_enctype" class="valField"><br>
    <div class="wrapTmpSel">
    <select name="i_enctype_sel" size="4" class="tmpSel valField">
    <option value="">--</option>
    <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
    <option value="multipart/form-data">multipart/form-data</option>
    <option value="text/plain">text/plain</option>
    </select>
    </div>
    </td>
    </tr>

    <tr class="row_form">
    <td class="label">Target</td>
    <td>
    <input type="text" name="i_target" class="valField"><br>
    <div class="wrapTmpSel">
    <select name="i_target_sel" size="5" class="tmpSel valField">
    <option value="">--</option>
    <option value="_blank">_blank</option>
    <option value="_self">_self</option>
    <option value="_top">_top</option>
    <option value="_parent">_parent</option>
    </select>
    </div>
    </td>
    </tr>

    <tr class="row_form">
    <td class="label">Action</td>
    <td>
    <textarea name="i_action" rows="4" class="autofocus valField"></textarea>
    </td>
    </tr>

    <!-- input -->
    <tr class="row_input">
    <td class="label"><label for="i_disabled">Disabled</label></td>
    <td>
    <input type="checkbox" name="i_disabled" id="i_disabled">
    </td>
    </tr>

    <tr class="row_input">
    <td class="label">Name</td>
    <td>
    <input type="text" name="i_name" value="" class="valField">
    </td>
    </tr>

    <tr class="row_input">
    <td class="label">Value</td>
    <td>
    <textarea name="i_value" rows="4" class="autofocus valField"></textarea>
    </td>
    </tr>

    <!-- url -->
    <tr class="row_url">
    <td class="label">URL</td>
    <td>
    <textarea name="i_url" rows="5" class="autofocus valField"></textarea>
    </td>
    </tr>

    </table>

    <p id="btnPara">
    <input type="submit" value="OK" class="btn">
    <input type="button" value="Cancel" name="i_cancelBtn" class="btn btnMargin">
    <label style="display: none"><input type="checkbox" name="i_multiline" class="btnMargin">multiline</label>
    </p>
</form>
</div><!-- /#edit_box --></body></html>`;
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

            ifrm.onload = (ev) => {
                try {
                    const ifrmdoc = ifrm.contentDocument;
                    const editBox = ifrmdoc.getElementById("edit_box");
                    const editBoxTitle = ifrmdoc.getElementById("edit_box_title");
                    const form = ifrmdoc.getElementById("edit_box_form");
                    const enterToSubmit = (ev) => {if (ev.keyCode == 13) form.onsubmit(ev)};
                    const doCancel = (ev) => {editDone(ev, true)};

                    ifrmdoc.body.onclick = form.i_cancelBtn.onclick = doCancel;
                    form.onsubmit = (ev) => {return formOnSubmit(ev, form)};

                    setupTmpSel(form, "i_enctype");
                    setupTmpSel(form, "i_target");

                    editBox.onclick = (ev) => {
                        ev.cancelBubble = true;
                        hideTmpSel(ifrm);
                    };

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
                }
                catch (err) {
                    console.error(err);
                }
            };

            ifrm.srcdoc = html;
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
        if (msg.command === "form-visualizer.flash-tab") {
            flashTab();
        }
        else if (msg.command === "form-visualizer.tgl-visualize-form") {
            FormVisualizer.tglVisualize();
        }
        else if (msg.command === "form-visualizer.open-node-edit") {
            if (window.top === window) {
                FormVisualizer.openNodeEditDialog(msg);
            }
        }
        else if (msg.command === "form-visualizer.finish-node-edit") {
            FormVisualizer.finishNodeEdit(msg);
        }
        else if (msg.command === "form-visualizer.edit-link") {
            const n = browser.menus.getTargetElement(msg.opts.targetElmentId);
            const span = FormVisualizer.visualizeNode(n);
            FormVisualizer.openEditWin(span);
        }
    });
})();

