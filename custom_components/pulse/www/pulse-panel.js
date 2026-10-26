//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, g = h.trustedTypes, ee = g ? g.emptyScript : "", te = h.reactiveElementPolyfillSupport, _ = (e, t) => e, v = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ee : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, ne = (e, t) => !l(e, t), y = {
	attribute: !0,
	type: String,
	converter: v,
	reflect: !1,
	useDefault: !1,
	hasChanged: ne
};
Symbol.metadata ??= Symbol("metadata"), h.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var b = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = y) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? y;
	}
	static _$Ei() {
		if (this.hasOwnProperty(_("elementProperties"))) return;
		let e = m(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(_("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(_("properties"))) {
			let e = this.properties, t = [...f(e), ...p(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? v : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? v : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ne)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
b.elementStyles = [], b.shadowRootOptions = { mode: "open" }, b[_("elementProperties")] = /* @__PURE__ */ new Map(), b[_("finalized")] = /* @__PURE__ */ new Map(), te?.({ ReactiveElement: b }), (h.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var re = globalThis, ie = (e) => e, ae = re.trustedTypes, oe = ae ? ae.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, se = "$lit$", x = `lit$${Math.random().toFixed(9).slice(2)}$`, ce = "?" + x, le = `<${ce}>`, S = document, C = () => S.createComment(""), w = (e) => e === null || typeof e != "object" && typeof e != "function", ue = Array.isArray, de = (e) => ue(e) || typeof e?.[Symbol.iterator] == "function", fe = "[ 	\n\f\r]", pe = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, me = /-->/g, he = />/g, T = RegExp(`>|${fe}(?:([^\\s"'>=/]+)(${fe}*=${fe}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ge = /'/g, _e = /"/g, ve = /^(?:script|style|textarea|title)$/i, ye = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), E = ye(1), D = ye(2), O = Symbol.for("lit-noChange"), k = Symbol.for("lit-nothing"), be = /* @__PURE__ */ new WeakMap(), A = S.createTreeWalker(S, 129);
function xe(e, t) {
	if (!ue(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return oe === void 0 ? t : oe.createHTML(t);
}
var Se = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = pe;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === pe ? c[1] === "!--" ? o = me : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = T) : (ve.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = T) : o = he : o === T ? c[0] === ">" ? (o = i ?? pe, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? T : c[3] === "\"" ? _e : ge) : o === _e || o === ge ? o = T : o === me || o === he ? o = pe : (o = T, i = void 0);
		let d = o === T && e[t + 1].startsWith("/>") ? " " : "";
		a += o === pe ? n + le : l >= 0 ? (r.push(s), n.slice(0, l) + se + n.slice(l) + x + d) : n + x + (l === -2 ? t : d);
	}
	return [xe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Ce = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Se(t, n);
		if (this.el = e.createElement(l, r), A.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = A.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(se)) {
					let t = u[o++], n = i.getAttribute(e).split(x), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Ee : r[1] === "?" ? De : r[1] === "@" ? Oe : M
					}), i.removeAttribute(e);
				} else e.startsWith(x) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ve.test(i.tagName)) {
					let e = i.textContent.split(x), t = e.length - 1;
					if (t > 0) {
						i.textContent = ae ? ae.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], C()), A.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], C());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ce) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(x, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += x.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = S.createElement("template");
		return n.innerHTML = e, n;
	}
};
function j(e, t, n = e, r) {
	if (t === O) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = w(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = j(e, i._$AS(e, t.values), i, r)), t;
}
var we = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? S).importNode(t, !0);
		A.currentNode = r;
		let i = A.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Te(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new ke(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = A.nextNode(), a++);
		}
		return A.currentNode = S, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Te = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = k, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = j(this, e, t), w(e) ? e === k || e == null || e === "" ? (this._$AH !== k && this._$AR(), this._$AH = k) : e !== this._$AH && e !== O && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? de(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== k && w(this._$AH) ? this._$AA.nextSibling.data = e : this.T(S.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Ce.createElement(xe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new we(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = be.get(e.strings);
		return t === void 0 && be.set(e.strings, t = new Ce(e)), t;
	}
	k(t) {
		ue(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(C()), this.O(C()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ie(e).nextSibling;
			ie(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, M = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = k, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = k;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = j(this, e, t, 0), a = !w(e) || e !== this._$AH && e !== O, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = j(this, r[n + o], t, o), s === O && (s = this._$AH[o]), a ||= !w(s) || s !== this._$AH[o], s === k ? e = k : e !== k && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === k ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Ee = class extends M {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === k ? void 0 : e;
	}
}, De = class extends M {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== k);
	}
}, Oe = class extends M {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = j(this, e, t, 0) ?? k) === O) return;
		let n = this._$AH, r = e === k && n !== k || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== k && (n === k || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, ke = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		j(this, e);
	}
}, Ae = {
	M: se,
	P: x,
	A: ce,
	C: 1,
	L: Se,
	R: we,
	D: de,
	V: j,
	I: Te,
	H: M,
	N: De,
	U: Oe,
	B: Ee,
	F: ke
}, je = re.litHtmlPolyfillSupport;
je?.(Ce, Te), (re.litHtmlVersions ??= []).push("3.3.3");
var Me = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Te(t.insertBefore(C(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Ne = globalThis, N = class extends b {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Me(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return O;
	}
};
N._$litElement$ = !0, N.finalized = !0, Ne.litElementHydrateSupport?.({ LitElement: N });
var Pe = Ne.litElementPolyfillSupport;
Pe?.({ LitElement: N }), (Ne.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/ha.ts
function Fe(e, t) {
	return e?.kioskMode !== !0 && (t || e?.dockedSidebar === "always_hidden");
}
function P(e, t, n) {
	let r = n ? {
		message: t,
		action: n,
		duration: 5e3
	} : { message: t };
	e.dispatchEvent(new CustomEvent("hass-notification", {
		detail: r,
		bubbles: !0,
		composed: !0
	}));
}
function F(e, t = !1) {
	t ? history.replaceState(null, "", e) : history.pushState(null, "", e), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: t } }));
}
function I(e, t) {
	customElements.get(e) || customElements.define(e, t);
}
function Ie(e) {
	return e instanceof Error ? e.message : typeof e == "object" && e && "message" in e ? String(e.message) : String(e);
}
function Le(e) {
	let t = e.target;
	return t instanceof HTMLSelectElement || t instanceof HTMLInputElement ? t.value : "";
}
function Re(e) {
	let t = Reflect.get(Object(Reflect.get(e, "detail")), "item"), n = Reflect.get(Object(t), "value");
	return typeof n == "string" ? n : null;
}
var ze = "pointer", Be = !1;
function Ve() {
	Be || (Be = !0, window.addEventListener("pointerdown", () => ze = "pointer", !0), window.addEventListener("keydown", () => ze = "keyboard", !0));
}
function He() {
	let e = document.activeElement;
	for (; e?.shadowRoot?.activeElement;) e = e.shadowRoot.activeElement;
	return e;
}
function Ue() {
	ze === "pointer" && window.setTimeout(() => {
		let e = He();
		e instanceof HTMLElement && e.blur();
		let t = document.activeElement;
		t instanceof HTMLElement && t.tagName !== "BODY" && t.blur();
	}, 0);
}
//#endregion
//#region src/strings-de.ts
var We = {
	title: "Pulse",
	subtitle: "Merkt, wenn ein Batteriesensor still wird – hört nur zu und kostet keine Batterie.",
	tab_overview: "Übersicht",
	tab_devices: "Geräte",
	tab_notify: "Mitteilungen",
	close: "Schließen",
	more: "Mehr",
	loading: "Pulse lädt …",
	not_loaded: "Pulse ist noch nicht eingerichtet. Füge die Integration unter Einstellungen → Geräte & Dienste hinzu.",
	status_ok: "Im Takt",
	status_learning: "Lernt",
	status_watch: "Im Blick",
	status_check: "Prüfen",
	status_failed: "Ausgefallen",
	ignored: "Nicht überwacht",
	batteries: "Batterien",
	nothing_due: "Nichts fällig",
	last_change: "Zuletzt gewechselt",
	zigbee: "Zigbee2MQTT",
	zigbee_devices: "Zigbee-Geräte",
	zigbee_sent: "An Zigbee2MQTT geschickt",
	recipients: "Empfänger",
	quiet: "Ruhezeit",
	off: "Aus",
	replaced: "Batterie gewechselt",
	replaced_done: "Wechsel eingetragen",
	later: "Morgen erinnern",
	later_done: "Pulse erinnert dich morgen",
	snoozed_until: "Erinnert {when}",
	details: "Details",
	ignore: "Nicht überwacht",
	label_set: "Festgelegt über das Home-Assistant-Label „{label}“.",
	ignore_hint: "Pulse lässt dieses Gerät in Ruhe.",
	ignored_done: "{name} wird nicht mehr überwacht",
	resume: "Wieder überwachen",
	undo: "Rückgängig",
	search: "{count} Geräte durchsuchen",
	search_one: "1 Gerät durchsuchen",
	group_by: "Gruppieren nach {what}",
	group_area: "Bereich",
	group_status: "Status",
	group_none: "Nicht gruppiert",
	col_last: "Zuletzt gemeldet",
	no_area: "Ohne Bereich",
	no_results: "Kein Gerät passt zu „{query}“.",
	battery: "Batterie",
	voltage: "Spannung",
	battery_type: "Typ",
	battery_count: "Anzahl",
	chemistry: "Art",
	chem_nimh: "Akku (NiMH)",
	chem_alkaline: "Alkaline",
	chem_lithium: "Lithium",
	chem_unknown: "Unbekannt",
	type_unknown: "Nicht festgelegt",
	replaced_history: "Batteriewechsel",
	never_replaced: "Noch kein Wechsel eingetragen",
	monitoring: "Überwachung",
	important: "Wichtiges Gerät",
	important_hint: "Strengere Grenzen, ‚Prüfen‘ kommt sofort, Ausfälle auf Wunsch als kritische Mitteilung.",
	partner: "Partnergerät",
	partner_hint: "Lösen meist zusammen aus, z. B. Schloss und Türkontakt. Bleibt eins still, merkt Pulse es früher.",
	partner_none: "Keine",
	open_device: "Geräteseite öffnen",
	just_now: "gerade eben",
	minutes_ago: "vor {n} Min.",
	hours_ago: "vor {n} Std.",
	days_ago: "vor {n} Tagen",
	day_ago: "gestern",
	every_minutes: "alle {n} Min.",
	every_hours: "alle {n} Std.",
	every_days: "alle {n} Tage",
	unknown: "—",
	today: "heute",
	recipients_none: "Kein Handy mit der Home-Assistant-App gefunden.",
	when: "Wann benachrichtigen",
	level_failed: "Ausgefallen",
	level_check: "Prüfen",
	level_battery: "Batterie bald leer",
	level_now: "Sofort",
	level_daily: "Täglich",
	level_off: "Aus",
	times: "Zeiten",
	summary_time: "Tägliche Zusammenfassung",
	quiet_from: "Von",
	quiet_to: "Bis",
	quiet_hint: "Mitteilungen in der Ruhezeit kommen danach. Kritische kommen immer durch.",
	special: "Besonderes",
	critical: "Kritische Mitteilungen",
	critical_hint: "Lecksensoren, Rauchmelder, Schlösser – durchbrechen Lautlos und Fokus",
	arrive: "Erst beim Heimkommen",
	recovered: "Wenn ein Gerät wieder läuft",
	try_it: "Ausprobieren",
	test: "Testmitteilung senden",
	test_done: "Testmitteilung an {count} Handy(s) geschickt",
	test_none: "Kein Empfänger ausgewählt",
	summary_now: "Zusammenfassung jetzt senden",
	summary_sent: "Zusammenfassung geschickt",
	summary_empty: "Gerade gibt es nichts zusammenzufassen",
	show_welcome: "Willkommen zeigen",
	open_integration: "Integration öffnen",
	whats_new_title: "Neu in Pulse {version}",
	welcome_rhythm_title: "Kennt jeden Takt",
	welcome_rhythm_text: "Wie oft sich jedes Gerät meldet, hat Pulse schon aus den letzten 10 Tagen gelernt.",
	welcome_listen_title: "Hört nur zu",
	welcome_listen_text: "Pulse fragt nie ein Gerät ab. Das kostet keine Batterie und keinen Funkverkehr.",
	welcome_notify_title: "Sagt rechtzeitig Bescheid",
	welcome_notify_text: "Wichtiges sofort, alles andere einmal am Tag – mit Ruhezeit.",
	welcome_zigbee_title: "Zigbee-Lebenszeichen",
	welcome_zigbee_text: "Zigbee2MQTT hängt dann an jede Nachricht einen Zeitstempel.",
	continue: "Weiter",
	version: "Version {version}",
	today_cap: "Heute",
	yesterday_cap: "Gestern",
	zigbee_hint: "Zeitstempel an jeder Nachricht – ohne Mehrverbrauch.",
	zigbee_active: "Aktiv",
	zigbee_requested: "Angefragt",
	zigbee_confirm_title: "Zigbee-Lebenszeichen einschalten?",
	zigbee_confirm_text: "Pulse schaltet in Zigbee2MQTT „last_seen“ und „availability“ ein. Damit erkennt Pulse auch Meldungen ohne neuen Wert und merkt Funkabbrüche schneller.",
	zigbee_confirm_side: "Still gewordene Zigbee-Geräte erscheinen in Home Assistant dann als nicht verfügbar. Batteriegeräte senden dadurch nichts zusätzlich. Zurückstellen kannst du das jederzeit in Zigbee2MQTT unter Einstellungen.",
	zigbee_confirm_go: "Einschalten",
	cancel: "Abbrechen",
	level_unreliable: "Akku – Prozent sagt wenig, Pulse achtet auf den Takt",
	replaced_undone: "Wechsel zurückgenommen",
	filter_clear: "Filter entfernen",
	filter_label: "Nur: {what}",
	whats_new_all: "Alle Neuerungen",
	replaced_now: "Batteriewechsel eintragen",
	battery_none_low: "Keine schwach",
	battery_low_one: "1 schwach",
	battery_low_many: "{count} schwach",
	hero_all: "Alle {count} Geräte",
	hero_some: "{ok} von {total} Geräten",
	hero_some_short: "{ok} von {total}",
	hero_beat: "schlagen im Takt.",
	hero_beat_short: "im Takt.",
	hero_one: "Dein einziges Gerät",
	hero_beat_one: "schlägt im Takt.",
	hero_beat_off: "ist still.",
	hero_learn1: "Pulse",
	hero_learn2: "lernt noch.",
	hero_none1: "Noch keine",
	hero_none2: "Batteriegeräte.",
	sent_silent_for: "{name} ist seit {span} still.",
	sent_silent_since: "{name} ist seit {day} still.",
	sent_battery: "{name} braucht bald eine neue Batterie.",
	sent_battery_low: "{name} braucht eine neue Batterie.",
	sent_unavailable: "{name} ist nicht erreichbar.",
	sent_partner: "{name} schweigt, obwohl {partner} aktiv ist.",
	sent_other: "{name}: {reason}",
	sent_more: "Und {count} weitere.",
	sent_all_good: "Alle melden sich wie gewohnt.",
	sent_learning: "Pulse lernt gerade, wie oft sich jedes Gerät meldet.",
	span_minutes: "{n} Minuten",
	span_hours: "{n} Stunden",
	span_hour: "1 Stunde",
	span_days: "{n} Tagen",
	span_day: "1 Tag",
	yesterday: "gestern",
	flag_silent: "Seit {span} still",
	group_need: "Braucht dich",
	group_watch: "Im Blick",
	group_rhythm: "Im Takt",
	group_learning: "Lernt noch",
	monitor_head: "{count} Geräte · 7 Tage",
	monitor_head_one: "1 Gerät · 7 Tage",
	day_title: "Dein Tag mit Pulse",
	day_to: "An {names}",
	day_nobody: "Noch kein Empfänger",
	status_battery: "Batterie {level} %",
	new_battery: "Neue Batterie",
	dh_silent: "Still seit {span}.",
	dh_unavailable: "Nicht erreichbar.",
	dh_partner: "Schweigt, Partner aktiv.",
	dh_battery: "Batterie bei {level} %.",
	dh_learning: "Lernt noch.",
	dh_ok: "Im Takt.",
	dh_ignored: "Nicht überwacht.",
	dh_watch: "Ungewohnt still.",
	detail_every: "Meldet sich sonst {every}. Zuletzt {when}.",
	heartbeat_title: "Herzschlag · 7 Tage",
	heartbeat_legend: "Strich = Meldung · höher = mehrere",
	with_partner: "Mit Partnergerät",
	partner_quiet: "{partner} meldet sich weiter – nur {name} schweigt.",
	partner_both: "Beide melden sich wie gewohnt.",
	stat_changed: "Gewechselt",
	welcome_head1: "Pulse",
	welcome_head2: "hört zu.",
	welcome_lead: "Jedes Batteriegerät hat einen Takt. Pulse kennt ihn – und merkt, wenn er aussetzt.",
	ignored_count: "{count} nicht überwacht",
	show_list: "Liste zeigen",
	device_settings: "Einstellungen",
	no_data_legend: "Keine Daten – Pulse lief nicht",
	stat_rechargeable: "Akku · ungenau",
	set_head: "Pulse meldet sich um {time}.",
	set_quiet: "Ruhe {start}–{end}.",
	set_no_quiet: "Ohne Ruhezeit.",
	set_failed: "Ausgefallene Geräte",
	set_check: "„Prüfen“",
	set_battery: "Batterien",
	set_group: "{names} {level}",
	set_level_now: "sofort",
	set_level_daily: "in der Zusammenfassung",
	set_level_off: "nie",
	unit_volt: "{value} V",
	unit_millivolt: "{value} mV",
	unit_percent: "{value} %",
	battery_flag_low: "Schwach",
	battery_flag_ok: "OK",
	battery_count_type: "{count} × {type}",
	hour_label: "{h}:00",
	filter_empty: "Kein Gerät in diesem Filter.",
	heartbeat_aria: "{count} Meldungen in {days} Tagen",
	replaced_undo_failed: "Wechsel ließ sich nicht zurücknehmen",
	more_for: "Mehr zu {name}",
	z2m_base: "Zigbee2MQTT-Thema",
	z2m_base_hint: "Basisthema in MQTT, Standard ist zigbee2mqtt. Nur ändern, wenn dein Zigbee2MQTT ein anderes nutzt.",
	z2m_base_invalid: "Ungültiges Thema: nicht leer, ohne # und +, ohne Schrägstrich am Anfang oder Ende.",
	on: "An",
	advanced: "Basis-Thema",
	snooze_cancel: "Erinnerung aufheben",
	snooze_cancelled: "Erinnerung aufgehoben",
	read_only: "Ändern können nur Admins.",
	levels_hint: "Ausgefallen: viel länger still als sonst oder nicht erreichbar. Prüfen: auffällig still oder Batterie unter 10 %. „Im Blick“ bleibt im Panel.",
	recipients_hint: "Neue Handys kommen automatisch dazu, bis du hier etwas änderst.",
	recovered_hint: "Auch erkannte Batteriewechsel.",
	arrive_hint: "Mitteilungen warten, bis jemand der Gewählten zu Hause ist. Gilt für alle Empfänger.",
	persons_none: "Keine Person in Home Assistant gefunden.",
	learning_hint: "Lernt noch: braucht etwa 7 Meldungen, um den Takt zu kennen. Geräte, die nur bei Aktionen melden, brauchen länger.",
	learning_one: "Ein Gerät lernt Pulse noch kennen.",
	learning_many: "{count} Geräte lernt Pulse noch kennen.",
	pill_learning: "Lernt noch",
	pill_waiting: "Wartet",
	status_waiting: "Wartet",
	dh_waiting: "Wartet auf die erste Meldung.",
	sent_waiting: "{name} wartet auf die erste Meldung nach dem Batteriewechsel.",
	day_line_summary: "{time} Zusammenfassung",
	day_line_quiet: "Ruhe {start} bis {end}",
	day_line_no_quiet: "Ohne Ruhezeit",
	hero_need1: "{count} Geräte",
	hero_need1_one: "Ein Gerät",
	hero_need: "brauchen dich.",
	hero_need_one: "braucht dich.",
	hero_sub: "{ok} von {total} im Takt.",
	sent_strays_since: "{name} meldet sich seit {day} kaum noch, zuletzt {last}.",
	sent_strays_for: "{name} meldet sich seit {span} kaum noch, zuletzt {last}.",
	sent_startup: "{name} hat sich seit dem Neustart noch nicht gemeldet.",
	sent_radio_only: "{name} funkt, schickt aber keine Werte.",
	sent_battery_missing: "{name} meldet keinen Batteriestand mehr.",
	flag_strays: "Seit {span} kaum noch",
	status_cloud: "Cloud still",
	dh_strays: "Seit {span} kaum noch.",
	dh_cloud: "Cloud antwortet nicht.",
	dh_startup: "Seit dem Neustart noch keine Meldung.",
	dh_radio_only: "Funkt ohne Werte.",
	dh_battery_missing: "Batteriestand fehlt.",
	forecast_too_short: "Für eine Vorhersage noch zu kurz beobachtet",
	forecast_flat: "Prozent ändert sich kaum – noch keine Vorhersage",
	forecast_coarse: "Meldet nur grobe Stufen – keine Vorhersage",
	forecast_untrusted: "Akku-Prozent sagt zu wenig – keine Vorhersage",
	forecast_noisy: "Werte schwanken zu stark – keine Vorhersage",
	forecast_days: "Hält nur noch wenige Tage",
	forecast_weeks: "Hält noch ca. {lo}–{hi} Wochen",
	forecast_months: "Hält noch ca. {lo}–{hi} Monate",
	forecast_years: "Hält noch ca. {lo}–{hi} Jahre",
	due_line: "In den nächsten 8 Wochen fällig: {items}",
	battery_due_many: "{count} bald fällig",
	battery_due_one: "1 bald fällig",
	cloud_outage_one: "{name}-Cloud antwortet nicht – 1 Gerät betroffen",
	cloud_outage_many: "{name}-Cloud antwortet nicht – {count} Geräte betroffen",
	cloud_device: "Cloud-Gerät",
	important_badge: "Wichtig",
	mark_important: "Als wichtig markieren",
	unmark_important: "Nicht mehr wichtig",
	important_devices: "Wichtige Geräte",
	filter_important: "Wichtig",
	filter_battery: "Batterie",
	ignore_action: "Nicht mehr überwachen",
	no_devices: "Noch keine Batteriegeräte gefunden.",
	connection_lost: "Verbindung unterbrochen – Pulse zeigt den letzten Stand und verbindet sich neu.",
	heartbeat_failed: "Der Herzschlag ließ sich nicht laden.",
	reload: "Neu laden",
	search_label: "Geräte durchsuchen",
	health_title: "Funk-Zähler",
	health_hint: "Erkennt Geräte, die funken, aber keine Werte mehr schicken.",
	health_confirm_title: "Funk-Zähler einschalten?",
	health_confirm_text: "Pulse schaltet in Zigbee2MQTT die Health-Prüfung ein. Zigbee2MQTT zählt dann mit, wie oft jedes Gerät funkt – so erkennt Pulse Geräte, die zwar noch funken, aber keine Werte mehr schicken.",
	health_confirm_side: "Batteriegeräte senden dadurch nichts zusätzlich. Zurückstellen kannst du das jederzeit in Zigbee2MQTT unter Einstellungen.",
	partner_suggest: "Vorschlag: {name}",
	partner_suggest_why: "oft gemeinsam aktiv",
	partner_accept: "Übernehmen",
	partner_dismiss: "Verwerfen",
	new_forecast_title: "Batterie-Vorhersage",
	new_forecast_text: "Im Gerät steht, wie lange die Batterie ungefähr noch hält. Die Übersicht zeigt, welche Batterien in den nächsten Wochen fällig sind.",
	new_hero_title: "Probleme zuerst",
	new_hero_text: "Braucht ein Gerät dich, steht das jetzt groß oben. Wichtige Geräte tragen einen Stern.",
	new_radio_title: "Funkt ohne Werte",
	new_radio_text: "Mit dem Funk-Zähler von Zigbee2MQTT merkt Pulse, wenn ein Gerät noch funkt, aber nichts mehr misst.",
	new_cloud_title: "Ruhig bei Cloud-Ausfällen",
	new_cloud_text: "Antwortet eine Cloud nicht, gibt es einen Sammelhinweis statt vieler Alarme. Dazu schlägt Pulse passende Partnergeräte vor.",
	new_calver_title: "Neue Versionsnummern",
	new_calver_text: "Ab jetzt lesen sich Versionen als Jahr.Monat.Release: 26.10.4 ist das vierte Release im Oktober 2026. Der Sprung von 1.1.0 ist gewollt – Updates werden wie gewohnt erkannt.",
	due_untyped: "Typ offen: {names}",
	beta: "Beta",
	mains_beta: "Netzgeräte überwachen",
	mains_beta_hint: "Auch Geräte am Strom: Lampen, Steckdosen, Rollläden, Thermostate … aus jeder Integration. Pulse meldet, wenn eines nicht mehr erreichbar ist oder trotz sonst regelmäßiger Meldungen still wird. Geräte, die oft von selbst weg sind (Standby, ausgeschaltet), lernt es und bleibt dann ruhig. Noch in Erprobung.",
	mains_devices: "Netzgeräte",
	filter_mains: "Netzgeräte",
	mains_chip: "Netzstrom · Beta",
	mains_note: "Hängt am Strom, keine Batterie. Pulse achtet darauf, ob es erreichbar ist und, wenn es sich regelmäßig meldet, ob es still wird.",
	texts: "Texte",
	texts_hint: "Eigene Titel und Texte für Mitteilungen zu einem Gerät. Zusammenfassungen bleiben, wie sie sind.",
	tpl_failed: "Ausgefallen",
	tpl_check: "Prüfen",
	tpl_battery: "Batterie",
	tpl_recovered: "Läuft wieder",
	tpl_default: "Standard",
	tpl_custom: "Eigener Text",
	tpl_title_field: "Titel",
	tpl_message_field: "Text",
	tpl_vars: "Platzhalter",
	tpl_vars_hint: "Tippen fügt ein. {area} bleibt leer, wenn der Raum schon im Namen steht; leere Werte verschwinden samt „ · “.",
	tpl_preview: "Vorschau",
	tpl_reset: "Standard verwenden",
	tpl_save: "Sichern",
	new_mains_title: "Netzgeräte sind jetzt dabei",
	new_mains_text: "Pulse achtet jetzt auch auf Lampen, Steckdosen und Schalter am Strom, aus jeder Integration. Geräte, die oft aus sind, lernt es kennen. Abschalten unter Mitteilungen → Beta.",
	new_texts_title: "Deine eigenen Worte",
	new_texts_text: "Titel und Text jeder Mitteilung lassen sich anpassen, mit Platzhaltern und Vorschau.",
	new_labels_title: "Labels statt Klicks",
	new_labels_text: "Das HA-Label pulse_important oder pulse_ignore an einem Gerät reicht. Mitteilungen nennen jetzt den Raum.",
	new_languages_title: "Fünf Sprachen",
	new_languages_text: "Pulse spricht Deutsch, Englisch, Französisch, Spanisch und Niederländisch."
}, Ge = {
	title: "Pulse",
	subtitle: "Notices when a battery sensor goes quiet – it only listens and costs no battery.",
	tab_overview: "Overview",
	tab_devices: "Devices",
	tab_notify: "Notifications",
	close: "Close",
	more: "More",
	loading: "Loading Pulse …",
	not_loaded: "Pulse is not set up yet. Add the integration under Settings → Devices & services.",
	status_ok: "In rhythm",
	status_learning: "Learning",
	status_watch: "Watching",
	status_check: "Check",
	status_failed: "Failed",
	ignored: "Not monitored",
	batteries: "Batteries",
	nothing_due: "Nothing due",
	last_change: "Last change",
	zigbee: "Zigbee2MQTT",
	zigbee_hint: "Timestamp on every message – no extra battery use.",
	zigbee_devices: "Zigbee devices",
	zigbee_sent: "Sent to Zigbee2MQTT",
	recipients: "Recipients",
	quiet: "Quiet hours",
	off: "Off",
	replaced: "Battery replaced",
	replaced_done: "Change recorded",
	later: "Remind tomorrow",
	later_done: "Pulse will remind you tomorrow",
	snoozed_until: "Reminds {when}",
	details: "Details",
	ignore: "Not monitored",
	label_set: "Set by the Home Assistant label “{label}”.",
	ignore_hint: "Pulse leaves this device alone.",
	ignored_done: "{name} is no longer monitored",
	resume: "Monitor again",
	undo: "Undo",
	search: "Search {count} devices",
	search_one: "Search 1 device",
	group_by: "Group by {what}",
	group_area: "area",
	group_status: "status",
	group_none: "No grouping",
	col_last: "Last report",
	no_area: "No area",
	no_results: "No device matches “{query}”.",
	battery: "Battery",
	voltage: "Voltage",
	battery_type: "Type",
	battery_count: "Count",
	chemistry: "Kind",
	chem_nimh: "Rechargeable (NiMH)",
	chem_alkaline: "Alkaline",
	chem_lithium: "Lithium",
	chem_unknown: "Unknown",
	type_unknown: "Not set",
	replaced_history: "Battery changes",
	never_replaced: "No change recorded yet",
	monitoring: "Monitoring",
	important: "Important device",
	important_hint: "Stricter limits, “Check” arrives right away, failures as critical alerts if you like.",
	partner: "Partner device",
	partner_hint: "Usually trigger together, e.g. lock and door contact. If one goes quiet, Pulse notices sooner.",
	partner_none: "None",
	open_device: "Open device page",
	just_now: "just now",
	minutes_ago: "{n} min ago",
	hours_ago: "{n} h ago",
	days_ago: "{n} days ago",
	day_ago: "yesterday",
	every_minutes: "every {n} min",
	every_hours: "every {n} h",
	every_days: "every {n} days",
	unknown: "—",
	today: "today",
	recipients_none: "No phone with the Home Assistant app found.",
	when: "When to notify",
	level_failed: "Failed",
	level_check: "Check",
	level_battery: "Battery running low",
	level_now: "Right away",
	level_daily: "Daily",
	level_off: "Off",
	times: "Times",
	summary_time: "Daily summary",
	quiet_from: "From",
	quiet_to: "Until",
	quiet_hint: "Notifications in quiet hours are delivered afterwards. Critical ones always come through.",
	special: "Special cases",
	critical: "Critical alerts",
	critical_hint: "Leak sensors, smoke detectors, locks – break through silent mode and focus",
	arrive: "Only when someone is home",
	recovered: "When a device is back",
	try_it: "Try it",
	test: "Send test notification",
	test_done: "Test sent to {count} phone(s)",
	test_none: "No recipient selected",
	summary_now: "Send summary now",
	summary_sent: "Summary sent",
	summary_empty: "Nothing to summarize right now",
	show_welcome: "Show welcome",
	open_integration: "Integration settings",
	whats_new_title: "New in Pulse {version}",
	welcome_rhythm_title: "Knows every rhythm",
	welcome_rhythm_text: "Pulse has already learned from the last 10 days how often each device reports.",
	welcome_listen_title: "Only listens",
	welcome_listen_text: "It never queries a device. That costs no battery and no radio traffic.",
	welcome_notify_title: "Tells you in time",
	welcome_notify_text: "Important things right away, everything else once a day – with quiet hours.",
	welcome_zigbee_title: "Zigbee signs of life",
	welcome_zigbee_text: "Let Zigbee2MQTT add a timestamp to every message.",
	continue: "Continue",
	version: "Version {version}",
	today_cap: "Today",
	yesterday_cap: "Yesterday",
	zigbee_active: "Active",
	zigbee_requested: "Requested",
	zigbee_confirm_title: "Turn on Zigbee signs of life?",
	zigbee_confirm_text: "Pulse turns on “last_seen” and “availability” in Zigbee2MQTT. Pulse then also notices reports without a new value and spots radio dropouts sooner.",
	zigbee_confirm_side: "Zigbee devices that have gone quiet then show up as unavailable in Home Assistant. Battery devices don’t send anything extra. You can change this back any time in the Zigbee2MQTT settings.",
	zigbee_confirm_go: "Turn on",
	cancel: "Cancel",
	level_unreliable: "Rechargeable – percentage says little, Pulse watches the rhythm",
	replaced_undone: "Change removed",
	filter_clear: "Remove filter",
	filter_label: "Only: {what}",
	whats_new_all: "All changes",
	replaced_now: "Record battery change",
	battery_none_low: "None low",
	battery_low_one: "1 low",
	battery_low_many: "{count} low",
	hero_all: "All {count} devices",
	hero_some: "{ok} of {total} devices",
	hero_some_short: "{ok} of {total}",
	hero_beat: "are in rhythm.",
	hero_beat_short: "in rhythm.",
	hero_one: "Your only device",
	hero_beat_one: "is in rhythm.",
	hero_beat_off: "is silent.",
	hero_learn1: "Pulse",
	hero_learn2: "is learning.",
	hero_none1: "No battery",
	hero_none2: "devices yet.",
	sent_silent_for: "{name} has been silent for {span}.",
	sent_silent_since: "{name} has been silent since {day}.",
	sent_battery: "{name} needs a new battery soon.",
	sent_battery_low: "{name} needs a new battery.",
	sent_unavailable: "{name} is unreachable.",
	sent_partner: "{name} is silent while {partner} is active.",
	sent_other: "{name}: {reason}",
	sent_more: "And {count} more.",
	sent_all_good: "Every device checks in as usual.",
	sent_learning: "Pulse is learning how often each device checks in.",
	span_minutes: "{n} minutes",
	span_hours: "{n} hours",
	span_hour: "1 hour",
	span_days: "{n} days",
	span_day: "1 day",
	yesterday: "yesterday",
	flag_silent: "Silent for {span}",
	group_need: "Needs you",
	group_watch: "Watching",
	group_rhythm: "In rhythm",
	group_learning: "Learning",
	monitor_head: "{count} devices · 7 days",
	monitor_head_one: "1 device · 7 days",
	day_title: "Your day with Pulse",
	day_to: "To {names}",
	day_nobody: "No recipient yet",
	status_battery: "Battery {level}%",
	new_battery: "New battery",
	dh_silent: "Silent for {span}.",
	dh_unavailable: "Unreachable.",
	dh_partner: "Silent, partner active.",
	dh_battery: "Battery at {level}%.",
	dh_learning: "Still learning.",
	dh_ok: "In rhythm.",
	dh_ignored: "Not monitored.",
	dh_watch: "Unusually quiet.",
	detail_every: "Usually checks in {every}. Last report {when}.",
	heartbeat_title: "Heartbeat · 7 days",
	heartbeat_legend: "Tick = report · taller = several",
	with_partner: "With partner device",
	partner_quiet: "{partner} keeps checking in – only {name} is silent.",
	partner_both: "Both check in as usual.",
	stat_changed: "Replaced",
	welcome_head1: "Pulse",
	welcome_head2: "listens.",
	welcome_lead: "Every battery device has a rhythm. Pulse knows it – and notices when it skips.",
	ignored_count: "{count} not monitored",
	show_list: "Show list",
	device_settings: "Settings",
	no_data_legend: "No data – Pulse wasn’t running",
	stat_rechargeable: "Rechargeable · rough",
	set_head: "Pulse checks in at {time}.",
	set_quiet: "Quiet {start}–{end}.",
	set_no_quiet: "No quiet hours.",
	set_failed: "failed devices",
	set_check: "“Check”",
	set_battery: "batteries",
	set_group: "{names} {level}",
	set_level_now: "right away",
	set_level_daily: "in the summary",
	set_level_off: "never",
	unit_volt: "{value} V",
	unit_millivolt: "{value} mV",
	unit_percent: "{value}%",
	battery_flag_low: "Low",
	battery_flag_ok: "OK",
	battery_count_type: "{count} × {type}",
	hour_label: "{h}:00",
	filter_empty: "No device in this filter.",
	heartbeat_aria: "{count} reports in {days} days",
	replaced_undo_failed: "Could not undo the change",
	more_for: "More for {name}",
	z2m_base: "Zigbee2MQTT topic",
	z2m_base_hint: "MQTT base topic, default is zigbee2mqtt. Only change it if your Zigbee2MQTT uses a different one.",
	z2m_base_invalid: "Invalid topic: not empty, no # or +, no slash at the start or end.",
	on: "On",
	advanced: "Base topic",
	snooze_cancel: "Cancel reminder",
	snooze_cancelled: "Reminder cancelled",
	read_only: "Only admins can make changes.",
	levels_hint: "Failed: silent much longer than usual or unreachable. Check: unusually quiet or battery below 10%. “Watching” stays in the panel.",
	recipients_hint: "New phones are added automatically until you change something here.",
	recovered_hint: "Also detected battery changes.",
	arrive_hint: "Notifications wait until one of the selected people is home. Applies to all recipients.",
	persons_none: "No person found in Home Assistant.",
	learning_hint: "Still learning: needs about 7 reports to know the rhythm. A device that only reports on actions takes longer.",
	learning_one: "Pulse is still getting to know 1 device.",
	learning_many: "Pulse is still getting to know {count} devices.",
	pill_learning: "Learning",
	pill_waiting: "Waiting",
	status_waiting: "Waiting",
	dh_waiting: "Waiting for the first report.",
	sent_waiting: "{name} is waiting for its first report after the battery change.",
	day_line_summary: "Summary {time}",
	day_line_quiet: "Quiet {start} to {end}",
	day_line_no_quiet: "No quiet hours",
	hero_need1: "{count} devices",
	hero_need1_one: "One device",
	hero_need: "need you.",
	hero_need_one: "needs you.",
	hero_sub: "{ok} of {total} in rhythm.",
	sent_strays_since: "{name} has barely checked in since {day}, last {last}.",
	sent_strays_for: "{name} has barely checked in for {span}, last {last}.",
	sent_startup: "{name} hasn’t checked in since the restart.",
	sent_radio_only: "{name} is on the air but sends no values.",
	sent_battery_missing: "{name} no longer reports its battery.",
	flag_strays: "Barely any for {span}",
	status_cloud: "Cloud silent",
	dh_strays: "Barely any for {span}.",
	dh_cloud: "Cloud not responding.",
	dh_startup: "No report since the restart.",
	dh_radio_only: "On the air, no values.",
	dh_battery_missing: "Battery level missing.",
	forecast_too_short: "Not observed long enough for a forecast",
	forecast_flat: "Percentage barely changes – no forecast yet",
	forecast_coarse: "Reports only coarse steps – no forecast",
	forecast_untrusted: "Rechargeable percentage says too little – no forecast",
	forecast_noisy: "Values fluctuate too much – no forecast",
	forecast_days: "Only a few days left",
	forecast_weeks: "Lasts about {lo}–{hi} more weeks",
	forecast_months: "Lasts about {lo}–{hi} more months",
	forecast_years: "Lasts about {lo}–{hi} more years",
	due_line: "Due in the next 8 weeks: {items}",
	battery_due_many: "{count} due soon",
	battery_due_one: "1 due soon",
	cloud_outage_one: "{name} cloud not responding – 1 device affected",
	cloud_outage_many: "{name} cloud not responding – {count} devices affected",
	cloud_device: "Cloud device",
	important_badge: "Important",
	mark_important: "Mark as important",
	unmark_important: "No longer important",
	important_devices: "Important devices",
	filter_important: "Important",
	filter_battery: "Battery",
	ignore_action: "Stop monitoring",
	no_devices: "No battery devices found yet.",
	connection_lost: "Connection lost – Pulse shows the last state and is reconnecting.",
	heartbeat_failed: "The heartbeat could not be loaded.",
	reload: "Reload",
	search_label: "Search devices",
	health_title: "Radio counter",
	health_hint: "Spots devices that are on the air but no longer send values.",
	health_confirm_title: "Turn on the radio counter?",
	health_confirm_text: "Pulse turns on the health check in Zigbee2MQTT. Zigbee2MQTT then counts how often each device transmits – so Pulse can spot devices that are still on the air but no longer send values.",
	health_confirm_side: "Battery devices don’t send anything extra. You can turn it off any time in Zigbee2MQTT under Settings.",
	partner_suggest: "Suggestion: {name}",
	partner_suggest_why: "often active together",
	partner_accept: "Use",
	partner_dismiss: "Dismiss",
	new_forecast_title: "Battery forecast",
	new_forecast_text: "Each device shows roughly how long its battery will last. The overview lists which batteries are due in the coming weeks.",
	new_hero_title: "Problems first",
	new_hero_text: "When a device needs you, the headline says so. Important devices carry a star.",
	new_radio_title: "On the air, no values",
	new_radio_text: "With the Zigbee2MQTT radio counter, Pulse notices when a device still transmits but no longer measures anything.",
	new_cloud_title: "Calm during cloud outages",
	new_cloud_text: "If a cloud stops responding, you get one summary instead of many alerts. Pulse also suggests matching partner devices.",
	new_calver_title: "New version numbers",
	new_calver_text: "From now on versions read year.month.release: 26.10.4 is the fourth release in October 2026. The jump from 1.1.0 is intended – updates are found as usual.",
	due_untyped: "type unknown: {names}",
	beta: "Beta",
	mains_beta: "Watch mains-powered devices",
	mains_beta_hint: "Also devices on the mains: lamps, plugs, covers, thermostats … from any integration. Pulse tells you when one is no longer reachable or goes silent although it usually reports regularly. Devices that are often gone by themselves (standby, switched off) are learned and stay quiet. Still being tested.",
	mains_devices: "Mains-powered devices",
	filter_mains: "Mains-powered",
	mains_chip: "Mains · Beta",
	mains_note: "Powered from the mains, no battery. Pulse watches whether it is reachable and, if it reports regularly, whether it goes silent.",
	texts: "Texts",
	texts_hint: "Your own titles and texts for notifications about one device. Summaries stay as they are.",
	tpl_failed: "Failed",
	tpl_check: "Check",
	tpl_battery: "Battery",
	tpl_recovered: "Back again",
	tpl_default: "Default",
	tpl_custom: "Custom",
	tpl_title_field: "Title",
	tpl_message_field: "Text",
	tpl_vars: "Placeholders",
	tpl_vars_hint: "Tap to insert. {area} stays empty when the room is already in the name; empty values vanish with their “ · ”.",
	tpl_preview: "Preview",
	tpl_reset: "Use default",
	tpl_save: "Save",
	new_mains_title: "Mains-powered devices are now on",
	new_mains_text: "Pulse now also watches lamps, plugs and switches on the mains, from any integration. Devices that are often off are learned. Turn it off under Notifications → Beta.",
	new_texts_title: "Your own words",
	new_texts_text: "Change the title and text of every notification, with placeholders and a preview.",
	new_labels_title: "Labels instead of clicks",
	new_labels_text: "The HA label pulse_important or pulse_ignore on a device is enough. Notifications now name the room.",
	new_languages_title: "Five languages",
	new_languages_text: "Pulse speaks English, German, French, Spanish and Dutch."
}, Ke = {
	de: We,
	fr: {
		title: "Pulse",
		subtitle: "Remarque quand un capteur sur pile se tait – il ne fait qu’écouter et ne coûte aucune pile.",
		tab_overview: "Vue d’ensemble",
		tab_devices: "Appareils",
		tab_notify: "Notifications",
		close: "Fermer",
		more: "Plus",
		loading: "Chargement de Pulse …",
		not_loaded: "Pulse n’est pas encore configuré. Ajoutez l’intégration sous Paramètres → Appareils et services.",
		status_ok: "En rythme",
		status_learning: "Apprend",
		status_watch: "À surveiller",
		status_check: "À vérifier",
		status_failed: "En panne",
		ignored: "Non surveillé",
		batteries: "Piles",
		nothing_due: "Rien à changer",
		last_change: "Dernier changement",
		zigbee: "Zigbee2MQTT",
		zigbee_hint: "Horodatage sur chaque message – sans consommation supplémentaire.",
		zigbee_devices: "Appareils Zigbee",
		zigbee_sent: "Envoyé à Zigbee2MQTT",
		recipients: "Destinataires",
		quiet: "Heures calmes",
		off: "Désactivé",
		replaced: "Pile remplacée",
		replaced_done: "Changement enregistré",
		later: "Rappeler demain",
		later_done: "Pulse vous le rappellera demain",
		snoozed_until: "Rappel {when}",
		details: "Détails",
		ignore: "Non surveillé",
		label_set: "Défini par l’étiquette Home Assistant « {label} ».",
		ignore_hint: "Pulse laisse cet appareil tranquille.",
		ignored_done: "{name} n’est plus surveillé",
		resume: "Surveiller à nouveau",
		undo: "Annuler",
		search: "Rechercher parmi {count} appareils",
		search_one: "Rechercher parmi 1 appareil",
		group_by: "Grouper par {what}",
		group_area: "pièce",
		group_status: "état",
		group_none: "Sans regroupement",
		col_last: "Dernier signal",
		no_area: "Sans pièce",
		no_results: "Aucun appareil ne correspond à « {query} ».",
		battery: "Pile",
		voltage: "Tension",
		battery_type: "Type",
		battery_count: "Nombre",
		chemistry: "Sorte",
		chem_nimh: "Accu (NiMH)",
		chem_alkaline: "Alcaline",
		chem_lithium: "Lithium",
		chem_unknown: "Inconnue",
		type_unknown: "Non défini",
		replaced_history: "Changements de pile",
		never_replaced: "Aucun changement enregistré",
		monitoring: "Surveillance",
		important: "Appareil important",
		important_hint: "Limites plus strictes, « À vérifier » arrive aussitôt, pannes en alerte critique si vous le souhaitez.",
		partner: "Appareil partenaire",
		partner_hint: "Se déclenchent souvent ensemble, p. ex. serrure et contact de porte. Si l’un se tait, Pulse le remarque plus tôt.",
		partner_none: "Aucun",
		open_device: "Ouvrir la page de l’appareil",
		just_now: "à l’instant",
		minutes_ago: "il y a {n} min",
		hours_ago: "il y a {n} h",
		days_ago: "il y a {n} jours",
		day_ago: "hier",
		every_minutes: "toutes les {n} min",
		every_hours: "toutes les {n} h",
		every_days: "tous les {n} jours",
		unknown: "—",
		today: "aujourd’hui",
		recipients_none: "Aucun téléphone avec l’app Home Assistant trouvé.",
		when: "Quand notifier",
		level_failed: "En panne",
		level_check: "À vérifier",
		level_battery: "Pile bientôt vide",
		level_now: "Immédiatement",
		level_daily: "Chaque jour",
		level_off: "Désactivé",
		times: "Horaires",
		summary_time: "Résumé quotidien",
		quiet_from: "De",
		quiet_to: "À",
		quiet_hint: "Les notifications pendant les heures calmes arrivent ensuite. Les critiques passent toujours.",
		special: "Cas particuliers",
		critical: "Alertes critiques",
		critical_hint: "Détecteurs de fuite, détecteurs de fumée, serrures – passent outre le mode silencieux et la concentration",
		arrive: "Seulement si quelqu’un est à la maison",
		recovered: "Quand un appareil est de retour",
		try_it: "Essayer",
		test: "Envoyer une notification de test",
		test_done: "Test envoyé à {count} téléphone(s)",
		test_none: "Aucun destinataire sélectionné",
		summary_now: "Envoyer le résumé maintenant",
		summary_sent: "Résumé envoyé",
		summary_empty: "Rien à résumer pour le moment",
		show_welcome: "Afficher l’accueil",
		open_integration: "Paramètres de l’intégration",
		whats_new_title: "Nouveautés de Pulse {version}",
		welcome_rhythm_title: "Connaît chaque rythme",
		welcome_rhythm_text: "Pulse a déjà appris des 10 derniers jours à quelle fréquence chaque appareil se signale.",
		welcome_listen_title: "Ne fait qu’écouter",
		welcome_listen_text: "Pulse n’interroge jamais un appareil. Cela ne coûte ni pile ni trafic radio.",
		welcome_notify_title: "Vous prévient à temps",
		welcome_notify_text: "L’important tout de suite, le reste une fois par jour – avec des heures calmes.",
		welcome_zigbee_title: "Signes de vie Zigbee",
		welcome_zigbee_text: "Zigbee2MQTT ajoute alors un horodatage à chaque message.",
		continue: "Continuer",
		version: "Version {version}",
		today_cap: "Aujourd’hui",
		yesterday_cap: "Hier",
		zigbee_active: "Actif",
		zigbee_requested: "Demandé",
		zigbee_confirm_title: "Activer les signes de vie Zigbee ?",
		zigbee_confirm_text: "Pulse active « last_seen » et « availability » dans Zigbee2MQTT. Pulse remarque alors aussi les signaux sans nouvelle valeur et détecte plus vite les coupures radio.",
		zigbee_confirm_side: "Les appareils Zigbee devenus silencieux apparaissent alors comme indisponibles dans Home Assistant. Les appareils sur pile n’envoient rien de plus. Vous pouvez revenir en arrière à tout moment dans les paramètres de Zigbee2MQTT.",
		zigbee_confirm_go: "Activer",
		cancel: "Annuler",
		level_unreliable: "Accu – le pourcentage dit peu, Pulse suit le rythme",
		replaced_undone: "Changement supprimé",
		filter_clear: "Retirer le filtre",
		filter_label: "Seulement : {what}",
		whats_new_all: "Toutes les nouveautés",
		replaced_now: "Enregistrer un changement de pile",
		battery_none_low: "Aucune faible",
		battery_low_one: "1 faible",
		battery_low_many: "{count} faibles",
		hero_all: "Les {count} appareils",
		hero_some: "{ok} appareils sur {total}",
		hero_some_short: "{ok} sur {total}",
		hero_beat: "sont en rythme.",
		hero_beat_short: "en rythme.",
		hero_one: "Votre seul appareil",
		hero_beat_one: "est en rythme.",
		hero_beat_off: "est silencieux.",
		hero_learn1: "Pulse",
		hero_learn2: "apprend encore.",
		hero_none1: "Aucun appareil",
		hero_none2: "sur pile pour l’instant.",
		sent_silent_for: "{name} est silencieux depuis {span}.",
		sent_silent_since: "{name} est silencieux depuis {day}.",
		sent_battery: "{name} aura bientôt besoin d’une pile neuve.",
		sent_battery_low: "{name} a besoin d’une pile neuve.",
		sent_unavailable: "{name} est injoignable.",
		sent_partner: "{name} est silencieux alors que {partner} est actif.",
		sent_other: "{name} : {reason}",
		sent_more: "Et {count} de plus.",
		sent_all_good: "Tous les appareils se signalent comme d’habitude.",
		sent_learning: "Pulse apprend à quelle fréquence chaque appareil se signale.",
		span_minutes: "{n} minutes",
		span_hours: "{n} heures",
		span_hour: "1 heure",
		span_days: "{n} jours",
		span_day: "1 jour",
		yesterday: "hier",
		flag_silent: "Silencieux depuis {span}",
		group_need: "À traiter",
		group_watch: "À surveiller",
		group_rhythm: "En rythme",
		group_learning: "Apprend",
		monitor_head: "{count} appareils · 7 jours",
		monitor_head_one: "1 appareil · 7 jours",
		day_title: "Votre journée avec Pulse",
		day_to: "À {names}",
		day_nobody: "Aucun destinataire pour l’instant",
		status_battery: "Pile {level} %",
		new_battery: "Pile neuve",
		dh_silent: "Silencieux depuis {span}.",
		dh_unavailable: "Injoignable.",
		dh_partner: "Silencieux, partenaire actif.",
		dh_battery: "Pile à {level} %.",
		dh_learning: "Apprend encore.",
		dh_ok: "En rythme.",
		dh_ignored: "Non surveillé.",
		dh_watch: "Inhabituellement calme.",
		detail_every: "Se signale d’habitude {every}. Dernier signal {when}.",
		heartbeat_title: "Battements · 7 jours",
		heartbeat_legend: "Trait = signal · plus haut = plusieurs",
		with_partner: "Avec l’appareil partenaire",
		partner_quiet: "{partner} continue de se signaler – seul {name} est silencieux.",
		partner_both: "Les deux se signalent comme d’habitude.",
		stat_changed: "Remplacée",
		welcome_head1: "Pulse",
		welcome_head2: "écoute.",
		welcome_lead: "Chaque appareil sur pile a son rythme. Pulse le connaît – et remarque quand il saute un battement.",
		ignored_count: "{count} non surveillés",
		show_list: "Afficher la liste",
		device_settings: "Paramètres",
		no_data_legend: "Pas de données – Pulse ne fonctionnait pas",
		stat_rechargeable: "Accu · approximatif",
		set_head: "Pulse fait le point à {time}.",
		set_quiet: "Calme {start}–{end}.",
		set_no_quiet: "Sans heures calmes.",
		set_failed: "appareils en panne",
		set_check: "« À vérifier »",
		set_battery: "piles",
		set_group: "{names} {level}",
		set_level_now: "immédiatement",
		set_level_daily: "dans le résumé",
		set_level_off: "jamais",
		unit_volt: "{value} V",
		unit_millivolt: "{value} mV",
		unit_percent: "{value} %",
		battery_flag_low: "Faible",
		battery_flag_ok: "OK",
		battery_count_type: "{count} × {type}",
		hour_label: "{h}:00",
		filter_empty: "Aucun appareil dans ce filtre.",
		heartbeat_aria: "{count} signaux en {days} jours",
		replaced_undo_failed: "Impossible d’annuler le changement",
		more_for: "Plus pour {name}",
		z2m_base: "Topic Zigbee2MQTT",
		z2m_base_hint: "Topic de base MQTT, zigbee2mqtt par défaut. À modifier seulement si votre Zigbee2MQTT en utilise un autre.",
		z2m_base_invalid: "Topic invalide : non vide, sans # ni +, sans barre oblique au début ou à la fin.",
		on: "Activé",
		advanced: "Topic de base",
		snooze_cancel: "Annuler le rappel",
		snooze_cancelled: "Rappel annulé",
		read_only: "Seuls les administrateurs peuvent modifier.",
		levels_hint: "En panne : silencieux bien plus longtemps que d’habitude ou injoignable. À vérifier : inhabituellement calme ou pile sous 10 %. « À surveiller » reste dans le panneau.",
		recipients_hint: "Les nouveaux téléphones sont ajoutés automatiquement tant que vous ne changez rien ici.",
		recovered_hint: "Aussi les changements de pile détectés.",
		arrive_hint: "Les notifications attendent qu’une des personnes choisies soit à la maison. S’applique à tous les destinataires.",
		persons_none: "Aucune personne trouvée dans Home Assistant.",
		learning_hint: "Apprend encore : il faut environ 7 signaux pour connaître le rythme. Un appareil qui ne se signale que lors d’actions met plus de temps.",
		learning_one: "Pulse apprend encore à connaître 1 appareil.",
		learning_many: "Pulse apprend encore à connaître {count} appareils.",
		pill_learning: "Apprend",
		pill_waiting: "En attente",
		status_waiting: "En attente",
		dh_waiting: "En attente du premier signal.",
		sent_waiting: "{name} attend son premier signal après le changement de pile.",
		day_line_summary: "Résumé {time}",
		day_line_quiet: "Calme de {start} à {end}",
		day_line_no_quiet: "Sans heures calmes",
		hero_need1: "{count} appareils",
		hero_need1_one: "Un appareil",
		hero_need: "ont besoin de vous.",
		hero_need_one: "a besoin de vous.",
		hero_sub: "{ok} sur {total} en rythme.",
		sent_strays_since: "{name} ne se signale presque plus depuis {day}, dernier signal {last}.",
		sent_strays_for: "{name} ne se signale presque plus depuis {span}, dernier signal {last}.",
		sent_startup: "{name} ne s’est pas signalé depuis le redémarrage.",
		sent_radio_only: "{name} émet, mais n’envoie aucune valeur.",
		sent_battery_missing: "{name} n’indique plus son niveau de pile.",
		flag_strays: "Presque rien depuis {span}",
		status_cloud: "Cloud silencieux",
		dh_strays: "Presque rien depuis {span}.",
		dh_cloud: "Le cloud ne répond pas.",
		dh_startup: "Aucun signal depuis le redémarrage.",
		dh_radio_only: "Émet, sans valeurs.",
		dh_battery_missing: "Niveau de pile manquant.",
		forecast_too_short: "Pas encore observé assez longtemps pour une prévision",
		forecast_flat: "Le pourcentage bouge à peine – pas encore de prévision",
		forecast_coarse: "N’indique que des paliers grossiers – pas de prévision",
		forecast_untrusted: "Le pourcentage d’un accu dit trop peu – pas de prévision",
		forecast_noisy: "Les valeurs varient trop – pas de prévision",
		forecast_days: "Plus que quelques jours",
		forecast_weeks: "Tient encore environ {lo}–{hi} semaines",
		forecast_months: "Tient encore environ {lo}–{hi} mois",
		forecast_years: "Tient encore environ {lo}–{hi} ans",
		due_line: "À changer dans les 8 prochaines semaines : {items}",
		battery_due_many: "{count} bientôt à changer",
		battery_due_one: "1 bientôt à changer",
		cloud_outage_one: "Le cloud {name} ne répond pas – 1 appareil concerné",
		cloud_outage_many: "Le cloud {name} ne répond pas – {count} appareils concernés",
		cloud_device: "Appareil cloud",
		important_badge: "Important",
		mark_important: "Marquer comme important",
		unmark_important: "Plus important",
		important_devices: "Appareils importants",
		filter_important: "Importants",
		filter_battery: "Pile",
		ignore_action: "Ne plus surveiller",
		no_devices: "Aucun appareil sur pile trouvé pour l’instant.",
		connection_lost: "Connexion perdue – Pulse affiche le dernier état et se reconnecte.",
		heartbeat_failed: "Impossible de charger les battements.",
		reload: "Recharger",
		search_label: "Rechercher des appareils",
		health_title: "Compteur radio",
		health_hint: "Repère les appareils qui émettent mais n’envoient plus de valeurs.",
		health_confirm_title: "Activer le compteur radio ?",
		health_confirm_text: "Pulse active le contrôle de santé (health) dans Zigbee2MQTT. Zigbee2MQTT compte alors combien de fois chaque appareil émet – Pulse peut ainsi repérer les appareils qui émettent encore mais n’envoient plus de valeurs.",
		health_confirm_side: "Les appareils sur pile n’envoient rien de plus. Vous pouvez le désactiver à tout moment dans les paramètres de Zigbee2MQTT.",
		partner_suggest: "Suggestion : {name}",
		partner_suggest_why: "souvent actifs ensemble",
		partner_accept: "Utiliser",
		partner_dismiss: "Ignorer",
		new_forecast_title: "Prévision des piles",
		new_forecast_text: "Chaque appareil indique à peu près combien de temps sa pile tiendra encore. La vue d’ensemble liste les piles à changer dans les semaines à venir.",
		new_hero_title: "Les problèmes d’abord",
		new_hero_text: "Quand un appareil a besoin de vous, le titre le dit. Les appareils importants portent une étoile.",
		new_radio_title: "Émet, sans valeurs",
		new_radio_text: "Avec le compteur radio de Zigbee2MQTT, Pulse remarque quand un appareil émet encore mais ne mesure plus rien.",
		new_cloud_title: "Calme pendant les pannes du cloud",
		new_cloud_text: "Si un cloud ne répond plus, vous recevez un seul résumé au lieu de nombreuses alertes. Pulse suggère aussi des appareils partenaires adaptés.",
		new_calver_title: "Nouveaux numéros de version",
		new_calver_text: "Désormais, les versions se lisent année.mois.version : 26.10.4 est la quatrième version d’octobre 2026. Le saut depuis 1.1.0 est voulu – les mises à jour sont détectées comme d’habitude.",
		due_untyped: "type inconnu : {names}",
		beta: "Bêta",
		mains_beta: "Surveiller les appareils sur secteur",
		mains_beta_hint: "Aussi les appareils sur secteur : lampes, prises, volets, thermostats … de toute intégration. Pulse vous prévient quand l’un d’eux n’est plus joignable ou se tait alors qu’il se manifeste d’habitude régulièrement. Les appareils souvent absents d’eux-mêmes (veille, éteints) sont appris et restent discrets. Encore en test.",
		mains_devices: "Appareils sur secteur",
		filter_mains: "Sur secteur",
		mains_chip: "Secteur · Bêta",
		mains_note: "Alimenté par le secteur, sans pile. Pulse vérifie s’il est joignable et, s’il se signale régulièrement, s’il se tait.",
		texts: "Textes",
		texts_hint: "Vos propres titres et textes pour les notifications concernant un appareil. Les résumés restent tels quels.",
		tpl_failed: "En panne",
		tpl_check: "À vérifier",
		tpl_battery: "Pile",
		tpl_recovered: "De retour",
		tpl_default: "Par défaut",
		tpl_custom: "Personnalisé",
		tpl_title_field: "Titre",
		tpl_message_field: "Texte",
		tpl_vars: "Variables",
		tpl_vars_hint: "Touchez pour insérer. {area} reste vide si la pièce figure déjà dans le nom ; les valeurs vides disparaissent avec leur « · ».",
		tpl_preview: "Aperçu",
		tpl_reset: "Rétablir par défaut",
		tpl_save: "Enregistrer",
		new_mains_title: "Les appareils sur secteur sont activés",
		new_mains_text: "Pulse surveille désormais aussi lampes, prises et interrupteurs sur secteur, de toute intégration. Les appareils souvent éteints sont appris. À désactiver sous Notifications → Bêta.",
		new_texts_title: "Vos propres mots",
		new_texts_text: "Modifiez le titre et le texte de chaque notification, avec des variables et un aperçu.",
		new_labels_title: "Des labels plutôt que des clics",
		new_labels_text: "Le label HA pulse_important ou pulse_ignore sur un appareil suffit. Les notifications indiquent désormais la pièce.",
		new_languages_title: "Cinq langues",
		new_languages_text: "Pulse parle anglais, allemand, français, espagnol et néerlandais."
	},
	es: {
		title: "Pulse",
		subtitle: "Se da cuenta cuando un sensor con pila se queda en silencio – solo escucha y no gasta pila.",
		tab_overview: "Resumen",
		tab_devices: "Dispositivos",
		tab_notify: "Notificaciones",
		close: "Cerrar",
		more: "Más",
		loading: "Cargando Pulse …",
		not_loaded: "Pulse aún no está configurado. Añade la integración en Ajustes → Dispositivos y servicios.",
		status_ok: "En ritmo",
		status_learning: "Aprendiendo",
		status_watch: "En observación",
		status_check: "Revisar",
		status_failed: "Sin respuesta",
		ignored: "No supervisado",
		batteries: "Pilas",
		nothing_due: "Nada pendiente",
		last_change: "Último cambio",
		zigbee: "Zigbee2MQTT",
		zigbee_hint: "Marca de tiempo en cada mensaje – sin gasto extra de pila.",
		zigbee_devices: "Dispositivos Zigbee",
		zigbee_sent: "Enviado a Zigbee2MQTT",
		recipients: "Destinatarios",
		quiet: "Horas de silencio",
		off: "Desactivado",
		replaced: "Pila cambiada",
		replaced_done: "Cambio registrado",
		later: "Recordar mañana",
		later_done: "Pulse te lo recordará mañana",
		snoozed_until: "Recordará {when}",
		details: "Detalles",
		ignore: "No supervisado",
		label_set: "Definido por la etiqueta de Home Assistant «{label}».",
		ignore_hint: "Pulse deja este dispositivo en paz.",
		ignored_done: "{name} ya no se supervisa",
		resume: "Volver a supervisar",
		undo: "Deshacer",
		search: "Buscar en {count} dispositivos",
		search_one: "Buscar en 1 dispositivo",
		group_by: "Agrupar por {what}",
		group_area: "área",
		group_status: "estado",
		group_none: "Sin agrupar",
		col_last: "Última señal",
		no_area: "Sin área",
		no_results: "Ningún dispositivo coincide con «{query}».",
		battery: "Pila",
		voltage: "Tensión",
		battery_type: "Tipo",
		battery_count: "Cantidad",
		chemistry: "Clase",
		chem_nimh: "Recargable (NiMH)",
		chem_alkaline: "Alcalina",
		chem_lithium: "Litio",
		chem_unknown: "Desconocida",
		type_unknown: "Sin definir",
		replaced_history: "Cambios de pila",
		never_replaced: "Aún no hay cambios registrados",
		monitoring: "Supervisión",
		important: "Dispositivo importante",
		important_hint: "Límites más estrictos, «Revisar» llega al momento y, si quieres, los fallos como alertas críticas.",
		partner: "Dispositivo compañero",
		partner_hint: "Suelen activarse juntos, p. ej. cerradura y contacto de puerta. Si uno se queda en silencio, Pulse lo nota antes.",
		partner_none: "Ninguno",
		open_device: "Abrir página del dispositivo",
		just_now: "ahora mismo",
		minutes_ago: "hace {n} min",
		hours_ago: "hace {n} h",
		days_ago: "hace {n} días",
		day_ago: "ayer",
		every_minutes: "cada {n} min",
		every_hours: "cada {n} h",
		every_days: "cada {n} días",
		unknown: "—",
		today: "hoy",
		recipients_none: "No se encontró ningún teléfono con la app de Home Assistant.",
		when: "Cuándo notificar",
		level_failed: "Sin respuesta",
		level_check: "Revisar",
		level_battery: "Pila casi agotada",
		level_now: "Al momento",
		level_daily: "A diario",
		level_off: "Desactivado",
		times: "Horarios",
		summary_time: "Resumen diario",
		quiet_from: "Desde",
		quiet_to: "Hasta",
		quiet_hint: "Las notificaciones en horas de silencio llegan después. Las críticas siempre llegan.",
		special: "Casos especiales",
		critical: "Alertas críticas",
		critical_hint: "Sensores de fugas, detectores de humo, cerraduras – se saltan el modo silencio y la concentración",
		arrive: "Solo cuando haya alguien en casa",
		recovered: "Cuando un dispositivo vuelve",
		try_it: "Probar",
		test: "Enviar notificación de prueba",
		test_done: "Prueba enviada a {count} teléfono(s)",
		test_none: "Ningún destinatario seleccionado",
		summary_now: "Enviar resumen ahora",
		summary_sent: "Resumen enviado",
		summary_empty: "Ahora mismo no hay nada que resumir",
		show_welcome: "Mostrar bienvenida",
		open_integration: "Ajustes de la integración",
		whats_new_title: "Novedades de Pulse {version}",
		welcome_rhythm_title: "Conoce cada ritmo",
		welcome_rhythm_text: "Pulse ya ha aprendido de los últimos 10 días con qué frecuencia da señales cada dispositivo.",
		welcome_listen_title: "Solo escucha",
		welcome_listen_text: "Nunca consulta un dispositivo. No gasta pila ni genera tráfico de radio.",
		welcome_notify_title: "Te avisa a tiempo",
		welcome_notify_text: "Lo importante al momento, lo demás una vez al día – con horas de silencio.",
		welcome_zigbee_title: "Señales de vida Zigbee",
		welcome_zigbee_text: "Deja que Zigbee2MQTT añada una marca de tiempo a cada mensaje.",
		continue: "Continuar",
		version: "Versión {version}",
		today_cap: "Hoy",
		yesterday_cap: "Ayer",
		zigbee_active: "Activo",
		zigbee_requested: "Solicitado",
		zigbee_confirm_title: "¿Activar las señales de vida Zigbee?",
		zigbee_confirm_text: "Pulse activa «last_seen» y «availability» en Zigbee2MQTT. Así Pulse también detecta señales sin valor nuevo y nota antes los cortes de radio.",
		zigbee_confirm_side: "Los dispositivos Zigbee que se queden en silencio aparecerán como no disponibles en Home Assistant. Los dispositivos con pila no envían nada extra. Puedes deshacerlo cuando quieras en los ajustes de Zigbee2MQTT.",
		zigbee_confirm_go: "Activar",
		cancel: "Cancelar",
		level_unreliable: "Recargable – el porcentaje dice poco, Pulse vigila el ritmo",
		replaced_undone: "Cambio eliminado",
		filter_clear: "Quitar filtro",
		filter_label: "Solo: {what}",
		whats_new_all: "Todas las novedades",
		replaced_now: "Registrar cambio de pila",
		battery_none_low: "Ninguna baja",
		battery_low_one: "1 baja",
		battery_low_many: "{count} bajas",
		hero_all: "Los {count} dispositivos",
		hero_some: "{ok} de {total} dispositivos",
		hero_some_short: "{ok} de {total}",
		hero_beat: "están en ritmo.",
		hero_beat_short: "en ritmo.",
		hero_one: "Tu único dispositivo",
		hero_beat_one: "está en ritmo.",
		hero_beat_off: "está en silencio.",
		hero_learn1: "Pulse",
		hero_learn2: "está aprendiendo.",
		hero_none1: "Aún no hay",
		hero_none2: "dispositivos con pila.",
		sent_silent_for: "{name} lleva {span} en silencio.",
		sent_silent_since: "{name} está en silencio desde {day}.",
		sent_battery: "{name} pronto necesitará una pila nueva.",
		sent_battery_low: "{name} necesita una pila nueva.",
		sent_unavailable: "{name} no está disponible.",
		sent_partner: "{name} está en silencio mientras {partner} está activo.",
		sent_other: "{name}: {reason}",
		sent_more: "Y {count} más.",
		sent_all_good: "Todos los dispositivos dan señales como siempre.",
		sent_learning: "Pulse está aprendiendo con qué frecuencia da señales cada dispositivo.",
		span_minutes: "{n} minutos",
		span_hours: "{n} horas",
		span_hour: "1 hora",
		span_days: "{n} días",
		span_day: "1 día",
		yesterday: "ayer",
		flag_silent: "En silencio desde hace {span}",
		group_need: "Te necesitan",
		group_watch: "En observación",
		group_rhythm: "En ritmo",
		group_learning: "Aprendiendo",
		monitor_head: "{count} dispositivos · 7 días",
		monitor_head_one: "1 dispositivo · 7 días",
		day_title: "Tu día con Pulse",
		day_to: "Para {names}",
		day_nobody: "Aún sin destinatario",
		status_battery: "Pila {level} %",
		new_battery: "Pila nueva",
		dh_silent: "En silencio desde hace {span}.",
		dh_unavailable: "No disponible.",
		dh_partner: "En silencio, compañero activo.",
		dh_battery: "Pila al {level} %.",
		dh_learning: "Aún aprendiendo.",
		dh_ok: "En ritmo.",
		dh_ignored: "No supervisado.",
		dh_watch: "Inusualmente callado.",
		detail_every: "Suele dar señales {every}. Última señal {when}.",
		heartbeat_title: "Latidos · 7 días",
		heartbeat_legend: "Marca = señal · más alta = varias",
		with_partner: "Con dispositivo compañero",
		partner_quiet: "{partner} sigue dando señales – solo {name} está en silencio.",
		partner_both: "Ambos dan señales como siempre.",
		stat_changed: "Cambiada",
		welcome_head1: "Pulse",
		welcome_head2: "escucha.",
		welcome_lead: "Cada dispositivo con pila tiene un ritmo. Pulse lo conoce – y nota cuando se salta un latido.",
		ignored_count: "{count} no supervisados",
		show_list: "Mostrar lista",
		device_settings: "Ajustes",
		no_data_legend: "Sin datos – Pulse no estaba en marcha",
		stat_rechargeable: "Recargable · aproximado",
		set_head: "Pulse te informa a las {time}.",
		set_quiet: "Silencio {start}–{end}.",
		set_no_quiet: "Sin horas de silencio.",
		set_failed: "dispositivos sin respuesta",
		set_check: "«Revisar»",
		set_battery: "pilas",
		set_group: "{names} {level}",
		set_level_now: "al momento",
		set_level_daily: "en el resumen",
		set_level_off: "nunca",
		unit_volt: "{value} V",
		unit_millivolt: "{value} mV",
		unit_percent: "{value} %",
		battery_flag_low: "Baja",
		battery_flag_ok: "OK",
		battery_count_type: "{count} × {type}",
		hour_label: "{h}:00",
		filter_empty: "Ningún dispositivo en este filtro.",
		heartbeat_aria: "{count} señales en {days} días",
		replaced_undo_failed: "No se pudo deshacer el cambio",
		more_for: "Más sobre {name}",
		z2m_base: "Tema de Zigbee2MQTT",
		z2m_base_hint: "Tema base de MQTT, por defecto zigbee2mqtt. Cámbialo solo si tu Zigbee2MQTT usa otro.",
		z2m_base_invalid: "Tema no válido: no vacío, sin # ni +, sin barra al principio ni al final.",
		on: "Activado",
		advanced: "Tema base",
		snooze_cancel: "Cancelar recordatorio",
		snooze_cancelled: "Recordatorio cancelado",
		read_only: "Solo los administradores pueden hacer cambios.",
		levels_hint: "Sin respuesta: en silencio mucho más tiempo de lo habitual o no disponible. Revisar: inusualmente callado o pila por debajo del 10 %. «En observación» se queda en el panel.",
		recipients_hint: "Los teléfonos nuevos se añaden solos hasta que cambies algo aquí.",
		recovered_hint: "También los cambios de pila detectados.",
		arrive_hint: "Las notificaciones esperan hasta que una de las personas elegidas esté en casa. Se aplica a todos los destinatarios.",
		persons_none: "No se encontró ninguna persona en Home Assistant.",
		learning_hint: "Aún aprendiendo: necesita unas 7 señales para conocer el ritmo. Un dispositivo que solo da señales al usarse tarda más.",
		learning_one: "Pulse aún está conociendo 1 dispositivo.",
		learning_many: "Pulse aún está conociendo {count} dispositivos.",
		pill_learning: "Aprendiendo",
		pill_waiting: "Esperando",
		status_waiting: "Esperando",
		dh_waiting: "Esperando la primera señal.",
		sent_waiting: "{name} espera su primera señal tras el cambio de pila.",
		day_line_summary: "Resumen {time}",
		day_line_quiet: "Silencio de {start} a {end}",
		day_line_no_quiet: "Sin horas de silencio",
		hero_need1: "{count} dispositivos",
		hero_need1_one: "Un dispositivo",
		hero_need: "te necesitan.",
		hero_need_one: "te necesita.",
		hero_sub: "{ok} de {total} en ritmo.",
		sent_strays_since: "{name} apenas da señales desde {day}, la última {last}.",
		sent_strays_for: "{name} apenas da señales desde hace {span}, la última {last}.",
		sent_startup: "{name} no ha dado señales desde el reinicio.",
		sent_radio_only: "{name} emite, pero no envía valores.",
		sent_battery_missing: "{name} ya no informa de su nivel de pila.",
		flag_strays: "Casi nada desde hace {span}",
		status_cloud: "Nube en silencio",
		dh_strays: "Casi nada desde hace {span}.",
		dh_cloud: "La nube no responde.",
		dh_startup: "Sin señales desde el reinicio.",
		dh_radio_only: "Emite, sin valores.",
		dh_battery_missing: "Falta el nivel de pila.",
		forecast_too_short: "Aún no se ha observado lo suficiente para una previsión",
		forecast_flat: "El porcentaje apenas cambia – aún sin previsión",
		forecast_coarse: "Solo informa en pasos gruesos – sin previsión",
		forecast_untrusted: "El porcentaje de un recargable dice demasiado poco – sin previsión",
		forecast_noisy: "Los valores varían demasiado – sin previsión",
		forecast_days: "Solo le quedan unos días",
		forecast_weeks: "Durará unas {lo}–{hi} semanas más",
		forecast_months: "Durará unos {lo}–{hi} meses más",
		forecast_years: "Durará unos {lo}–{hi} años más",
		due_line: "Por cambiar en las próximas 8 semanas: {items}",
		battery_due_many: "{count} por cambiar pronto",
		battery_due_one: "1 por cambiar pronto",
		cloud_outage_one: "La nube de {name} no responde – 1 dispositivo afectado",
		cloud_outage_many: "La nube de {name} no responde – {count} dispositivos afectados",
		cloud_device: "Dispositivo en la nube",
		important_badge: "Importante",
		mark_important: "Marcar como importante",
		unmark_important: "Ya no es importante",
		important_devices: "Dispositivos importantes",
		filter_important: "Importantes",
		filter_battery: "Pila",
		ignore_action: "Dejar de supervisar",
		no_devices: "Aún no se han encontrado dispositivos con pila.",
		connection_lost: "Conexión perdida – Pulse muestra el último estado y se está reconectando.",
		heartbeat_failed: "No se pudieron cargar los latidos.",
		reload: "Recargar",
		search_label: "Buscar dispositivos",
		health_title: "Contador de radio",
		health_hint: "Detecta dispositivos que emiten pero ya no envían valores.",
		health_confirm_title: "¿Activar el contador de radio?",
		health_confirm_text: "Pulse activa la comprobación de estado (health) en Zigbee2MQTT. Zigbee2MQTT cuenta entonces cuántas veces emite cada dispositivo – así Pulse detecta dispositivos que siguen emitiendo pero ya no envían valores.",
		health_confirm_side: "Los dispositivos con pila no envían nada extra. Puedes desactivarlo cuando quieras en los ajustes de Zigbee2MQTT.",
		partner_suggest: "Sugerencia: {name}",
		partner_suggest_why: "a menudo activos juntos",
		partner_accept: "Usar",
		partner_dismiss: "Descartar",
		new_forecast_title: "Previsión de pilas",
		new_forecast_text: "Cada dispositivo muestra más o menos cuánto le durará la pila. El resumen indica qué pilas tocará cambiar en las próximas semanas.",
		new_hero_title: "Primero los problemas",
		new_hero_text: "Cuando un dispositivo te necesita, el titular lo dice. Los dispositivos importantes llevan una estrella.",
		new_radio_title: "Emite, sin valores",
		new_radio_text: "Con el contador de radio de Zigbee2MQTT, Pulse nota cuando un dispositivo sigue emitiendo pero ya no mide nada.",
		new_cloud_title: "Calma en las caídas de la nube",
		new_cloud_text: "Si una nube deja de responder, recibes un solo resumen en lugar de muchas alertas. Además, Pulse sugiere dispositivos compañeros adecuados.",
		new_calver_title: "Nuevos números de versión",
		new_calver_text: "A partir de ahora las versiones se leen año.mes.versión: 26.10.4 es la cuarta versión de octubre de 2026. El salto desde 1.1.0 es intencionado – las actualizaciones se detectan como siempre.",
		due_untyped: "tipo desconocido: {names}",
		beta: "Beta",
		mains_beta: "Supervisar dispositivos conectados a la red",
		mains_beta_hint: "También dispositivos con corriente: lámparas, enchufes, persianas, termostatos … de cualquier integración. Pulse avisa cuando uno ya no está disponible o se calla aunque suele informar con regularidad. Los dispositivos que a menudo desaparecen solos (reposo, apagados) los aprende y no avisa. Aún en pruebas.",
		mains_devices: "Dispositivos conectados a la red",
		filter_mains: "Conectados a la red",
		mains_chip: "Red · Beta",
		mains_note: "Alimentado por la red eléctrica, sin pila. Pulse vigila si está disponible y, si da señales con regularidad, si se queda en silencio.",
		texts: "Textos",
		texts_hint: "Tus propios títulos y textos para las notificaciones de un dispositivo. Los resúmenes no cambian.",
		tpl_failed: "Sin respuesta",
		tpl_check: "Revisar",
		tpl_battery: "Pila",
		tpl_recovered: "De vuelta",
		tpl_default: "Predeterminado",
		tpl_custom: "Personalizado",
		tpl_title_field: "Título",
		tpl_message_field: "Texto",
		tpl_vars: "Variables",
		tpl_vars_hint: "Toca para insertar. {area} queda vacío si la habitación ya está en el nombre; los valores vacíos desaparecen con su «·».",
		tpl_preview: "Vista previa",
		tpl_reset: "Usar predeterminado",
		tpl_save: "Guardar",
		new_mains_title: "Los dispositivos a la red ya están activos",
		new_mains_text: "Pulse ahora también vigila lámparas, enchufes e interruptores conectados a la red, de cualquier integración. Aprende los que suelen estar apagados. Desactívalo en Notificaciones → Beta.",
		new_texts_title: "Tus propias palabras",
		new_texts_text: "Cambia el título y el texto de cada notificación, con marcadores y vista previa.",
		new_labels_title: "Etiquetas en vez de clics",
		new_labels_text: "Basta con la etiqueta de HA pulse_important o pulse_ignore en un dispositivo. Las notificaciones ya indican el área.",
		new_languages_title: "Cinco idiomas",
		new_languages_text: "Pulse habla inglés, alemán, francés, español y neerlandés."
	},
	nl: {
		title: "Pulse",
		subtitle: "Merkt het als een batterijsensor stil wordt – luistert alleen en kost geen batterij.",
		tab_overview: "Overzicht",
		tab_devices: "Apparaten",
		tab_notify: "Meldingen",
		close: "Sluiten",
		more: "Meer",
		loading: "Pulse laden …",
		not_loaded: "Pulse is nog niet ingesteld. Voeg de integratie toe via Instellingen → Apparaten & diensten.",
		status_ok: "In ritme",
		status_learning: "Leert",
		status_watch: "In de gaten",
		status_check: "Controleren",
		status_failed: "Uitgevallen",
		ignored: "Niet bewaakt",
		batteries: "Batterijen",
		nothing_due: "Niets aan de beurt",
		last_change: "Laatst vervangen",
		zigbee: "Zigbee2MQTT",
		zigbee_hint: "Tijdstempel bij elk bericht – zonder extra verbruik.",
		zigbee_devices: "Zigbee-apparaten",
		zigbee_sent: "Naar Zigbee2MQTT gestuurd",
		recipients: "Ontvangers",
		quiet: "Rusttijd",
		off: "Uit",
		replaced: "Batterij vervangen",
		replaced_done: "Wissel genoteerd",
		later: "Morgen herinneren",
		later_done: "Pulse herinnert je morgen",
		snoozed_until: "Herinnert {when}",
		details: "Details",
		ignore: "Niet bewaakt",
		label_set: "Ingesteld via het Home Assistant-label ‘{label}’.",
		ignore_hint: "Pulse laat dit apparaat met rust.",
		ignored_done: "{name} wordt niet meer bewaakt",
		resume: "Weer bewaken",
		undo: "Ongedaan maken",
		search: "{count} apparaten doorzoeken",
		search_one: "1 apparaat doorzoeken",
		group_by: "Groeperen op {what}",
		group_area: "ruimte",
		group_status: "status",
		group_none: "Niet gegroepeerd",
		col_last: "Laatste melding",
		no_area: "Geen ruimte",
		no_results: "Geen apparaat komt overeen met ‘{query}’.",
		battery: "Batterij",
		voltage: "Spanning",
		battery_type: "Type",
		battery_count: "Aantal",
		chemistry: "Soort",
		chem_nimh: "Oplaadbaar (NiMH)",
		chem_alkaline: "Alkaline",
		chem_lithium: "Lithium",
		chem_unknown: "Onbekend",
		type_unknown: "Niet ingesteld",
		replaced_history: "Batterijwissels",
		never_replaced: "Nog geen wissel genoteerd",
		monitoring: "Bewaking",
		important: "Belangrijk apparaat",
		important_hint: "Strengere grenzen, ‘Controleren’ komt meteen, uitval desgewenst als kritieke melding.",
		partner: "Partnerapparaat",
		partner_hint: "Gaan meestal samen af, bijv. slot en deurcontact. Valt er een stil, dan merkt Pulse het eerder.",
		partner_none: "Geen",
		open_device: "Apparaatpagina openen",
		just_now: "zojuist",
		minutes_ago: "{n} min geleden",
		hours_ago: "{n} u geleden",
		days_ago: "{n} dagen geleden",
		day_ago: "gisteren",
		every_minutes: "elke {n} min",
		every_hours: "elke {n} u",
		every_days: "elke {n} dagen",
		unknown: "—",
		today: "vandaag",
		recipients_none: "Geen telefoon met de Home Assistant-app gevonden.",
		when: "Wanneer melden",
		level_failed: "Uitgevallen",
		level_check: "Controleren",
		level_battery: "Batterij bijna leeg",
		level_now: "Meteen",
		level_daily: "Dagelijks",
		level_off: "Uit",
		times: "Tijden",
		summary_time: "Dagelijkse samenvatting",
		quiet_from: "Van",
		quiet_to: "Tot",
		quiet_hint: "Meldingen tijdens de rusttijd komen daarna. Kritieke komen altijd door.",
		special: "Bijzondere gevallen",
		critical: "Kritieke meldingen",
		critical_hint: "Lekdetectoren, rookmelders, sloten – doorbreken stille modus en focus",
		arrive: "Pas als er iemand thuis is",
		recovered: "Als een apparaat terug is",
		try_it: "Uitproberen",
		test: "Testmelding sturen",
		test_done: "Test naar {count} telefoon(s) gestuurd",
		test_none: "Geen ontvanger gekozen",
		summary_now: "Samenvatting nu sturen",
		summary_sent: "Samenvatting gestuurd",
		summary_empty: "Er is nu niets om samen te vatten",
		show_welcome: "Welkom tonen",
		open_integration: "Integratie-instellingen",
		whats_new_title: "Nieuw in Pulse {version}",
		welcome_rhythm_title: "Kent elk ritme",
		welcome_rhythm_text: "Hoe vaak elk apparaat zich meldt, heeft Pulse al geleerd uit de laatste 10 dagen.",
		welcome_listen_title: "Luistert alleen",
		welcome_listen_text: "Pulse vraagt nooit een apparaat uit. Dat kost geen batterij en geen radioverkeer.",
		welcome_notify_title: "Laat het op tijd weten",
		welcome_notify_text: "Belangrijke dingen meteen, de rest eens per dag – met rusttijd.",
		welcome_zigbee_title: "Zigbee-levenstekens",
		welcome_zigbee_text: "Laat Zigbee2MQTT een tijdstempel aan elk bericht toevoegen.",
		continue: "Doorgaan",
		version: "Versie {version}",
		today_cap: "Vandaag",
		yesterday_cap: "Gisteren",
		zigbee_active: "Actief",
		zigbee_requested: "Aangevraagd",
		zigbee_confirm_title: "Zigbee-levenstekens inschakelen?",
		zigbee_confirm_text: "Pulse schakelt ‘last_seen’ en ‘availability’ in Zigbee2MQTT in. Zo merkt Pulse ook meldingen zonder nieuwe waarde op en ziet het radio-onderbrekingen sneller.",
		zigbee_confirm_side: "Stil geworden Zigbee-apparaten verschijnen in Home Assistant dan als niet beschikbaar. Batterijapparaten sturen daardoor niets extra. Je kunt dit altijd terugzetten in de instellingen van Zigbee2MQTT.",
		zigbee_confirm_go: "Inschakelen",
		cancel: "Annuleren",
		level_unreliable: "Oplaadbaar – percentage zegt weinig, Pulse let op het ritme",
		replaced_undone: "Wissel verwijderd",
		filter_clear: "Filter wissen",
		filter_label: "Alleen: {what}",
		whats_new_all: "Alle nieuwigheden",
		replaced_now: "Batterijwissel noteren",
		battery_none_low: "Geen zwak",
		battery_low_one: "1 zwak",
		battery_low_many: "{count} zwak",
		hero_all: "Alle {count} apparaten",
		hero_some: "{ok} van {total} apparaten",
		hero_some_short: "{ok} van {total}",
		hero_beat: "zijn in ritme.",
		hero_beat_short: "in ritme.",
		hero_one: "Je enige apparaat",
		hero_beat_one: "is in ritme.",
		hero_beat_off: "is stil.",
		hero_learn1: "Pulse",
		hero_learn2: "leert nog.",
		hero_none1: "Nog geen",
		hero_none2: "batterijapparaten.",
		sent_silent_for: "{name} is al {span} stil.",
		sent_silent_since: "{name} is sinds {day} stil.",
		sent_battery: "{name} heeft binnenkort een nieuwe batterij nodig.",
		sent_battery_low: "{name} heeft een nieuwe batterij nodig.",
		sent_unavailable: "{name} is onbereikbaar.",
		sent_partner: "{name} is stil terwijl {partner} actief is.",
		sent_other: "{name}: {reason}",
		sent_more: "En nog {count}.",
		sent_all_good: "Alle apparaten melden zich zoals gewoonlijk.",
		sent_learning: "Pulse leert hoe vaak elk apparaat zich meldt.",
		span_minutes: "{n} minuten",
		span_hours: "{n} uur",
		span_hour: "1 uur",
		span_days: "{n} dagen",
		span_day: "1 dag",
		yesterday: "gisteren",
		flag_silent: "Al {span} stil",
		group_need: "Heeft je nodig",
		group_watch: "In de gaten",
		group_rhythm: "In ritme",
		group_learning: "Leert nog",
		monitor_head: "{count} apparaten · 7 dagen",
		monitor_head_one: "1 apparaat · 7 dagen",
		day_title: "Je dag met Pulse",
		day_to: "Aan {names}",
		day_nobody: "Nog geen ontvanger",
		status_battery: "Batterij {level}%",
		new_battery: "Nieuwe batterij",
		dh_silent: "Al {span} stil.",
		dh_unavailable: "Onbereikbaar.",
		dh_partner: "Stil, partner actief.",
		dh_battery: "Batterij op {level}%.",
		dh_learning: "Leert nog.",
		dh_ok: "In ritme.",
		dh_ignored: "Niet bewaakt.",
		dh_watch: "Ongewoon stil.",
		detail_every: "Meldt zich normaal {every}. Laatste melding {when}.",
		heartbeat_title: "Hartslag · 7 dagen",
		heartbeat_legend: "Streepje = melding · hoger = meerdere",
		with_partner: "Met partnerapparaat",
		partner_quiet: "{partner} meldt zich nog – alleen {name} is stil.",
		partner_both: "Beide melden zich zoals gewoonlijk.",
		stat_changed: "Vervangen",
		welcome_head1: "Pulse",
		welcome_head2: "luistert.",
		welcome_lead: "Elk batterijapparaat heeft een ritme. Pulse kent het – en merkt het als het hapert.",
		ignored_count: "{count} niet bewaakt",
		show_list: "Lijst tonen",
		device_settings: "Instellingen",
		no_data_legend: "Geen gegevens – Pulse draaide niet",
		stat_rechargeable: "Oplaadbaar · globaal",
		set_head: "Pulse meldt zich om {time}.",
		set_quiet: "Rust {start}–{end}.",
		set_no_quiet: "Geen rusttijd.",
		set_failed: "uitgevallen apparaten",
		set_check: "‘Controleren’",
		set_battery: "batterijen",
		set_group: "{names} {level}",
		set_level_now: "meteen",
		set_level_daily: "in de samenvatting",
		set_level_off: "nooit",
		unit_volt: "{value} V",
		unit_millivolt: "{value} mV",
		unit_percent: "{value}%",
		battery_flag_low: "Zwak",
		battery_flag_ok: "OK",
		battery_count_type: "{count} × {type}",
		hour_label: "{h}:00",
		filter_empty: "Geen apparaat in dit filter.",
		heartbeat_aria: "{count} meldingen in {days} dagen",
		replaced_undo_failed: "Wissel kon niet ongedaan worden gemaakt",
		more_for: "Meer voor {name}",
		z2m_base: "Zigbee2MQTT-topic",
		z2m_base_hint: "MQTT-basistopic, standaard zigbee2mqtt. Alleen wijzigen als je Zigbee2MQTT een andere gebruikt.",
		z2m_base_invalid: "Ongeldige topic: niet leeg, geen # of +, geen schuine streep aan het begin of eind.",
		on: "Aan",
		advanced: "Basistopic",
		snooze_cancel: "Herinnering annuleren",
		snooze_cancelled: "Herinnering geannuleerd",
		read_only: "Alleen beheerders kunnen iets wijzigen.",
		levels_hint: "Uitgevallen: veel langer stil dan normaal of onbereikbaar. Controleren: opvallend stil of batterij onder 10%. ‘In de gaten’ blijft in het paneel.",
		recipients_hint: "Nieuwe telefoons komen er automatisch bij, tot je hier iets wijzigt.",
		recovered_hint: "Ook herkende batterijwissels.",
		arrive_hint: "Meldingen wachten tot een van de gekozen personen thuis is. Geldt voor alle ontvangers.",
		persons_none: "Geen persoon gevonden in Home Assistant.",
		learning_hint: "Leert nog: heeft ongeveer 7 meldingen nodig om het ritme te kennen. Een apparaat dat alleen bij acties meldt, heeft meer tijd nodig.",
		learning_one: "Pulse leert 1 apparaat nog kennen.",
		learning_many: "Pulse leert {count} apparaten nog kennen.",
		pill_learning: "Leert nog",
		pill_waiting: "Wacht",
		status_waiting: "Wacht",
		dh_waiting: "Wacht op de eerste melding.",
		sent_waiting: "{name} wacht op de eerste melding na de batterijwissel.",
		day_line_summary: "Samenvatting {time}",
		day_line_quiet: "Rust van {start} tot {end}",
		day_line_no_quiet: "Geen rusttijd",
		hero_need1: "{count} apparaten",
		hero_need1_one: "Eén apparaat",
		hero_need: "hebben je nodig.",
		hero_need_one: "heeft je nodig.",
		hero_sub: "{ok} van {total} in ritme.",
		sent_strays_since: "{name} meldt zich sinds {day} nauwelijks nog, laatst {last}.",
		sent_strays_for: "{name} meldt zich al {span} nauwelijks nog, laatst {last}.",
		sent_startup: "{name} heeft zich sinds de herstart nog niet gemeld.",
		sent_radio_only: "{name} zendt, maar stuurt geen waarden.",
		sent_battery_missing: "{name} meldt zijn batterijniveau niet meer.",
		flag_strays: "Al {span} nauwelijks iets",
		status_cloud: "Cloud stil",
		dh_strays: "Al {span} nauwelijks iets.",
		dh_cloud: "Cloud reageert niet.",
		dh_startup: "Geen melding sinds de herstart.",
		dh_radio_only: "Zendt zonder waarden.",
		dh_battery_missing: "Batterijniveau ontbreekt.",
		forecast_too_short: "Nog te kort bekeken voor een voorspelling",
		forecast_flat: "Percentage verandert nauwelijks – nog geen voorspelling",
		forecast_coarse: "Meldt alleen grove stappen – geen voorspelling",
		forecast_untrusted: "Percentage van een oplaadbare zegt te weinig – geen voorspelling",
		forecast_noisy: "Waarden schommelen te veel – geen voorspelling",
		forecast_days: "Nog maar een paar dagen",
		forecast_weeks: "Gaat nog ca. {lo}–{hi} weken mee",
		forecast_months: "Gaat nog ca. {lo}–{hi} maanden mee",
		forecast_years: "Gaat nog ca. {lo}–{hi} jaar mee",
		due_line: "Aan de beurt in de komende 8 weken: {items}",
		battery_due_many: "{count} binnenkort aan de beurt",
		battery_due_one: "1 binnenkort aan de beurt",
		cloud_outage_one: "{name}-cloud reageert niet – 1 apparaat getroffen",
		cloud_outage_many: "{name}-cloud reageert niet – {count} apparaten getroffen",
		cloud_device: "Cloudapparaat",
		important_badge: "Belangrijk",
		mark_important: "Als belangrijk markeren",
		unmark_important: "Niet meer belangrijk",
		important_devices: "Belangrijke apparaten",
		filter_important: "Belangrijk",
		filter_battery: "Batterij",
		ignore_action: "Niet meer bewaken",
		no_devices: "Nog geen batterijapparaten gevonden.",
		connection_lost: "Verbinding verbroken – Pulse toont de laatste stand en maakt opnieuw verbinding.",
		heartbeat_failed: "De hartslag kon niet worden geladen.",
		reload: "Opnieuw laden",
		search_label: "Apparaten doorzoeken",
		health_title: "Radioteller",
		health_hint: "Herkent apparaten die zenden, maar geen waarden meer sturen.",
		health_confirm_title: "Radioteller inschakelen?",
		health_confirm_text: "Pulse schakelt de health-controle in Zigbee2MQTT in. Zigbee2MQTT telt dan hoe vaak elk apparaat zendt – zo herkent Pulse apparaten die nog zenden, maar geen waarden meer sturen.",
		health_confirm_side: "Batterijapparaten sturen daardoor niets extra. Je kunt het altijd uitschakelen in de instellingen van Zigbee2MQTT.",
		partner_suggest: "Suggestie: {name}",
		partner_suggest_why: "vaak samen actief",
		partner_accept: "Gebruiken",
		partner_dismiss: "Negeren",
		new_forecast_title: "Batterijvoorspelling",
		new_forecast_text: "Elk apparaat toont ongeveer hoe lang de batterij nog meegaat. Het overzicht laat zien welke batterijen de komende weken aan de beurt zijn.",
		new_hero_title: "Problemen eerst",
		new_hero_text: "Heeft een apparaat je nodig, dan staat dat groot bovenaan. Belangrijke apparaten hebben een ster.",
		new_radio_title: "Zendt zonder waarden",
		new_radio_text: "Met de radioteller van Zigbee2MQTT merkt Pulse wanneer een apparaat nog zendt, maar niets meer meet.",
		new_cloud_title: "Rustig bij cloudstoringen",
		new_cloud_text: "Reageert een cloud niet meer, dan krijg je één samenvatting in plaats van veel meldingen. Ook stelt Pulse passende partnerapparaten voor.",
		new_calver_title: "Nieuwe versienummers",
		new_calver_text: "Vanaf nu lezen versies als jaar.maand.release: 26.10.4 is de vierde release in oktober 2026. De sprong vanaf 1.1.0 is bewust – updates worden zoals gewoonlijk gevonden.",
		due_untyped: "type onbekend: {names}",
		beta: "Bèta",
		mains_beta: "Apparaten op netstroom bewaken",
		mains_beta_hint: "Ook apparaten op het stroomnet: lampen, stekkers, rolluiken, thermostaten … uit elke integratie. Pulse meldt het als er een niet meer bereikbaar is of stil wordt terwijl hij zich normaal regelmatig meldt. Apparaten die vaak vanzelf weg zijn (stand-by, uitgeschakeld) leert Pulse kennen en blijft dan stil. Nog in de testfase.",
		mains_devices: "Apparaten op netstroom",
		filter_mains: "Netstroom",
		mains_chip: "Netstroom · Bèta",
		mains_note: "Werkt op netstroom, geen batterij. Pulse let op of het bereikbaar is en, als het zich regelmatig meldt, of het stil wordt.",
		texts: "Teksten",
		texts_hint: "Eigen titels en teksten voor meldingen over één apparaat. Samenvattingen blijven zoals ze zijn.",
		tpl_failed: "Uitgevallen",
		tpl_check: "Controleren",
		tpl_battery: "Batterij",
		tpl_recovered: "Weer terug",
		tpl_default: "Standaard",
		tpl_custom: "Eigen",
		tpl_title_field: "Titel",
		tpl_message_field: "Tekst",
		tpl_vars: "Variabelen",
		tpl_vars_hint: "Tik om in te voegen. {area} blijft leeg als de ruimte al in de naam staat; lege waarden verdwijnen met hun ‘ · ’.",
		tpl_preview: "Voorbeeld",
		tpl_reset: "Standaard gebruiken",
		tpl_save: "Opslaan",
		new_mains_title: "Apparaten op netstroom staan nu aan",
		new_mains_text: "Pulse let nu ook op lampen, stekkers en schakelaars op netstroom, uit elke integratie. Apparaten die vaak uit staan leert Pulse kennen. Uitzetten onder Meldingen → Bèta.",
		new_texts_title: "Je eigen woorden",
		new_texts_text: "Pas de titel en tekst van elke melding aan, met placeholders en een voorbeeld.",
		new_labels_title: "Labels in plaats van klikken",
		new_labels_text: "Het HA-label pulse_important of pulse_ignore op een apparaat is genoeg. Meldingen noemen nu de ruimte.",
		new_languages_title: "Vijf talen",
		new_languages_text: "Pulse spreekt Engels, Duits, Frans, Spaans en Nederlands."
	}
};
function L(e, t, n = {}) {
	return (Ke[e.slice(0, 2).toLowerCase()] ?? Ge)[t].replace(/\{(\w+)\}/g, (e, t) => t in n ? String(n[t]) : e);
}
//#endregion
//#region src/logic.ts
function R(e) {
	let t = null;
	return (...n) => {
		if (t !== null && t.args.length === n.length && t.args.every((e, t) => Object.is(e, n[t]))) return t.value;
		let r = e(...n);
		return t = {
			args: n,
			value: r
		}, r;
	};
}
var z = {
	ok: 0,
	learning: 0,
	watch: 1,
	check: 2,
	failed: 3
};
function B(e) {
	return e === "failed" ? "crit" : e === "check" || e === "watch" ? "warn" : e === "learning" ? "muted" : "ok";
}
function V(e) {
	return e.ignored || H(e) ? "muted" : B(e.status);
}
function H(e) {
	return !e.ignored && e.reason_key === "cloud_outage";
}
function qe(e) {
	return {
		ok: "status_ok",
		learning: "status_learning",
		watch: "status_watch",
		check: "status_check",
		failed: "status_failed"
	}[e];
}
function U(e) {
	return e.filter((e) => !e.ignored);
}
function Je(e) {
	return U(e).filter((e) => z[e.status] >= 2 && !H(e)).sort((e, t) => z[t.status] - z[e.status] || e.name.localeCompare(t.name));
}
function Ye(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of U(e)) {
		let e = r.area ?? t, i = n.get(e) ?? [];
		i.push(r), n.set(e, i);
	}
	return [...n.entries()].sort(([e], [n]) => e === t ? 1 : n === t ? -1 : e.localeCompare(n)).map(([e, t]) => ({
		area: e,
		devices: t.sort((e, t) => e.name.localeCompare(t.name))
	}));
}
function Xe(e, t, n) {
	if (t === null) return L(e, "unknown");
	let r = Math.max(0, n - t);
	if (r < 60) return L(e, "just_now");
	if (r < 3600) return L(e, "minutes_ago", { n: Math.round(r / 60) });
	if (r < 86400) return L(e, "hours_ago", { n: Math.round(r / 3600) });
	let i = Math.round(r / 86400);
	return i === 1 ? L(e, "day_ago") : L(e, "days_ago", { n: i });
}
function Ze(e, t) {
	return t === null ? L(e, "unknown") : t < 3600 ? L(e, "every_minutes", { n: Math.max(1, Math.round(t / 60)) }) : t < 172800 ? L(e, "every_hours", { n: Math.round(t / 3600) }) : L(e, "every_days", { n: Math.round(t / 86400) });
}
function Qe(e) {
	let t = e.filter((e) => e !== null && e > 0).sort((e, t) => e - t);
	if (!t.length) return e.map((e) => e === null ? null : 0);
	let n = t[Math.min(t.length - 1, Math.floor(t.length * .9))] ?? 1;
	return e.map((e) => e === null ? null : Math.min(1, e / n));
}
var $e = /* @__PURE__ */ new Map();
function et(e) {
	let t = e ?? "", n = $e.get(t);
	if (n) return n;
	let r = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		hourCycle: "h23",
		...W(e)
	});
	return $e.set(t, r), r;
}
var tt = /* @__PURE__ */ new Map();
function nt(e) {
	if (!e) return;
	let t = tt.get(e);
	if (t === void 0) {
		try {
			new Intl.DateTimeFormat("en-US", { timeZone: e }), t = !0;
		} catch {
			t = !1;
		}
		tt.set(e, t);
	}
	return t ? e : void 0;
}
function W(e) {
	let t = nt(e);
	return t ? { timeZone: t } : {};
}
function rt(e, t) {
	let n = {
		year: 1970,
		month: 1,
		day: 1,
		hour: 0,
		minute: 0
	};
	for (let r of et(t).formatToParts(/* @__PURE__ */ new Date(e * 1e3))) {
		let e = Number(r.value);
		r.type === "year" ? n.year = e : r.type === "month" ? n.month = e : r.type === "day" ? n.day = e : r.type === "hour" ? n.hour = e % 24 : r.type === "minute" && (n.minute = e);
	}
	return n;
}
function G(e, t) {
	let n = rt(e, t);
	return Date.UTC(n.year, n.month - 1, n.day) / 864e5;
}
function it(e, t) {
	let n = rt(e, t);
	return n.hour + n.minute / 60;
}
function at(e) {
	return ot(e.day_starts, e.strip_start, e.strip_days);
}
function ot(e, t, n) {
	return Array.isArray(e) && e.length === n + 1 && e.every((t, n) => typeof t == "number" && (n === 0 || t > e[n - 1])) ? e.filter((e) => typeof e == "number") : Array.from({ length: n + 1 }, (e, n) => t + n * 86400);
}
function st(e, t, n) {
	let r = new Intl.DateTimeFormat(e, {
		weekday: "short",
		...W(n)
	}), i = Math.max(0, t.length - 1);
	return Array.from({ length: i }, (n, a) => a === i - 1 ? L(e, "today") : r.format(/* @__PURE__ */ new Date(((t[a] ?? 0) + (t[a + 1] ?? 0)) / 2 * 1e3)));
}
function ct(e) {
	return `repeat(${Math.max(1, e.length - 1)}, minmax(0, 1fr))`;
}
function lt(e, t) {
	let n = t.length - 1, r = t[0];
	if (n <= 0 || r === void 0 || e < r) return -1;
	for (let r = 0; r < n; r++) {
		let n = t[r] ?? 0, i = t[r + 1] ?? n;
		if (e < i) {
			let t = (i - n) / 12;
			return r * 12 + Math.min(11, Math.floor((e - n) / t));
		}
	}
	return n * 12;
}
function ut(e, t) {
	let n = t.length - 1, r = t[0];
	if (n <= 0 || r === void 0 || e <= r) return 0;
	for (let r = 0; r < n; r++) {
		let i = t[r] ?? 0, a = t[r + 1] ?? i;
		if (e < a) return (r + (e - i) / (a - i)) / n;
	}
	return 1;
}
function dt(e, t, n, r) {
	let i = t - e;
	if (i <= 0) return [];
	let a = /* @__PURE__ */ new Map();
	for (let o = e; o < t; o += 3600) {
		let t = Math.round(it(o, r));
		n.includes(t) && !a.has(t) && a.set(t, (o - e) / i);
	}
	return n.flatMap((e) => {
		let t = a.get(e);
		return t === void 0 ? [] : [t];
	});
}
function ft(e, t, n) {
	return new Intl.DateTimeFormat(e, {
		day: "numeric",
		month: "long",
		year: "numeric",
		...W(n)
	}).format(/* @__PURE__ */ new Date(t * 1e3));
}
function pt(e) {
	if (e === "12" || e === "am_pm") return "12";
	if (e === "24") return "24";
}
function mt(e, t, n, r, i) {
	let a = Math.abs(G(n, r) - G(t, r)), o = a === 0 ? {} : a < 6 ? { weekday: "short" } : {
		day: "2-digit",
		month: "2-digit"
	}, s = i ? { hourCycle: i === "12" ? "h12" : "h23" } : {};
	return new Intl.DateTimeFormat(e, {
		...o,
		hour: "numeric",
		minute: "2-digit",
		...s,
		...W(r)
	}).format(/* @__PURE__ */ new Date(t * 1e3));
}
function ht(e, t) {
	return Math.abs(t) >= 1e3 ? L(e, "unit_volt", { value: new Intl.NumberFormat(e, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(t / 1e3) }) : L(e, "unit_millivolt", { value: Math.round(t) });
}
function gt(e) {
	let t = e.trim();
	return !t || t.includes("#") || t.includes("+") || t.startsWith("/") || t.endsWith("/") ? null : t;
}
function _t(e, t) {
	return U(e).filter((e) => e.id !== t.id).sort((e, t) => e.name.localeCompare(t.name));
}
function vt(e, t) {
	let n = t.trim().toLowerCase();
	return n ? e.filter((e) => [
		e.name,
		e.area,
		e.manufacturer,
		e.model
	].some((e) => e?.toLowerCase().includes(n))) : e;
}
var yt = [
	"failed",
	"check",
	"watch",
	"learning",
	"ok"
];
function bt(e, t, n, r) {
	return t === "none" ? [{
		area: "",
		devices: [...e].sort((e, t) => e.name.localeCompare(t.name))
	}] : t === "area" ? Ye(e, r) : yt.map((t) => ({
		area: L(n, qe(t)),
		devices: U(e).filter((e) => e.status === t).sort((e, t) => e.name.localeCompare(t.name))
	})).filter((e) => e.devices.length > 0);
}
function xt(e) {
	let t = [];
	for (let e = 0; e < 1440; e += 30) t.push(`${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`);
	return e && !t.includes(e) && t.push(e), t.sort();
}
function St(e) {
	let t = null;
	for (let n of e) {
		let e = n.battery.replaced.at(-1);
		e !== void 0 && (t === null || e > t.at) && (t = {
			device: n,
			at: e
		});
	}
	return t;
}
function Ct(e, t) {
	return e > 120 || e > 24 && t > .5;
}
function wt(e, t = []) {
	return U(e).filter((e) => t.includes(e.id) || e.battery.flag && e.battery.low || z[e.status] >= 1 && (e.reason_key ?? "").startsWith("battery")).sort((e, t) => e.name.localeCompare(t.name));
}
function Tt(e, t, n = []) {
	return t === null ? e : t === "ignored" ? e.filter((e) => e.ignored) : t === "important" ? U(e).filter((e) => e.critical) : t === "battery" ? wt(e, n) : t === "mains" ? U(e).filter((e) => e.mains) : U(e).filter((e) => e.status === t);
}
function Et(e) {
	return U(e).filter((e) => e.critical).length;
}
function Dt(e, t, n, r) {
	let i = G(n, r) - G(t, r);
	if (i === 0) return L(e, "today_cap");
	if (i === 1) return L(e, "yesterday_cap");
	let a = rt(t, r).year === rt(n, r).year;
	return new Intl.DateTimeFormat(e, {
		day: "numeric",
		month: "short",
		...a ? {} : { year: "numeric" },
		...W(r)
	}).format(/* @__PURE__ */ new Date(t * 1e3));
}
function Ot(e) {
	return !e.ignored && z[e.status] >= 2;
}
var kt = /* @__PURE__ */ new Set(["battery_low", "battery_low_flag"]);
function At(e) {
	let t = e.battery, n = t.flag && t.low || t.trusted && t.level !== null && t.level <= 20;
	return kt.has(e.reason_key ?? "") || n;
}
function jt(e, t) {
	return t === e.critical_auto ? null : t;
}
function Mt(e, t) {
	return t.length ? {
		label: L(e, t.length === 1 ? "battery_low_one" : "battery_low_many", { count: t.length }),
		value: t.join(", "),
		tone: "warn"
	} : {
		label: L(e, "battery_none_low"),
		value: "",
		tone: "ok"
	};
}
function Nt(e) {
	return e?.is_admin === !0;
}
function Pt(e) {
	return e.silence_from === void 0 ? e.last_activity : e.silence_from;
}
function Ft(e) {
	return typeof e.silence_start == "number" ? e.silence_start : Pt(e);
}
function It(e) {
	return typeof e.strays == "number" && e.strays > 0 ? e.strays : 0;
}
function Lt(e) {
	return !e.ignored && e.reason_key === "waiting_first";
}
var Rt = /* @__PURE__ */ new Set([
	"silent",
	"silent_new",
	"unavailable",
	"unavailable_usual",
	"partner",
	"radio_only"
]), zt = /* @__PURE__ */ new Set(["silent", "silent_new"]);
function Bt(e, t) {
	let n = Math.max(0, t);
	if (Math.round(n / 60) < 60) return L(e, "span_minutes", { n: Math.max(1, Math.round(n / 60)) });
	if (Math.round(n / 3600) < 48) {
		let t = Math.round(n / 3600);
		return t <= 1 ? L(e, "span_hour") : L(e, "span_hours", { n: t });
	}
	let r = Math.round(n / 86400);
	return r <= 1 ? L(e, "span_day") : L(e, "span_days", { n: r });
}
function Vt(e, t, n, r) {
	let i = G(n, r) - G(t, r);
	return i === 1 ? L(e, "yesterday") : i >= 2 && i <= 6 ? new Intl.DateTimeFormat(e, {
		weekday: "long",
		...W(r)
	}).format(/* @__PURE__ */ new Date(t * 1e3)) : null;
}
function K(e) {
	return !e.ignored && z[e.status] >= 1 && Ft(e) !== null && zt.has(e.reason_key ?? "");
}
function Ht(e) {
	return z[e.status] >= 1 && Rt.has(e.reason_key ?? "");
}
function Ut(e, t, n, r = "") {
	return {
		line1: e,
		line1Short: e,
		line2: t,
		line2Short: t,
		tone: n,
		sub: r
	};
}
function Wt(e, t) {
	let n = U(t), r = n.filter((e) => e.status !== "learning");
	if (!n.length) return Ut(L(e, "hero_none1"), L(e, "hero_none2"), "accent");
	if (!r.length) return Ut(L(e, "hero_learn1"), L(e, "hero_learn2"), "accent");
	let i = r.filter(Ht).length, a = r.length - i, o = Je(r), s = o.some((e) => e.status === "failed") ? "crit" : "warn";
	if (r.length === 1) {
		let t = L(e, "hero_one");
		return o.length ? Ut(t, L(e, "hero_need_one"), s) : Ut(t, L(e, i ? "hero_beat_off" : "hero_beat_one"), i ? "plain" : "accent");
	}
	let c = L(e, "hero_sub", {
		ok: a,
		total: r.length
	});
	if (o.length) {
		let t = o.length === 1;
		return Ut(t ? L(e, "hero_need1_one") : L(e, "hero_need1", { count: o.length }), L(e, t ? "hero_need_one" : "hero_need"), s, c);
	}
	let l = L(e, "hero_beat"), u = L(e, "hero_beat_short");
	if (!i) {
		let t = L(e, "hero_all", { count: r.length });
		return {
			line1: t,
			line1Short: t,
			line2: l,
			line2Short: u,
			tone: "accent",
			sub: ""
		};
	}
	return {
		line1: L(e, "hero_some", {
			ok: a,
			total: r.length
		}),
		line1Short: L(e, "hero_some_short", {
			ok: a,
			total: r.length
		}),
		line2: l,
		line2Short: u,
		tone: "plain",
		sub: ""
	};
}
var Gt = "\0";
function q(e, t, n, r) {
	let [i = "", a = ""] = L(e, t, {
		...r,
		name: Gt
	}).split(Gt);
	return {
		before: i,
		name: n.name,
		after: a,
		tone: B(n.status)
	};
}
function Kt(e, t, n, r) {
	let i = U(t).filter((e) => z[e.status] >= 1 && !H(e)).sort((e, t) => z[t.status] - z[e.status] || e.name.localeCompare(t.name)), a = U(t), o = a.filter((e) => e.status === "learning").length, s = o ? qt(e, o) : "";
	if (!i.length) return {
		mentions: [],
		more: 0,
		text: o > 0 && o === a.length ? L(e, "sent_learning") : [o < a.length ? L(e, "sent_all_good") : "", s].filter(Boolean).join(" ")
	};
	let c = i.slice(0, 2).map((t) => {
		let i = t.reason_key ?? "", a = Ft(t);
		if (zt.has(i) && a !== null && It(t) > 0) {
			let i = Vt(e, a, n, r), o = Xe(e, t.last_activity, n).replace(/\.$/, "");
			return i ? q(e, "sent_strays_since", t, {
				day: i,
				last: o
			}) : q(e, "sent_strays_for", t, {
				span: Bt(e, n - a),
				last: o
			});
		}
		if (zt.has(i) && a !== null) {
			let i = Vt(e, a, n, r);
			return i ? q(e, "sent_silent_since", t, { day: i }) : q(e, "sent_silent_for", t, { span: Bt(e, n - a) });
		}
		return i === "waiting_first" ? q(e, "sent_waiting", t, {}) : i === "battery_low" ? q(e, "sent_battery_low", t, {}) : i === "battery_soon" ? q(e, "sent_battery", t, {}) : i === "unavailable" || i === "unavailable_usual" ? q(e, "sent_unavailable", t, {}) : i === "startup_waiting" ? q(e, "sent_startup", t, {}) : i === "radio_only" ? q(e, "sent_radio_only", t, {}) : i === "battery_missing" ? q(e, "sent_battery_missing", t, {}) : i === "partner" ? q(e, "sent_partner", t, { partner: t.partner_name ?? "" }) : q(e, "sent_other", t, { reason: t.reason });
	}), l = i.length - c.length;
	return {
		mentions: c,
		more: l,
		text: [l ? L(e, "sent_more", { count: l }) : "", s].filter(Boolean).join(" ")
	};
}
function qt(e, t) {
	return t === 1 ? L(e, "learning_one") : L(e, "learning_many", { count: t });
}
var Jt = {
	need: "group_need",
	watch: "group_watch",
	rhythm: "group_rhythm",
	learning: "group_learning"
};
function Yt(e) {
	return Jt[e];
}
function Xt(e) {
	let t = U(e), n = (e, t) => e.name.localeCompare(t.name);
	return [
		{
			key: "need",
			devices: Je(t)
		},
		{
			key: "watch",
			devices: t.filter((e) => e.status === "watch" || H(e)).sort(n)
		},
		{
			key: "rhythm",
			devices: t.filter((e) => e.status === "ok").sort(n)
		},
		{
			key: "learning",
			devices: t.filter((e) => e.status === "learning").sort(n)
		}
	].filter((e) => e.devices.length > 0);
}
function Zt(e, t, n) {
	let r = Ft(t);
	return !K(t) || r === null ? null : L(e, It(t) ? "flag_strays" : "flag_silent", { span: Bt(e, n - r) });
}
function Qt(e, t, n) {
	return t.ignored ? "" : Zt(e, t, n) || (Lt(t) ? L(e, "pill_waiting") : t.status === "learning" ? L(e, "pill_learning") : "");
}
function $t(e, t, n) {
	if (t.ignored) return {
		text: L(e, "ignored"),
		tone: "muted"
	};
	if (H(t)) return {
		text: L(e, "status_cloud"),
		tone: "muted"
	};
	if (Lt(t)) return {
		text: L(e, "status_waiting"),
		tone: "warn"
	};
	let r = t.battery.level;
	if (t.status === "watch" && t.reason_key?.startsWith("battery") && r !== null) return {
		text: L(e, "status_battery", { level: Math.round(r) }),
		tone: "warn"
	};
	if (z[t.status] >= 1) return {
		text: L(e, qe(t.status)),
		tone: B(t.status)
	};
	if (t.status === "learning") return {
		text: L(e, "status_learning"),
		tone: "muted"
	};
	let i = t.battery.replaced.at(-1);
	return i !== void 0 && n - i < 172800 ? {
		text: L(e, "new_battery"),
		tone: "ok"
	} : null;
}
function en(e, t) {
	if (t <= 0 || e.length <= t) return e;
	let n = Math.ceil(e.length / t), r = [];
	for (let t = 0; t < e.length; t += n) {
		let i = e.slice(t, t + n);
		r.push(i.every((e) => e === null) ? null : i.reduce((e, t) => e + (t ?? 0), 0));
	}
	return r;
}
function tn(e) {
	let [t = "0", n = "0"] = e.split(":");
	return Number(t) + Number(n) / 60;
}
function nn(e, t) {
	let n = tn(e), r = tn(t);
	return n === r ? [] : n < r ? [[n, r]] : [[0, r], [n, 24]];
}
function rn(e, t, n) {
	if (t.ignored) return {
		text: L(e, "dh_ignored"),
		tone: "muted"
	};
	let r = t.reason_key ?? "", i = Ft(t);
	return K(t) && i !== null ? {
		text: z[t.status] >= 2 ? L(e, It(t) ? "dh_strays" : "dh_silent", { span: Bt(e, n - i) }) : L(e, "dh_watch"),
		tone: B(t.status)
	} : H(t) ? {
		text: L(e, "dh_cloud"),
		tone: "muted"
	} : Lt(t) ? {
		text: L(e, "dh_waiting"),
		tone: "warn"
	} : r === "startup_waiting" ? {
		text: L(e, "dh_startup"),
		tone: "warn"
	} : r === "radio_only" ? {
		text: L(e, "dh_radio_only"),
		tone: B(t.status)
	} : r === "battery_missing" ? {
		text: L(e, "dh_battery_missing"),
		tone: B(t.status)
	} : r === "unavailable" || r === "unavailable_usual" ? {
		text: L(e, "dh_unavailable"),
		tone: B(t.status)
	} : r === "partner" ? {
		text: L(e, "dh_partner"),
		tone: B(t.status)
	} : r.startsWith("battery") && t.battery.level !== null ? {
		text: L(e, "dh_battery", { level: Math.round(t.battery.level) }),
		tone: B(t.status)
	} : t.status === "learning" ? {
		text: L(e, "dh_learning"),
		tone: "muted"
	} : {
		text: L(e, "dh_ok"),
		tone: "accent"
	};
}
function an(e, t, n, r, i) {
	return K(t) && t.typical !== null && t.last_activity !== null ? L(e, "detail_every", {
		every: Ze(e, t.typical).replace(/\.$/, ""),
		when: mt(e, t.last_activity, n, r, i)
	}) : t.status === "learning" && !t.ignored ? L(e, "learning_hint") : t.reason;
}
function on(e, t, n) {
	return K(t) && !Ht(n) ? L(e, "partner_quiet", {
		partner: n.name,
		name: t.name
	}) : !Ht(t) && !Ht(n) ? L(e, "partner_both") : "";
}
function sn(e) {
	return Array.isArray(e) && e.length === 2 && typeof e[0] == "number" && typeof e[1] == "number";
}
function cn(e) {
	return Array.isArray(e) ? e.filter(sn) : [];
}
function ln(e, t) {
	return t.length < 2 ? [] : e.map(([e, n]) => [ut(e, t), ut(n, t)]).filter(([e, t]) => t > e);
}
function un(e) {
	return Array.isArray(e) && e.every((e) => e === null || typeof e == "number");
}
function dn(e) {
	return Array.isArray(e) && e.every(un);
}
function fn(e) {
	if (typeof e != "object" || !e) return null;
	let t = Reflect.get(e, "start"), n = Reflect.get(e, "days"), r = Reflect.get(e, "bin_minutes"), i = Reflect.get(e, "devices");
	if (typeof t != "number" || typeof n != "number" || typeof r != "number" || r <= 0 || typeof i != "object" || !i) return null;
	let a = {};
	for (let [e, t] of Object.entries(i)) dn(t) && (a[e] = t);
	return {
		start: t,
		days: n,
		binMinutes: r,
		dayStarts: ot(Reflect.get(e, "day_starts"), t, n),
		devices: a,
		noData: cn(Reflect.get(e, "no_data"))
	};
}
function pn(e, t, n) {
	let r = n * 60, i = [];
	return t <= 0 || e.forEach((e, n) => {
		e && i.push({
			at: (n + .5) * r / t,
			count: e
		});
	}), i;
}
function mn(e) {
	return e >= 3 ? 22 : e === 2 ? 18 : 12;
}
var hn = 2;
function gn(e, t) {
	let n = Pt(e);
	if (!K(e) || n === null || t.length < 2) return -1;
	if (typeof e.silence_start == "number") {
		let n = lt(e.silence_start, t);
		return n < 0 ? 0 : n + 1;
	}
	let r = t.length - 1, i = ((t[r] ?? 0) - (t[0] ?? 0)) / (r * 12), a = lt(n, t);
	if (a < 0) return 0;
	let o = [];
	e.strip.forEach((e, t) => {
		e && t <= a && o.push(t);
	});
	let s = Math.max(3, Math.ceil(3 * (e.typical ?? 0) / i));
	for (let e = o.length - 2; e >= 0 && o.length - 1 - e <= hn; e--) {
		let t = o[e], n = o[e + 1];
		if (t === void 0 || n === void 0) break;
		if (n - t - 1 >= s) return t + 1;
	}
	return a + 1;
}
function _n(e, t, n, r) {
	let i = Pt(e);
	if (!K(e) || i === null) return -1;
	let a = r * 60, o = -1;
	return t.forEach((e, t) => {
		let r = n[t], i = n[t + 1];
		r !== void 0 && i !== void 0 && e.forEach((e, t) => {
			e && (o = Math.max(o, Math.min(i, r + (t + 1) * a)));
		});
	}), Math.max(i, o);
}
var vn = {
	now: "set_level_now",
	daily: "set_level_daily",
	off: "set_level_off"
};
function yn(e, t) {
	let n = t.quiet;
	return [L(e, "day_line_summary", { time: t.summary_time }), n.enabled ? L(e, "day_line_quiet", {
		start: n.start,
		end: n.end
	}) : L(e, "day_line_no_quiet")].join(" · ");
}
function bn(e) {
	let t = Reflect.get(e.arrive_home, "persons");
	if (Array.isArray(t)) return t.filter((e) => typeof e == "string");
	let n = Reflect.get(e.arrive_home, "person");
	return typeof n == "string" ? [n] : [];
}
function xn(e, t) {
	let n = t.quiet, r = {
		failed: "set_failed",
		check: "set_check",
		battery: "set_battery"
	}, i = /* @__PURE__ */ new Map();
	for (let n of [
		"failed",
		"check",
		"battery"
	]) {
		let a = t.levels[n];
		i.set(a, [...i.get(a) ?? [], L(e, r[n])]);
	}
	let a = new Intl.ListFormat(e, { type: "conjunction" }), o = [...i].map(([t, n]) => L(e, "set_group", {
		names: a.format(n),
		level: L(e, vn[t])
	})).join(", "), s = `${o.charAt(0).toUpperCase()}${o.slice(1)}.`;
	return {
		line1: L(e, "set_head", { time: t.summary_time }),
		line2: n.enabled ? L(e, "set_quiet", {
			start: n.start,
			end: n.end
		}) : L(e, "set_no_quiet"),
		sub: s
	};
}
function Sn(e, t, n) {
	let r = t > e ? [[e, t]] : [];
	for (let [e, t] of n) r = r.flatMap(([n, r]) => {
		if (t <= n || e >= r) return [[n, r]];
		let i = [];
		return e > n && i.push([n, e]), t < r && i.push([t, r]), i;
	});
	return r;
}
var Cn = {
	too_short: "forecast_too_short",
	flat: "forecast_flat",
	coarse: "forecast_coarse",
	untrusted: "forecast_untrusted",
	noisy: "forecast_noisy"
};
function wn(e, t, n) {
	if (!t) return n && n in Cn ? L(e, Cn[n]) : "";
	let r = Math.max(0, Math.min(t.days_min, t.days_max)), i = Math.max(t.days_min, t.days_max);
	if (i <= 10) return L(e, "forecast_days");
	let a = (e) => {
		let t = Math.max(1, Math.floor(r / e));
		return {
			lo: t,
			hi: Math.max(t + 1, Math.ceil(i / e))
		};
	};
	return i <= 70 ? L(e, "forecast_weeks", a(7)) : i <= 540 ? L(e, "forecast_months", a(30.44)) : L(e, "forecast_years", a(365.25));
}
function Tn(e, t) {
	if (!t?.length) return "";
	let n = /* @__PURE__ */ new Map(), r = [];
	for (let e of t) e.type ? n.set(e.type, (n.get(e.type) ?? 0) + Math.max(1, e.count ?? 1)) : r.push(e.name);
	let i = [...n.entries()].sort(([e, t], [n, r]) => r - t || e.localeCompare(n)).map(([t, n]) => L(e, "battery_count_type", {
		count: n,
		type: t
	}));
	return r.length && i.push(L(e, "due_untyped", { names: r.join(", ") })), L(e, "due_line", { items: i.join(", ") });
}
function En(e) {
	let t = e.replaceAll("_", " ").trim();
	return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}` : e;
}
function Dn(e, t) {
	return (t ?? []).filter((e) => e.count > 0).map((t) => L(e, t.count === 1 ? "cloud_outage_one" : "cloud_outage_many", {
		name: En(t.integration),
		count: t.count
	}));
}
function On(e) {
	return e.partner || e.ignored ? [] : (e.partner_suggestions ?? []).slice(0, 1);
}
var kn = 2e3, An = 6e4;
function jn(e) {
	return Math.min(Math.max(e, kn) * 2, An);
}
var Mn = " · ";
function Nn(e, t, n) {
	return e.replace(/\{(\w+)\}/g, (e, r) => n.includes(r) ? t[r] ?? "" : e).split("\n").map((e) => e.split(Mn).filter((e) => e.trim()).join(Mn)).join("\n").trim();
}
function Pn(e) {
	if (!e) return {};
	let t = e.area && !e.name.toLocaleLowerCase().includes(e.area.toLocaleLowerCase()) ? e.area : null;
	return {
		name: e.name,
		area: t,
		reason: e.reason,
		model: e.model,
		manufacturer: e.manufacturer,
		integration: e.integration
	};
}
//#endregion
//#region src/styles.ts
var J = o`
  :host {
    --pu-accent: var(--pulse-accent, var(--pulse-accent-default, #6d5dfc));
    --pu-accent-hi: var(--pulse-accent-hi, var(--pulse-accent-hi-default, #a99fff));
    /* Flächen-Akzent für Knöpfe mit weißer Schrift (≥ 4,5:1); dunkel setzt das Panel #6f5cff */
    --pu-accent-fill: var(--pulse-accent-fill, var(--pulse-accent-fill-default, var(--pu-accent)));
    --pu-ok: var(--success-color, #43a047);
    --pu-warn: var(--warning-color, #ffa600);
    --pu-crit: var(--error-color, #db4437);
    --pu-muted: var(--secondary-text-color);
    --pu-line: var(--divider-color, rgba(127, 127, 127, 0.2));
    --pu-card: var(--card-background-color, var(--ha-card-background, #fff));
    --pu-fill: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
    --pu-track: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
    /* Segment aktiv und Blatt: das Panel setzt im Dunkelmodus hellere Flächen (iOS „erhöht“) */
    --pu-raised: var(--pulse-raised, var(--pu-card));
    --pu-ink: var(--primary-text-color);
    --pu-faint: color-mix(in srgb, var(--secondary-text-color) 82%, transparent);
    /* Neutrale Balken bei Problemgeräten: Farbe nur am Problem selbst */
    --pu-neutral: color-mix(in srgb, var(--pu-ink) 35%, transparent);
    --pu-warn-text: var(
      --pulse-warn-text,
      color-mix(in srgb, var(--pu-warn) 55%, var(--primary-text-color))
    );
    --pu-crit-text: color-mix(in srgb, var(--pu-crit) 88%, var(--primary-text-color));
    --pu-ok-text: color-mix(in srgb, var(--pu-ok) 72%, var(--primary-text-color));
    /* 0 % = kein Leuchten (hell); das Panel setzt dunkel 55 % */
    --pu-glow-strength: var(--pulse-glow-strength, 0%);
    --pu-mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
    --pu-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', var(--ha-font-family-body, Roboto), system-ui, sans-serif;
    --pu-grad-text: var(--pulse-grad-text, linear-gradient(90deg, #5b4bf0, #8676ff));
    /* Schriftgrößen (Minimum 11 px) */
    --pu-fs-11: 11px;
    --pu-fs-13: 13px;
    --pu-fs-15: 15px;
    --pu-fs-17: 17px;
    --pu-fs-20: 20px;
    --pu-fs-28: 28px;
    --pu-fs-42: 42px;
    --pu-fs-56: 56px;
    /* Abstände und Radien */
    --pu-sp-4: 4px;
    --pu-sp-8: 8px;
    --pu-sp-12: 12px;
    --pu-sp-16: 16px;
    --pu-sp-24: 24px;
    --pu-sp-32: 32px;
    --pu-sp-48: 48px;
    --pu-r-8: 8px;
    --pu-r-12: 12px;
    --pu-r-20: 20px;
    --pu-r-full: 999px;
    /* Gemeinsame Spalten der Monitor-Zeilen (Übersicht + Geräte): Name | Leiste | Status · Zeit */
    --pu-col-name: minmax(0, 320px);
    --pu-col-state: 210px;
    --pu-col-gap: clamp(12px, 2.2cqi, 24px);
    /* Touch-Ziele: auf dem Handy mindestens 44 px (Apple HIG) */
    --pu-hit: 36px;
  }
  @media (pointer: coarse), (max-width: 600px) {
    :host {
      --pu-hit: 44px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :host *,
    :host *::before,
    :host *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`, Y = o`
  /* FLODEs Pillen-Knopf (.save) – .primary mit Akzent-Verlauf */
  .pbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: var(--pu-hit);
    padding: 0 16px;
    border: 0;
    border-radius: calc(var(--pu-hit) / 2);
    font: inherit;
    font-size: var(--pu-fs-15);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    color: var(--primary-text-color);
    background: var(--pu-fill);
    --mdc-icon-size: 18px;
    -webkit-tap-highlight-color: transparent;
    transition: filter 0.15s, transform 0.1s;
  }
  /* Hover nur mit Maus – auf Touch bliebe er nach dem Tippen hängen */
  @media (hover: hover) {
    .pbtn:hover {
      filter: brightness(1.06);
    }
    button.row:hover,
    .row.tappable:hover {
      background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
    }
  }
  .pbtn:active {
    transform: scale(0.98);
  }
  /* Einfarbig: weiße Schrift auf dem Flächen-Akzent bleibt in hell und dunkel ≥ 4,5:1 */
  .pbtn.primary {
    color: #fff;
    background: var(--pu-accent-fill);
  }
  .pbtn:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--pu-accent) 45%, transparent);
    outline-offset: 2px;
  }
  /* Abschnitt einer Inset-Liste */
  .section {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .section-title {
    margin: 0;
    padding: 0 2px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--pu-muted);
  }
  .section-foot {
    margin: 0;
    padding: 0 2px;
    font-size: var(--pu-fs-13);
    line-height: 1.4;
    color: var(--pu-muted);
  }
  .list {
    border: 1px solid var(--pu-line);
    border-radius: var(--pu-r-20);
    background: var(--pu-card);
    overflow: hidden;
  }
  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: max(48px, var(--pu-hit));
    padding: 6px 16px;
    box-sizing: border-box;
    width: 100%;
    border: 0;
    background: none;
    color: var(--primary-text-color);
    font: inherit;
    font-size: var(--pu-fs-15);
    text-align: start;
  }
  /* Trennlinie eingerückt wie in iOS (beginnt am Text, nicht am Rand) */
  .row + .row::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    left: var(--inset, 16px);
    border-top: 1px solid var(--pu-line);
  }
  /* Zeilen mit 20-px-Symbol: Trennlinie beginnt am Text (16 + 20 + 12) */
  .row.has-icon {
    --inset: 48px;
  }
  .row > .ico {
    flex: none;
    color: var(--pu-muted);
    --mdc-icon-size: 20px;
  }
  .row > .ico.t-crit {
    color: var(--pu-crit-text);
  }
  .row > .ico.t-warn {
    color: var(--pu-warn-text);
  }
  button.row,
  .row.tappable {
    cursor: pointer;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  button.row:active,
  .row.tappable:active {
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  }
  button.row:focus-visible {
    outline: 2px solid var(--pu-accent);
    outline-offset: -2px;
  }
  .row .label {
    flex: 1;
    min-width: 0;
    display: grid;
  }
  .row .label small {
    font-size: var(--pu-fs-13);
    line-height: 1.35;
    color: var(--pu-muted);
    text-wrap: pretty;
  }
  /* Schalter in tippbaren Zeilen: die Zeile schaltet, der Schalter zeigt nur an */
  .row.tappable ha-switch {
    pointer-events: none;
  }
  .row .value {
    flex: none;
    max-width: 55%;
    color: var(--pu-muted);
    text-align: end;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row .chev {
    flex: none;
    margin-inline-end: -6px;
    color: var(--pu-muted);
    --mdc-icon-size: 20px;
  }
  .row.action {
    color: var(--pu-accent);
    font-weight: 500;
  }
  .muted {
    color: var(--pu-muted);
  }
`, X = o`
  .grad {
    background: var(--pu-grad-text);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .cap {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--pu-muted);
  }
  /* Mono nur für Achsen; Zeiten in Systemschrift mit gleich breiten Ziffern */
  .mono {
    font-family: var(--pu-mono);
    font-variant-numeric: tabular-nums;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .t-crit {
    color: var(--pu-crit-text);
  }
  .t-warn {
    color: var(--pu-warn-text);
  }
  .t-ok {
    color: var(--pu-ok-text);
  }
  .t-muted {
    color: var(--pu-muted);
  }
`, Fn = o`
  .axis,
  .rowgrid {
    display: grid;
    grid-template-columns: var(--pu-col-name) minmax(0, 1fr) var(--pu-col-state);
    gap: var(--pu-col-gap);
    align-items: center;
  }
  .axis {
    padding: var(--pu-sp-12) 0 2px;
    font-size: var(--pu-fs-11);
    color: var(--pu-faint);
  }
  .axis .days {
    display: grid;
    text-align: center;
  }
  /* Heute hervorgehoben */
  .axis .days span:last-child {
    color: var(--pu-ink);
    font-weight: 600;
  }
  .axis .right {
    text-align: end;
  }
  .grp {
    display: flex;
    gap: var(--pu-sp-8);
    padding: var(--pu-sp-24) 0 var(--pu-sp-8);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--pu-muted);
  }
  .grp .count::before {
    content: '· ';
  }
  .nm {
    display: flex;
    align-items: center;
    gap: var(--pu-sp-12);
    min-width: 0;
  }
  .nm > ha-icon {
    flex: none;
    color: var(--pu-muted);
    --mdc-icon-size: 20px;
  }
  /* Name immer in Textfarbe – die Statusfarbe steht höchstens am Symbol */
  .nm > ha-icon.t-crit {
    color: var(--pu-crit-text);
  }
  .nm > ha-icon.t-warn {
    color: var(--pu-warn-text);
  }
  /* Name (+ Stern) und Raum: nebeneinander, auf dem Handy untereinander */
  .who {
    display: flex;
    align-items: center;
    gap: var(--pu-sp-12);
    min-width: 0;
  }
  .title {
    display: inline-flex;
    align-items: center;
    gap: var(--pu-sp-4);
    flex: 0 0 auto;
    min-width: 0;
    max-width: 100%;
  }
  /* Wichtiges Gerät: kleiner Stern in Akzentfarbe hinter dem Namen */
  .star {
    display: inline-flex;
    flex: none;
    color: var(--pu-accent);
    --mdc-icon-size: 14px;
  }
  /* Erst weicht der Raum, dann der Name */
  .nm b {
    flex: 0 1 auto;
    max-width: 100%;
    min-width: 0;
    font-size: var(--pu-fs-15);
    font-weight: 600;
    color: var(--pu-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Lange Raumnamen zweizeilig statt abgeschnitten */
  .room {
    flex: 0 100 auto;
    min-width: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    hyphens: auto;
    font-size: var(--pu-fs-13);
    line-height: 1.25;
    color: var(--pu-faint);
  }
  .st {
    min-width: 0;
    font-size: var(--pu-fs-13);
    color: var(--pu-muted);
    text-align: end;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .st b {
    font-weight: 600;
  }
  @container (max-width: 860px) {
    .monitor {
      --pu-col-name: minmax(160px, 30%);
      --pu-col-state: minmax(90px, 18%);
    }
    .room,
    .st .sep,
    .st b + .sep + .time {
      display: none;
    }
  }
  @container (max-width: 600px) {
    .axis {
      grid-template-columns: minmax(0, 1fr);
    }
    .axis > span {
      display: none;
    }
    .rowgrid {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--pu-sp-8) var(--pu-sp-12);
      padding: var(--pu-sp-12) 0 18px;
    }
    .rowgrid pulse-rhythm {
      grid-column: 1 / -1;
      grid-row: 2;
      --rhythm-height: 22px;
    }
    .nm > ha-icon {
      display: none;
    }
    /* Raum klein unter dem Namen */
    .who {
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .room {
      display: block;
      white-space: nowrap;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .nm b {
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .grp {
      justify-content: space-between;
    }
    .grp .count::before {
      content: none;
    }
  }
`, In = [
	{
		icon: "mdi:chart-timeline-variant",
		title: "welcome_rhythm_title",
		text: "welcome_rhythm_text"
	},
	{
		icon: "mdi:ear-hearing",
		title: "welcome_listen_title",
		text: "welcome_listen_text"
	},
	{
		icon: "mdi:bell-badge-outline",
		title: "welcome_notify_title",
		text: "welcome_notify_text"
	}
], Ln = [{
	icon: "mdi:power-plug-outline",
	title: "new_mains_title",
	text: "new_mains_text"
}], Rn = "https://github.com/SH1FT-W/pulse/blob/main/CHANGELOG.md";
I("pulse-welcome", class extends N {
	static {
		this.properties = {
			language: { type: String },
			mode: { attribute: !1 },
			version: { type: String },
			zigbee: { type: String }
		};
	}
	constructor() {
		super(), this.language = "en", this.mode = null, this.version = "", this.zigbee = "none";
	}
	close() {
		this.mode && (this.mode = null, this.dispatchEvent(new CustomEvent("closed")));
	}
	renderZigbee() {
		let e = this.language, t = this.zigbee === "on", n = () => {
			t || this.dispatchEvent(new CustomEvent("enable-z2m"));
		};
		return E`<div
      class=${t ? "zig" : "zig tappable"}
      role=${t ? k : "switch"}
      aria-checked=${t ? k : "false"}
      tabindex=${t ? k : "0"}
      @click=${n}
      @keydown=${(e) => {
			(e.key === "Enter" || e.key === " ") && (e.preventDefault(), n());
		}}
    >
      <span><b>${L(e, "welcome_zigbee_title")}</b><small>${L(e, "welcome_zigbee_text")}</small></span>
      ${t ? E`<span class="on"><ha-icon icon="mdi:check-circle"></ha-icon>${L(e, "zigbee_active")}</span>` : E`<ha-switch tabindex="-1" aria-hidden="true"></ha-switch>`}
    </div>`;
	}
	renderEcg() {
		return E`<svg class="ecg" viewBox="0 0 390 160" aria-hidden="true">
      <defs>
        <linearGradient id="pulse-wl" x1="0" x2="1">
          <stop offset="0" stop-color="#b9b0ff"></stop>
          <stop offset="1" stop-color="#6d5dfc"></stop>
        </linearGradient>
      </defs>
      <path class="line" d="M0 80 H70 L82 40 L96 120 L108 60 L116 80 H150"></path>
      ${[
			24,
			38,
			18,
			44,
			30,
			40,
			22,
			46,
			34,
			26,
			42,
			20,
			36,
			44,
			28,
			40,
			24,
			34,
			46,
			30,
			22,
			38,
			42,
			26
		].map((e, t) => D`<rect x=${166 + t * 9.4} y=${80 - e / 2} width="4.6" height=${e} rx="2.3" fill="url(#pulse-wl)" opacity=${(1 - t / 34).toFixed(2)}></rect>`)}
      <circle class="end" cx="150" cy="80" r="6"></circle>
    </svg>`;
	}
	render() {
		if (!this.mode) return k;
		let e = this.language, t = this.mode === "welcome", n = t ? In : Ln;
		return E`<ha-dialog open @closed=${() => this.close()}>
      <div class="sheet">
        <div class="glow" aria-hidden="true"></div>
        ${this.renderEcg()}
        ${t ? E`<h2>${L(e, "welcome_head1")}<br /><span class="grad">${L(e, "welcome_head2")}</span></h2>
                <p class="lead">${L(e, "welcome_lead")}</p>` : E`<h2 class="news">${L(e, "whats_new_title", { version: this.version })}</h2>`}
        <ol>
          ${n.map((t, n) => E`<li>
              <em class="mono">${String(n + 1).padStart(2, "0")}</em>
              <span><b>${L(e, t.title)}.</b> ${L(e, t.text)}</span>
            </li>`)}
        </ol>
      </div>
      <!-- Fixed footer: switch and "Weiter" (continue) always stay visible, the text above scrolls -->
      <div slot="footer" class="foot">
        ${t && this.zigbee !== "none" ? this.renderZigbee() : k}
        <button class="go" type="button" @click=${() => this.close()}>${L(e, "continue")}</button>
        ${t ? k : E`<a class="all" href=${Rn} target="_blank" rel="noreferrer">${L(e, "whats_new_all")}</a>`}
      </div>
    </ha-dialog>`;
	}
	static {
		this.styles = [
			J,
			X,
			o`
      ha-dialog {
        /* Stage like the page: black in dark mode so the ECG glows */
        --ha-dialog-surface-background: var(--primary-background-color);
        --mdc-theme-surface: var(--primary-background-color);
        --mdc-dialog-max-width: 480px;
        --mdc-dialog-min-width: min(480px, 100vw);
      }
      .sheet {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0;
        max-width: 440px;
        margin: 0 auto;
        padding: 4px 4px 4px;
        color: var(--pu-ink);
      }
      /* The glow fades out softly towards all edges, no hard edge at the dialog border */
      .glow {
        position: absolute;
        inset: 0 0 auto;
        height: 240px;
        background: radial-gradient(
          closest-side,
          color-mix(in srgb, var(--pu-accent) 30%, transparent),
          color-mix(in srgb, var(--pu-accent) 8%, transparent) 60%,
          transparent
        );
        pointer-events: none;
      }
      .ecg {
        position: relative;
        display: block;
        width: calc(100% + 48px);
        height: auto;
        margin: 0 -24px 6px;
        overflow: visible;
      }
      .ecg .line {
        fill: none;
        stroke: url(#pulse-wl);
        stroke-width: 5;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 10px color-mix(in srgb, var(--pu-accent) 70%, transparent));
      }
      .ecg .end {
        fill: var(--card-background-color, #000);
        stroke: #b9b0ff;
        stroke-width: 3;
      }
      h2 {
        position: relative;
        margin: 0;
        font-family: var(--pu-display);
        font-size: 46px;
        font-weight: 800;
        letter-spacing: -0.025em;
        line-height: 1;
      }
      h2.news {
        font-size: 34px;
        text-wrap: balance;
      }
      .lead {
        margin: 14px 0 0;
        font-size: 17px;
        line-height: 1.42;
        letter-spacing: -0.01em;
        color: var(--pu-muted);
      }
      ol {
        list-style: none;
        margin: 22px 0 0;
        padding: 0;
        display: grid;
        gap: 14px;
      }
      li {
        display: grid;
        grid-template-columns: 32px 1fr;
        gap: 6px;
        font-size: 15px;
        line-height: 1.38;
        color: var(--pu-muted);
      }
      li em {
        font-style: normal;
        font-size: 13px;
        padding-top: 2px;
        color: var(--pu-accent);
      }
      li b {
        font-weight: 600;
        color: var(--pu-ink);
      }
      .foot {
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: 100%;
        max-width: 464px;
        margin: 0 auto;
        padding: 0 12px calc(12px + env(safe-area-inset-bottom));
        box-sizing: border-box;
      }
      .zig {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 48px;
        padding-top: 14px;
        border-top: 1px solid var(--pu-line);
      }
      .zig > span:first-child {
        flex: 1;
        display: grid;
        min-width: 0;
      }
      .zig b {
        font-size: 15px;
      }
      .zig small {
        font-size: 13px;
        color: var(--pu-muted);
      }
      .zig.tappable {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .zig.tappable ha-switch {
        pointer-events: none;
      }
      .zig:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 2px;
      }
      .on {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
        color: var(--pu-ok-text);
        --mdc-icon-size: 18px;
      }
      .go {
        width: 100%;
        min-height: 52px;
        border: 0;
        border-radius: 26px;
        /* Solid like all primary buttons: white on the surface accent ≥ 4.5:1 */
        background: var(--pu-accent-fill);
        box-shadow: 0 10px 40px -8px color-mix(in srgb, var(--pu-accent-fill) 60%, transparent);
        color: #fff;
        font: inherit;
        font-size: var(--pu-fs-17);
        font-weight: 600;
        cursor: pointer;
      }
      .go:focus-visible {
        outline: 3px solid var(--pu-accent);
        outline-offset: 3px;
      }
      .all {
        align-self: center;
        color: var(--pu-accent);
        font-size: 15px;
        text-decoration: none;
      }
      .sheet {
        padding-bottom: 12px;
      }
      /* Phone: HA's dialog footer has no padding there, flush with the text above */
      @media (max-width: 600px) {
        .foot {
          max-width: none;
          padding-inline: 28px;
        }
      }
    `
		];
	}
});
//#endregion
//#region src/welcome.ts
var zn = "pulse.seenVersion", Bn = "", Vn = "pulse.welcome";
function Hn(e, t, n = !0) {
	let r = e.getItem(zn);
	return r === t ? null : r === Bn ? "welcome" : r !== null || e.getItem(Vn) !== null ? n ? "whatsNew" : (Un(e, t), null) : (e.setItem(zn, Bn), "welcome");
}
function Un(e, t) {
	e.setItem(zn, t);
}
//#endregion
//#region src/pulse-heartbeat.ts
var Wn = 1e3, Gn = 24, Kn = [
	3,
	6,
	9,
	12,
	15,
	18,
	21
];
function qn(e) {
	return e.reduce((e, t) => e + t.reduce((e, t) => e + (t ?? 0), 0), 0);
}
I("pulse-heartbeat", class extends N {
	static {
		this.properties = {
			bins: { attribute: !1 },
			dayStarts: { attribute: !1 },
			binMinutes: { type: Number },
			now: { type: Number },
			silentSince: {
				type: Number,
				attribute: !1
			},
			noData: { attribute: !1 },
			silence: {
				type: String,
				reflect: !0
			},
			language: { type: String },
			timeZone: { attribute: !1 },
			tone: {
				type: String,
				reflect: !0
			},
			beating: { state: !0 }
		};
	}
	constructor() {
		super(), this.bins = [], this.dayStarts = [], this.binMinutes = 15, this.now = 0, this.silentSince = -1, this.noData = [], this.silence = "crit", this.language = "en", this.timeZone = void 0, this.tone = "ok", this.beating = !1;
	}
	willUpdate(e) {
		if (!e.has("bins")) return;
		let t = e.get("bins");
		Array.isArray(t) && t.length === this.bins.length && qn(this.bins) > qn(t) && (this.beating = !0);
	}
	row(e, t, n) {
		let r = n - t, i = (e) => `${(e / r * 100).toFixed(2)}%`, a = (e) => (e / r * Wn).toFixed(1), o = dt(t, n, Kn, this.timeZone).map((e) => {
			let t = (e * Wn).toFixed(1);
			return D`<line class="grid" x1=${t} x2=${t} y1="3" y2=${21}></line>`;
		}), s = k;
		this.silentSince > 0 && this.silentSince < n && this.now > t && (s = Sn(Math.max(this.silentSince, t) - t, Math.min(this.now, n) - t, this.noData.map(([e, n]) => [e - t, n - t])).map(([e, t]) => D`<line class="silent" x1=${a(e)} x2=${a(t)} y1=${Gn / 2} y2=${Gn / 2}></line>`));
		let c = pn(this.bins[e] ?? [], r, this.binMinutes).map((e) => E`<i class="tk" style=${`left: ${(e.at * 100).toFixed(2)}%; height: ${mn(e.count)}px`}></i>`), l = this.noData.map(([e, r]) => [Math.max(e, t), Math.min(r, n)]).filter(([e, t]) => t > e).map(([e, n]) => E`<span class="gap" style=${`left: ${i(e - t)}; width: ${i(n - e)}`}></span>`), u = this.now >= t && this.now < n, d = u ? E`<span
          class=${[
			"now",
			this.silentSince > 0 ? "silent" : "",
			this.beating ? "beat" : ""
		].join(" ")}
          style=${`left: ${i(this.now - t)}`}
          @animationend=${() => {
			this.beating = !1;
		}}
        ></span>` : k, f = new Intl.DateTimeFormat(this.language, {
			weekday: "short",
			...this.timeZone ? { timeZone: this.timeZone } : {}
		}).format(/* @__PURE__ */ new Date((t + n) / 2 * 1e3)).replace(".", "");
		return E`<div class="r">
      <span class=${u ? "mono today" : "mono"}>${f}</span>
      <div class="track">
        ${l}
        <svg viewBox="0 0 ${Wn} ${Gn}" preserveAspectRatio="none" aria-hidden="true">${o}${s}</svg>
        <div class="ticks">${c}</div>
        ${d}
      </div>
    </div>`;
	}
	render() {
		let e = Math.max(0, this.dayStarts.length - 1), t = qn(this.bins), n = Array.from({ length: e }, (e, t) => this.row(t, this.dayStarts[t] ?? 0, this.dayStarts[t + 1] ?? 0));
		return E`<div class="cal" role="img" aria-label=${L(this.language, "heartbeat_aria", {
			count: t,
			days: e
		})}>
      ${n}
      <div class="x mono" aria-hidden="true"><span></span><div><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div></div>
    </div>`;
	}
	static {
		this.styles = [
			J,
			X,
			o`
      :host {
        display: block;
        --tick: var(--pu-accent);
        --silent: var(--pu-crit);
      }
      :host([silence='warn']) {
        --silent: var(--pu-warn);
      }
      :host([tone='neutral']) {
        --tick: var(--pu-neutral);
      }
      :host([tone='muted']) {
        --tick: color-mix(in srgb, var(--pu-muted) 60%, transparent);
      }
      .cal {
        display: grid;
        gap: 4px;
      }
      .r {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 8px;
        align-items: center;
        height: 24px;
      }
      .r > span {
        font-size: 12px;
        color: var(--pu-muted);
      }
      .r > span.today {
        color: var(--pu-ink);
        font-weight: 600;
      }
      .track {
        position: relative;
        min-width: 0;
        height: 24px;
      }
      svg {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .grid {
        stroke: var(--pu-line);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .silent {
        stroke: var(--silent);
        stroke-width: 2.5;
        stroke-dasharray: 5 5;
        vector-effect: non-scaling-stroke;
      }
      .ticks {
        position: absolute;
        inset: 0;
        filter: drop-shadow(
          0 0 4px color-mix(in srgb, var(--tick) var(--pu-glow-strength), transparent)
        );
      }
      .tk {
        position: absolute;
        top: 50%;
        width: 3px;
        margin-left: -1.5px;
        border-radius: 1.5px;
        background: var(--tick);
        transform: translateY(-50%);
      }
      .now {
        position: absolute;
        top: 50%;
        width: 8px;
        height: 8px;
        margin: -4px 0 0 -4px;
        border-radius: 50%;
        background: var(--pu-accent);
      }
      .now.silent {
        background: var(--silent);
      }
      @media (prefers-reduced-motion: no-preference) {
        .now.beat {
          animation: beat 600ms ease-out;
        }
      }
      @keyframes beat {
        30% {
          transform: scale(1.8);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--pu-accent) 30%, transparent);
        }
      }
      .gap {
        position: absolute;
        top: 2px;
        bottom: 2px;
        border-radius: 4px;
        background: repeating-linear-gradient(
          -45deg,
          color-mix(in srgb, var(--pu-ink) 13%, transparent) 0 1.5px,
          transparent 1.5px 6px
        );
      }
      .x {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 8px;
        margin-top: 4px;
        font-size: var(--pu-fs-11);
        color: var(--pu-faint);
      }
      .x div {
        display: flex;
        justify-content: space-between;
      }
    `
		];
	}
});
//#endregion
//#region src/pulse-sheet.ts
var Jn = "(pointer: coarse), (max-width: 600px)", Yn = 6, Xn = 0, Zn = "";
function Qn(e) {
	let t = document.documentElement;
	e ? (Xn === 0 && (Zn = t.style.overflow, t.style.overflow = "hidden"), Xn += 1) : Xn > 0 && (--Xn, Xn === 0 && (t.style.overflow = Zn));
}
I("pulse-sheet", class extends N {
	static {
		this.properties = {
			open: {
				type: Boolean,
				reflect: !0
			},
			heading: { type: String },
			language: { type: String },
			noClose: {
				type: Boolean,
				attribute: "no-close"
			},
			hasFooter: { state: !0 }
		};
	}
	setLocked(e) {
		e !== this.locked && (this.locked = e, Qn(e));
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.setLocked(!1);
	}
	constructor() {
		super(), this.drag = null, this.locked = !1, this.open = !1, this.heading = "", this.language = "en", this.noClose = !1, this.hasFooter = !1;
	}
	get dialog() {
		return this.renderRoot.querySelector("dialog");
	}
	get body() {
		return this.renderRoot.querySelector(".body");
	}
	updated(e) {
		if (!e.has("open")) return;
		let t = this.dialog;
		if (t) {
			if (this.open && !t.open) {
				t.style.transform = "", this.removeAttribute("scrolled"), t.showModal(), t.focus({ focusVisible: !1 }), this.setLocked(!0);
				let e = this.body;
				e && (e.scrollTop = 0);
			}
			!this.open && t.open && t.close();
		}
	}
	onClose() {
		this.setLocked(!1);
		let e = this.dialog;
		e && (e.style.transition = "", e.style.transform = ""), this.open &&= !1, this.dispatchEvent(new CustomEvent("closed"));
	}
	onClick(e) {
		e.target === this.dialog && !this.noClose && this.dialog?.close();
	}
	onWheel(e) {
		let t = this.body;
		t !== null && e.composedPath().includes(t) || e.preventDefault();
	}
	sheetMode() {
		return window.matchMedia(Jn).matches;
	}
	onPointerDown(e) {
		this.sheetMode() && e.button === 0 && (this.drag = {
			id: e.pointerId,
			startY: e.clientY,
			startT: e.timeStamp,
			dy: 0,
			active: !1
		});
	}
	onPointerMove(e) {
		let t = this.drag, n = this.dialog;
		if (!t || t.id !== e.pointerId || !n) return;
		let r = e.clientY - t.startY;
		if (!t.active) {
			if (Math.abs(r) < Yn) return;
			t.active = !0;
			let i = e.currentTarget;
			i instanceof HTMLElement && i.setPointerCapture(e.pointerId), n.style.transition = "none";
		}
		t.dy = r > 0 ? r : r / 6, n.style.transform = `translateY(${t.dy}px)`;
	}
	onPointerUp(e) {
		let t = this.drag, n = this.dialog;
		if (this.drag = null, !t || t.id !== e.pointerId || !n || !t.active) return;
		let r = t.dy / Math.max(1, e.timeStamp - t.startT);
		n.style.transition = "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)", Ct(t.dy, r) ? (n.style.transform = "translateY(100%)", window.setTimeout(() => n.close(), 220)) : n.style.transform = "";
	}
	render() {
		return E`<dialog
      tabindex="-1"
      autofocus
      aria-label=${this.heading || k}
      @close=${() => this.onClose()}
      @click=${(e) => this.onClick(e)}
      @wheel=${(e) => this.onWheel(e)}
    >
      <div class="panel">
        <div
          class="drag"
          @pointerdown=${(e) => this.onPointerDown(e)}
          @pointermove=${(e) => this.onPointerMove(e)}
          @pointerup=${(e) => this.onPointerUp(e)}
          @pointercancel=${(e) => this.onPointerUp(e)}
        >
          <div class="grab" aria-hidden="true"></div>
          <header>
            <h2>${this.heading}</h2>
            ${this.noClose ? k : E`<ha-icon-button .label=${L(this.language, "close")} @click=${() => this.dialog?.close()}>
                  <ha-icon icon="mdi:close"></ha-icon>
                </ha-icon-button>`}
          </header>
        </div>
        <div
          class="body"
          @scroll=${(e) => {
			let t = e.currentTarget;
			t instanceof HTMLElement && this.toggleAttribute("scrolled", t.scrollTop > 0);
		}}
        >
          <slot></slot>
        </div>
        <footer class=${this.hasFooter ? "" : "empty"}>
          <slot
            name="footer"
            @slotchange=${(e) => {
			let t = e.target;
			this.hasFooter = t instanceof HTMLSlotElement && t.assignedElements().length > 0;
		}}
          ></slot>
        </footer>
      </div>
    </dialog>`;
	}
	static {
		this.styles = [J, o`
      dialog {
        /* Surfaces: light = page background with white lists, dark = raised surface (set by the panel) */
        --pu-card: var(--pulse-sheet-card, var(--card-background-color, #fff));
        width: min(100% - 2 * 16px, 520px);
        max-height: min(100dvh - 2 * 32px, 960px);
        padding: 0;
        border: 0;
        border-radius: 18px;
        background: var(--pulse-sheet-bg, var(--primary-background-color, #fafafa));
        color: var(--primary-text-color);
        box-shadow:
          0 0 0 1px var(--pulse-sheet-edge, transparent),
          0 12px 32px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        overscroll-behavior: contain;
      }
      /* Only visible when open, otherwise display:flex would override hiding the <dialog> */
      dialog[open] {
        display: flex;
        flex-direction: column;
        animation: fade-in 250ms cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      /* No outline on the dialog itself, focus sits on its buttons */
      dialog:focus {
        outline: none;
      }
      dialog::backdrop {
        /* ::backdrop does not inherit variables in every browser, hence no token */
        background: color-mix(in srgb, black 40%, transparent);
      }
      /* Fixed header, only the content scrolls (min-height: 0 lets the flex area shrink) */
      .panel {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .drag {
        flex: none;
        position: relative;
        z-index: 1;
        padding-bottom: 8px;
        border-bottom: 1px solid transparent;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      :host([scrolled]) .drag {
        border-bottom-color: var(--pu-line);
        box-shadow: 0 6px 12px -10px rgba(0, 0, 0, 0.35);
      }
      .grab {
        display: none;
        width: 36px;
        height: 5px;
        margin: 8px auto 0;
        border-radius: 999px;
        background: var(--pulse-grab, color-mix(in srgb, var(--primary-text-color) 22%, transparent));
      }
      header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 48px;
        padding: 8px 8px 0 20px;
      }
      h2 {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      header ha-icon-button {
        color: var(--pu-muted);
      }
      ::slotted(*:focus:not(:focus-visible)) {
        outline: none;
      }
      .body:focus {
        outline: none;
      }
      .body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        padding: 12px 20px 24px;
      }
      footer {
        flex: none;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 0 20px 20px;
      }
      footer.empty {
        display: none;
      }
      /* Phone: at the bottom edge, full width, slides in from below, handle + header to swipe away */
      @media (pointer: coarse), (max-width: 600px) {
        dialog {
          width: 100%;
          max-width: none;
          max-height: 92dvh;
          margin: auto 0 0;
          border-radius: 28px 28px 0 0;
        }
        dialog[open] {
          animation: slide-up 450ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .drag {
          touch-action: none;
          cursor: grab;
        }
        .grab {
          display: block;
        }
        .body,
        footer {
          padding-inline: 16px;
        }
        .body {
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
        }
        footer {
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
        }
        header {
          padding-inline-start: 16px;
        }
      }
      @keyframes slide-up {
        from {
          transform: translateY(100%);
        }
      }
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: scale(0.97);
        }
      }
    `];
	}
});
//#endregion
//#region src/pulse-picker.ts
var $n = 12;
I("pulse-picker", class extends N {
	static {
		this.properties = {
			options: { attribute: !1 },
			value: { type: String },
			label: { type: String },
			language: { type: String },
			sheetOpen: { state: !0 }
		};
	}
	constructor() {
		super(), this.options = [], this.value = "", this.label = "", this.language = "en", this.sheetOpen = !1;
	}
	pick(e) {
		this.sheetOpen = !1, e !== null && e !== this.value && this.dispatchEvent(new CustomEvent("change", { detail: { value: e } }));
	}
	async openSheet() {
		this.sheetOpen = !0, await this.updateComplete;
		let e = this.renderRoot.querySelector(".choice[aria-checked=\"true\"]");
		e instanceof HTMLElement && (e.scrollIntoView({ block: "center" }), e.focus({ preventScroll: !0 }));
	}
	trigger(e) {
		let t = this.options.find((e) => e.value === this.value);
		return E`<button
      slot=${e ? "trigger" : k}
      class="trigger"
      type="button"
      aria-label=${this.label}
      aria-haspopup=${e ? "menu" : "dialog"}
      @click=${e ? k : () => void this.openSheet()}
    >
      <span>${t?.label ?? this.value}</span>
      <ha-icon icon="mdi:unfold-more-horizontal"></ha-icon>
    </button>`;
	}
	renderSheet() {
		return E`${this.trigger(!1)}
      <pulse-sheet
        .open=${this.sheetOpen}
        .heading=${this.label}
        .language=${this.language}
        @closed=${() => {
			this.sheetOpen = !1;
		}}
      >
        <div class="list" role="radiogroup" aria-label=${this.label}>
          ${this.options.map((e) => E`<button
              class="row choice"
              type="button"
              role="radio"
              aria-checked=${e.value === this.value ? "true" : "false"}
              @click=${() => this.pick(e.value)}
            >
              <span class="label">${e.label}</span>
              ${e.value === this.value ? E`<ha-icon class="check" icon="mdi:check"></ha-icon>` : k}
            </button>`)}
        </div>
      </pulse-sheet>`;
	}
	render() {
		return this.options.length > $n ? this.renderSheet() : E`<ha-dropdown placement="bottom-end" @wa-select=${(e) => this.pick(Re(e))}>
      ${this.trigger(!0)}
      ${this.options.map((e) => E`<ha-dropdown-item .value=${e.value}>
          <ha-icon
            slot="icon"
            class=${e.value === this.value ? "check" : "check hidden"}
            icon="mdi:check"
          ></ha-icon>
          ${e.label}
        </ha-dropdown-item>`)}
    </ha-dropdown>`;
	}
	static {
		this.styles = [
			J,
			Y,
			o`
      :host {
        display: inline-block;
        flex: none;
        max-width: 62%;
      }
      .trigger {
        display: inline-flex;
        width: max-content;
        align-items: center;
        gap: 2px;
        max-width: 100%;
        min-height: var(--pu-hit);
        min-width: var(--pu-hit);
        justify-content: flex-end;
        margin-inline-end: -6px;
        padding: 0 4px 0 10px;
        border: 0;
        border-radius: 8px;
        background: none;
        color: var(--pu-muted);
        font: inherit;
        font-size: 15px;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      @media (hover: hover) {
        .trigger:hover {
          background: var(--pu-fill);
        }
      }
      .trigger:focus-visible {
        outline: 2px solid var(--pu-accent);
      }
      .trigger span {
        white-space: nowrap;
      }
      .trigger ha-icon {
        flex: none;
        --mdc-icon-size: 18px;
      }
      .check {
        color: var(--pu-accent);
        --mdc-icon-size: 20px;
      }
      .check.hidden {
        visibility: hidden;
      }
      .choice {
        font-variant-numeric: tabular-nums;
      }
      .choice[aria-checked='true'] {
        color: var(--pu-accent);
        font-weight: 600;
      }
    `
		];
	}
});
//#endregion
//#region src/pulse-rhythm.ts
var er = 480, Z = 1e3, Q = 26;
function tr(e) {
	return e.reduce((e, t) => e + (t ?? 0), 0);
}
I("pulse-rhythm", class extends N {
	static {
		this.properties = {
			buckets: { attribute: !1 },
			tone: {
				type: String,
				reflect: !0
			},
			learning: {
				type: Boolean,
				reflect: !0
			},
			silentFrom: {
				type: Number,
				attribute: !1
			},
			flag: { type: String },
			gaps: { attribute: !1 },
			days: { type: Number },
			narrow: { state: !0 },
			width: { state: !0 }
		};
	}
	constructor() {
		super(), this.observer = null, this.growAt = -1, this.buckets = [], this.tone = "ok", this.learning = !1, this.silentFrom = -1, this.flag = "", this.gaps = [], this.days = 7, this.narrow = !1, this.width = 0;
	}
	connectedCallback() {
		super.connectedCallback(), this.observer = new ResizeObserver((e) => {
			let t = e[0]?.contentRect.width ?? 0, n = t > 0 && t < er;
			n !== this.narrow && (this.narrow = n), Math.abs(t - this.width) >= 8 && (this.width = t);
		}), this.observer.observe(this);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.observer?.disconnect(), this.observer = null;
	}
	willUpdate(e) {
		if (!e.has("buckets")) return;
		let t = e.get("buckets");
		Array.isArray(t) && t.length === this.buckets.length ? tr(this.buckets) > tr(t) && (this.growAt = this.buckets.findLastIndex((e) => (e ?? 0) > 0)) : this.growAt = -1;
	}
	render() {
		let e = this.narrow && this.buckets.length > 48 ? 2 : 1, t = e > 1 ? en(this.buckets, Math.ceil(this.buckets.length / 2)) : this.buckets, n = t.length || 1, r = this.silentFrom >= 0 ? Math.ceil(this.silentFrom / e) : -1, i = Qe(t), a = Z / n, o = a * .56, s = i.indexOf(null), c = s < 0 ? n : s, l = this.tone === "warn" || this.tone === "crit", u = this.growAt >= 0 ? Math.floor(this.growAt / e) : -1, d = -1;
		if (l && r >= 0) for (let e = 0; e < Math.min(r, n); e++) (i[e] ?? 0) > 0 && (d = e);
		let f = l && r < 0 && c > 0 ? c - 1 : -1, p = (e) => {
			let t = (e + .5) / n;
			return this.gaps.some(([e, n]) => t >= e && t <= n);
		}, m = [], h = [];
		if (i.forEach((e, t) => {
			if (e === null || t === f || r >= 0 && t >= r && e === 0 || e === 0 && p(t)) return;
			let n = (t * a + (a - o) / 2).toFixed(1);
			if (e === 0) {
				m.push(D`<rect class="zero" x=${n} y=${(Q / 2 - 1.5).toFixed(1)} width=${o.toFixed(1)} height="3" rx="1.5"></rect>`);
				return;
			}
			let i = Math.max(4, 6 + e * 20), s = l ? t === d || r >= 0 && t >= r : this.tone === "ok", c = D`<rect class=${[
				l && !s ? "n" : "",
				this.learning ? "dash" : "",
				t === u ? "grow" : ""
			].join(" ")} x=${n} y=${((Q - i) / 2).toFixed(1)} width=${o.toFixed(1)} height=${i.toFixed(1)} rx=${(o / 2).toFixed(1)}></rect>`;
			(s ? h : m).push(c);
		}), f >= 0 && h.push(D`<rect class="mark" x=${(f * a + (a - o) / 2).toFixed(1)} y="1" width=${o.toFixed(1)} height=${24} rx=${(o / 2).toFixed(1)}></rect>`), r >= 0 && r < c) for (let [e, t] of Sn(r / n, c / n, this.gaps)) h.push(D`<line class="silent" x1=${(e * Z).toFixed(1)} x2=${(t * Z).toFixed(1)} y1=${Q / 2} y2=${Q / 2}></line>`);
		let g = Array.from({ length: Math.max(0, this.days - 1) }, (e, t) => {
			let n = ((t + 1) / this.days * Z).toFixed(1);
			return D`<line class="day" x1=${n} x2=${n} y1="1" y2=${25}></line>`;
		});
		return E`${this.gaps.map(([e, t]) => E`<span class="gap" style=${`left: ${(e * 100).toFixed(2)}%; width: ${((t - e) * 100).toFixed(2)}%`}></span>`)}<svg class="base" viewBox="0 0 ${Z} ${Q}" preserveAspectRatio="none" aria-hidden="true">${g}${m}</svg><svg class="hot" viewBox="0 0 ${Z} ${Q}" preserveAspectRatio="none" aria-hidden="true">${h}</svg>${this.renderFlag(r, c, n, (e) => `${(e / n * 100).toFixed(2)}%`)}`;
	}
	renderFlag(e, t, n, r) {
		return this.flag ? e >= 0 ? (t - e) / n * this.width < 140 ? k : E`<span class="flag-area" style=${`left: max(0px, min(${r(e)}, calc(${r(t)} - 176px))); right: calc(100% - ${r(t)})`}>
        <span class="flag">${this.flag}</span>
      </span>` : this.width < 300 ? k : E`<span class="flag-area at-end" style=${`right: calc(100% - ${r(t)})`}>
      <span class="flag">${this.flag}</span>
    </span>` : k;
	}
	static {
		this.styles = [J, o`
      :host {
        position: relative;
        display: block;
        min-width: 0;
        height: var(--rhythm-height, 26px);
        --bar: var(--pu-accent);
        --silent: var(--pu-crit);
        --pill-bg: color-mix(in srgb, var(--pu-crit) 88%, #000);
        --pill-ink: #fff;
      }
      :host([tone='warn']) {
        --bar: var(--pu-warn);
        /* Stille unter Beobachtung: dieselbe Farbe wie der Status, nicht Rot */
        --silent: var(--pu-warn);
        --pill-bg: var(--pu-warn);
        --pill-ink: #231a00;
      }
      :host([tone='crit']) {
        --bar: var(--pu-crit);
      }
      :host([tone='muted']) {
        --bar: color-mix(in srgb, var(--pu-muted) 55%, transparent);
        --pill-bg: color-mix(in srgb, var(--pu-ink) 9%, var(--primary-background-color, #fff));
        --pill-ink: var(--pu-muted);
      }
      svg {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      /* Leuchten nur dunkel (Stärke vom Panel) und nur in der Statusfarbe */
      svg.hot {
        filter: drop-shadow(
          0 0 5px color-mix(in srgb, var(--bar) var(--pu-glow-strength), transparent)
        );
      }
      rect {
        fill: var(--bar);
      }
      rect.n {
        fill: var(--pu-neutral);
      }
      rect.zero {
        fill: var(--pu-track);
      }
      rect.dash {
        fill: none;
        stroke: var(--bar);
        stroke-width: 1.5;
        stroke-dasharray: 2 2;
        vector-effect: non-scaling-stroke;
      }
      rect.grow {
        transform-box: fill-box;
        transform-origin: center;
      }
      @media (prefers-reduced-motion: no-preference) {
        rect.grow {
          animation: grow 180ms ease-out;
        }
      }
      @keyframes grow {
        from {
          transform: scaleY(0.4);
        }
      }
      .day {
        stroke: var(--pu-line);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .silent {
        stroke: var(--silent);
        stroke-width: 2.5;
        stroke-dasharray: 6 6;
        vector-effect: non-scaling-stroke;
      }
      .gap {
        position: absolute;
        top: 3px;
        bottom: 3px;
        border-radius: 4px;
        background: repeating-linear-gradient(
          -45deg,
          color-mix(in srgb, var(--pu-ink) 12%, transparent) 0 1.5px,
          transparent 1.5px 6px
        );
      }
      .flag-area {
        position: absolute;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
        pointer-events: none;
      }
      .flag-area.at-end {
        left: 0;
        justify-content: flex-end;
      }
      .flag {
        padding: 3px 10px;
        border-radius: var(--pu-r-full);
        background: var(--pill-bg);
        color: var(--pill-ink);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.25;
        white-space: nowrap;
        pointer-events: none;
      }
    `];
	}
});
//#endregion
//#region src/pulse-device-sheet.ts
var nr = 260;
function rr(e) {
	return B(e.status) === "warn" ? "warn" : "crit";
}
function ir(e) {
	return e.ignored ? "muted" : B(e.status) === "ok" ? "ok" : "neutral";
}
var ar = Array.from({ length: 12 }, (e, t) => ({
	value: String(t + 1),
	label: String(t + 1)
})), or = {
	nimh: "chem_nimh",
	alkaline: "chem_alkaline",
	lithium: "chem_lithium"
};
I("pulse-device-sheet", class extends N {
	static {
		this.properties = {
			device: { attribute: !1 },
			devices: { attribute: !1 },
			language: { type: String },
			now: { type: Number },
			stripStart: { type: Number },
			stripDays: { type: Number },
			dayStarts: { attribute: !1 },
			timeZone: { attribute: !1 },
			timeFormat: { attribute: !1 },
			bucketHours: { type: Number },
			fetchHeartbeat: { attribute: !1 },
			beat: { state: !0 },
			batteryTypes: { attribute: !1 },
			chemistries: { attribute: !1 },
			noData: { attribute: !1 },
			open: { type: Boolean },
			readonly: { type: Boolean },
			settingsOpen: { state: !0 },
			beatError: { state: !0 }
		};
	}
	constructor() {
		super(), this.gapsOf = R(ln), this.beatKey = "", this.onSettingsToggle = (e) => {
			let t = e.currentTarget;
			if (!(t instanceof HTMLDetailsElement) || (this.settingsOpen = t.open, !t.open)) return;
			let n = CSS.supports("interpolate-size", "allow-keywords");
			window.setTimeout(() => t.scrollIntoView({
				block: "nearest",
				behavior: "smooth"
			}), n ? nr : 0);
		}, this.device = null, this.devices = [], this.language = "en", this.now = 0, this.stripStart = 0, this.stripDays = 7, this.dayStarts = [], this.timeZone = void 0, this.timeFormat = void 0, this.bucketHours = 2, this.fetchHeartbeat = null, this.beat = null, this.batteryTypes = [], this.chemistries = [], this.noData = [], this.open = !1, this.readonly = !1, this.settingsOpen = !1, this.beatError = !1;
	}
	willUpdate(e) {
		if (!e.has("device") && !e.has("open") && !e.has("stripStart")) return;
		let t = this.device;
		if (!this.open || !t) {
			this.beatKey = "";
			return;
		}
		let n = `${t.id}|${t.last_activity ?? ""}|${this.dayStarts[0] ?? this.stripStart}`;
		n !== this.beatKey && ((!this.beat || !(t.id in this.beat.devices)) && (this.beat = null), this.beatKey = n, this.beatError = !1, this.loadBeat(t.id, n));
	}
	async loadBeat(e, t) {
		if (!this.fetchHeartbeat) return;
		let n = null;
		try {
			n = fn(await this.fetchHeartbeat([e]));
		} catch {
			n = null;
		}
		t === this.beatKey && (n ? this.beat = n : this.beat || (this.beatError = !0));
	}
	reloadBeat(e) {
		this.beatError = !1, this.loadBeat(e, this.beatKey);
	}
	fire(e, t) {
		this.dispatchEvent(new CustomEvent(e, {
			detail: t,
			bubbles: !0,
			composed: !0
		}));
	}
	change(e) {
		this.device && this.fire("device-change", {
			id: this.device.id,
			changes: e
		});
	}
	picker(e, t, n, r, i) {
		if (this.readonly) {
			let r = n.find((e) => e.value === t)?.label ?? t;
			return E`<div class="row">
        <span class="label">${e}${i ? E`<small>${i}</small>` : k}</span>
        <span class="value">${r}</span>
      </div>`;
		}
		return E`<div class="row">
      <span class="label">${e}${i ? E`<small>${i}</small>` : k}</span>
      <pulse-picker
        .language=${this.language}
        .label=${e}
        .value=${t}
        .options=${n}
        @change=${(e) => r(e.detail.value)}
      ></pulse-picker>
    </div>`;
	}
	switchRow(e, t, n, r, i) {
		return this.readonly || i ? E`<div class="row">
        <span class="label">${e}<small>${i ?? t}</small></span>
        <span class="value">${L(this.language, n ? "on" : "off")}</span>
      </div>` : E`<div
      class="row tappable"
      role="switch"
      tabindex="0"
      aria-checked=${n ? "true" : "false"}
      @click=${() => r(!n)}
      @keydown=${(e) => {
			(e.key === "Enter" || e.key === " ") && (e.preventDefault(), r(!n));
		}}
    >
      <span class="label">${e}<small>${t}</small></span>
      <ha-switch tabindex="-1" aria-hidden="true" .checked=${n}></ha-switch>
    </div>`;
	}
	renderBody(e) {
		let t = this.language, n = e.battery, r = e.snooze_until !== null && e.snooze_until > this.now, i = n.flag ? L(t, n.low ? "battery_flag_low" : "battery_flag_ok") : n.level === null ? L(t, "unknown") : L(t, "unit_percent", { value: Math.round(n.level) }), a = n.type ? (n.count ?? 1) > 1 ? L(t, "battery_count_type", {
			count: n.count ?? 1,
			type: n.type
		}) : n.type : L(t, "unknown"), o = this.timeZone, s = rn(t, e, this.now), c = e.partner ? this.devices.find((t) => t.id === e.partner) ?? null : null, l = n.replaced.at(-1), u = this.beat, d = u?.devices[e.id] ?? null, f = u?.noData ?? this.noData, p = this.gapsOf(f, this.dayStarts), m = Math.max(1, this.dayStarts.length - 1), h = (e) => E`<pulse-rhythm .buckets=${e.strip} tone=${V(e)} ?learning=${e.status === "learning" && !e.ignored} .gaps=${p} .days=${m} .silentFrom=${gn(e, this.dayStarts)}></pulse-rhythm>`, g = c ? on(t, e, c) : "", ee = [e.area, e.model].filter(Boolean).join(" · "), te = wn(t, n.forecast, n.forecast_reason === "untrusted" && !n.trusted ? null : n.forecast_reason), _ = (n) => E`<button class=${n ? "pbtn primary" : "pbtn"} type="button" @click=${() => this.fire("replaced", { id: e.id })}>
        <ha-icon icon="mdi:battery-sync-outline"></ha-icon>${L(t, "replaced")}
      </button>`, v = (n) => r && e.snooze_until !== null ? E`<span class="snoozed">
            <span class="muted small">${L(t, "snoozed_until", { when: mt(t, e.snooze_until, this.now, o, this.timeFormat) })}</span>
            <button class="pbtn" type="button" @click=${() => this.fire("snooze-cancel", { id: e.id })}>${L(t, "snooze_cancel")}</button>
          </span>` : E`<button class=${n ? "pbtn primary" : "pbtn"} type="button" @click=${() => this.fire("later", { id: e.id })}>
            <ha-icon icon="mdi:bell-sleep-outline"></ha-icon>${L(t, "later")}
          </button>`, ne = At(e), y = e.mains === !0;
		return E`
      <header class="hero">
        ${ee || e.cloud || y ? E`<p class="dname"><ha-icon .icon=${e.icon}></ha-icon><span>${ee}</span>${e.cloud ? E`<span class="chip-cloud"><ha-icon icon="mdi:cloud-outline"></ha-icon>${L(t, "cloud_device")}</span>` : k}${y ? E`<span class="chip-cloud"><ha-icon icon="mdi:power-plug-outline"></ha-icon>${L(t, "mains_chip")}</span>` : k}</p>` : k}
        <h3 class=${`dhl ${s.tone === "accent" ? "grad" : `t-${s.tone}`}`}>${s.text}</h3>
        <p class="dtx">${an(t, e, this.now, o, this.timeFormat)}</p>
      </header>

      ${this.readonly ? E`<p class="ro muted small"><ha-icon icon="mdi:lock-outline"></ha-icon>${L(t, "read_only")}</p>` : k}
      ${Ot(e) && !this.readonly ? E`<div class="buttons">
              ${y ? v(!r) : ne ? E`${_(!0)}${v(!1)}` : E`${v(!r)}${_(!1)}`}
            </div>` : k}

      <section class="cal">
        <div class="hd">
          <span class="cap">${L(t, "heartbeat_title")}</span>
          <span class="legend">
            <span>${L(t, "heartbeat_legend")}</span>
            ${p.length ? E`<span class="lg-gap"><i aria-hidden="true"></i>${L(t, "no_data_legend")}</span>` : k}
          </span>
        </div>
        ${d && u ? E`<pulse-heartbeat
                .bins=${d}
                .dayStarts=${u.dayStarts}
                .binMinutes=${u.binMinutes}
                .timeZone=${o}
                .now=${this.now}
                .silentSince=${_n(e, d, u.dayStarts, u.binMinutes)}
                .noData=${f}
                silence=${rr(e)}
                .language=${t}
                tone=${ir(e)}
              ></pulse-heartbeat>` : this.beatError ? E`<div class="cal-err">
                  <span class="muted">${L(t, "heartbeat_failed")}</span>
                  <button class="pbtn" type="button" @click=${() => this.reloadBeat(e.id)}>${L(t, "reload")}</button>
                </div>` : E`<div class="cal-wait"><pulse-rhythm .buckets=${e.strip} tone=${V(e)} ?learning=${e.status === "learning" && !e.ignored} .gaps=${p} .days=${m} .silentFrom=${gn(e, this.dayStarts)} .flag=${Qt(t, e, this.now)}></pulse-rhythm>
                <div class="axis muted" aria-hidden="true" style=${`grid-template-columns: ${ct(this.dayStarts)}`}>${st(t, this.dayStarts, o).map((e) => E`<span>${e}</span>`)}</div></div>`}
      </section>

      ${c ? E`<section class="pair">
              <span class="cap">${L(t, "with_partner")}</span>
              <div class="l"><span>${c.name}</span>${h(c)}</div>
              <div class="l"><span>${e.name}</span>${h(e)}</div>
              ${g ? E`<p>${g}</p>` : k}
            </section>` : k}

      ${y ? E`<p class="fc muted"><ha-icon icon="mdi:power-plug-outline"></ha-icon><span>${L(t, "mains_note")}</span></p>` : E`<section class="stats">
        <div>
          <span>${L(t, "battery")}</span>
          <b class=${n.trusted ? "" : "faint"}>${i}</b>
          ${n.trusted ? k : E`<small>${L(t, "stat_rechargeable")}</small>`}
        </div>
        <div><span>${L(t, "battery_type")}</span><b>${a}</b></div>
        <div><span>${L(t, "stat_changed")}</span><b>${l === void 0 ? L(t, "unknown") : Dt(t, l, this.now, o)}</b></div>
      </section>
      ${te ? E`<p class=${n.forecast ? "fc" : "fc muted"}><ha-icon icon=${n.forecast ? "mdi:battery-clock-outline" : "mdi:battery-unknown"}></ha-icon><span>${te}</span></p>` : k}`}

      ${this.renderSuggestions(e)}

      <div class="list quick">
        ${Ot(e) || this.readonly || y ? k : E`<button class="row action" type="button" @click=${() => this.fire("replaced", { id: e.id })}>
                <span class="label">${L(t, "replaced_now")}</span>
              </button>`}
        ${this.switchRow(L(t, "important"), L(t, "important_hint"), e.critical, (t) => this.change({ critical: jt(e, t) }), e.label === "important" ? L(t, "label_set", { label: "pulse_important" }) : void 0)}
      </div>

      <details class="more" ?open=${this.settingsOpen} @toggle=${this.onSettingsToggle}>
        <summary>
          <span>${L(t, "device_settings")}</span>
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </summary>
        ${this.renderSettings(e)}
      </details>
    `;
	}
	renderSuggestions(e) {
		let t = this.language, n = this.readonly ? [] : On(e);
		return n.length ? E`<section class="suggest">
      <span class="cap">${L(t, "partner")}</span>
      ${n.map((n) => E`<div class="sg">
          <span class="sg-t"><b>${L(t, "partner_suggest", { name: n.name })}</b><small>${L(t, "partner_suggest_why")}</small></span>
          <span class="sg-b">
            <button class="pbtn" type="button" @click=${() => this.fire("partner-dismiss", {
			id: e.id,
			partner: n.id
		})}>${L(t, "partner_dismiss")}</button>
            <button class="pbtn primary" type="button" @click=${() => this.change({ partner: n.id })}>${L(t, "partner_accept")}</button>
          </span>
        </div>`)}
    </section>` : k;
	}
	renderBatterySettings(e, t, n) {
		let r = this.language, i = e.battery;
		return E`<section class="section">
        <h4 class="section-title">${L(r, "battery")}</h4>
        <div class="list">
          ${this.picker(L(r, "battery_type"), i.type ?? "", t, (e) => this.change({ battery_type: e || null }))}
          ${this.picker(L(r, "battery_count"), String(i.count ?? 1), ar, (e) => this.change({ battery_count: Number(e) }))}
          ${this.picker(L(r, "chemistry"), i.chemistry ?? "", n, (e) => this.change({ chemistry: e || null }), i.trusted ? void 0 : L(r, "level_unreliable"))}
          ${i.voltage === null ? k : E`<div class="row"><span class="label">${L(r, "voltage")}</span><span class="value">${ht(r, i.voltage)}</span></div>`}
        </div>
      </section>

      <section class="section">
        <h4 class="section-title">${L(r, "replaced_history")}</h4>
        <div class="list">
          ${i.replaced.length ? [...i.replaced].reverse().slice(0, 3).map((e) => E`<div class="row"><span class="label">${ft(r, e, this.timeZone)}</span><span class="value">${Xe(r, e, this.now)}</span></div>`) : E`<div class="row"><span class="label muted">${L(r, "never_replaced")}</span></div>`}
        </div>
      </section>`;
	}
	renderSettings(e) {
		let t = this.language, n = [{
			value: "",
			label: L(t, "type_unknown")
		}, ...this.batteryTypes.map((e) => ({
			value: e,
			label: e
		}))], r = [{
			value: "",
			label: L(t, "chem_unknown")
		}, ...this.chemistries.map((e) => ({
			value: e,
			label: L(t, or[e] ?? "chem_unknown")
		}))], i = [{
			value: "",
			label: L(t, "partner_none")
		}, ..._t(this.devices, e).map((e) => ({
			value: e.id,
			label: e.name
		}))];
		return E`<div class="settings">
      ${e.mains === !0 ? k : this.renderBatterySettings(e, n, r)}
      <section class="section">
        <h4 class="section-title">${L(t, "partner")}</h4>
        <div class="list">
          ${this.picker(L(t, "partner"), e.partner ?? "", i, (e) => this.change({ partner: e || null }))}
        </div>
        <p class="section-foot">${L(t, "partner_hint")}</p>
      </section>

      <section class="section">
        <h4 class="section-title">${L(t, "monitoring")}</h4>
        <div class="list">
          ${this.switchRow(L(t, "ignore"), L(t, "ignore_hint"), e.ignored, (e) => this.change({ ignored: e }), e.label === "ignore" ? L(t, "label_set", { label: "pulse_ignore" }) : void 0)}
          ${this.readonly ? k : E`<button class="row action" type="button" @click=${() => F(`/config/devices/device/${e.id}`)}>
                  <span class="label">${L(t, "open_device")}</span>
                  <ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
                </button>`}
        </div>
      </section>
    </div>`;
	}
	render() {
		let e = this.device;
		return E`<pulse-sheet
      .open=${this.open && e !== null}
      .heading=${e?.name ?? ""}
      .language=${this.language}
      @closed=${() => this.fire("sheet-closed", {})}
    >
      ${e ? E`<div class="body">${this.renderBody(e)}</div>` : k}
    </pulse-sheet>`;
	}
	static {
		this.styles = [
			J,
			Y,
			X,
			o`
      .body {
        display: grid;
        gap: 24px;
        padding-bottom: 8px;
      }
      .hero {
        display: grid;
        gap: 6px;
      }
      .dname {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        margin: 0;
        font-size: 14px;
        color: var(--pu-muted);
        --mdc-icon-size: 18px;
      }
      .dname ha-icon {
        flex: none;
      }
      .dname span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dhl {
        margin: 2px 0 4px;
        font-family: var(--pu-display);
        font-size: clamp(32px, 9vw, var(--pu-fs-42));
        font-weight: 800;
        letter-spacing: -0.025em;
        line-height: 1.02;
        text-wrap: balance;
      }
      .dhl.t-muted {
        color: var(--pu-ink);
      }
      .dtx {
        margin: 0;
        font-size: var(--pu-fs-15);
        line-height: 1.45;
        text-wrap: pretty;
      }
      .buttons {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .small {
        font-size: var(--pu-fs-13);
      }
      .snoozed {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--pu-sp-8);
      }
      .ro {
        display: flex;
        align-items: center;
        gap: var(--pu-sp-8);
        margin: 0;
        --mdc-icon-size: 16px;
      }
      .cal .hd {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: baseline;
        gap: 4px 12px;
        margin-bottom: 10px;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 12px;
        font-size: var(--pu-fs-11);
        color: var(--pu-faint);
      }
      .lg-gap {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .lg-gap i {
        width: 18px;
        height: 10px;
        border-radius: 3px;
        background: repeating-linear-gradient(
          -45deg,
          color-mix(in srgb, var(--pu-ink) 22%, transparent) 0 1.5px,
          transparent 1.5px 5px
        );
      }
      .cal-wait {
        display: grid;
        gap: 6px;
      }
      .cal-err {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px 12px;
        min-height: 64px;
        font-size: var(--pu-fs-15);
      }
      .chip-cloud {
        display: inline-flex;
        flex: none;
        align-items: center;
        gap: 4px;
        padding: 1px 8px;
        border-radius: var(--pu-r-full);
        background: var(--pu-fill);
        font-size: 12px;
        --mdc-icon-size: 14px;
      }
      /* Battery forecast below the battery figures */
      .fc {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: -12px 0 0;
        font-size: var(--pu-fs-15);
        line-height: 1.4;
        --mdc-icon-size: 18px;
      }
      .fc ha-icon {
        flex: none;
        margin-top: 1px;
        color: var(--pu-muted);
      }
      .fc.muted {
        font-size: var(--pu-fs-13);
      }
      .suggest {
        display: grid;
        gap: 8px;
        padding-top: 14px;
        border-top: 1px solid var(--pu-line);
      }
      .sg {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px 12px;
      }
      .sg-t {
        display: grid;
        min-width: 0;
      }
      .sg-t small {
        font-size: var(--pu-fs-13);
        color: var(--pu-muted);
      }
      .sg-b {
        display: flex;
        gap: 8px;
      }
      .quick {
        --pu-card: transparent;
      }
      .axis {
        display: grid;
        text-align: center;
        font-size: 12px;
      }
      /* Partner comparison: hairline instead of a surface, no grey tile in dark mode */
      .pair {
        display: grid;
        gap: 6px;
        padding: 14px 0 0;
        border-top: 1px solid var(--pu-line);
      }
      .pair .cap {
        margin-bottom: 4px;
      }
      .pair .l {
        display: grid;
        grid-template-columns: minmax(80px, 32%) minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        font-size: var(--pu-fs-13);
        font-weight: 600;
        --rhythm-height: 22px;
      }
      .pair .l span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pair p {
        margin: 6px 0 0;
        font-size: 14px;
        line-height: 1.4;
        color: var(--pu-muted);
        text-wrap: pretty;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        border-top: 1px solid var(--pu-line);
      }
      .stats div {
        display: grid;
        align-content: start;
        min-width: 0;
        padding-top: 12px;
      }
      .stats div + div {
        padding-inline-start: 14px;
        border-inline-start: 1px solid var(--pu-line);
      }
      .stats span {
        font-size: 12px;
        color: var(--pu-muted);
      }
      .stats b {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.015em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .stats small {
        font-size: var(--pu-fs-11);
        line-height: 1.3;
        color: var(--pu-faint);
      }
      .faint,
      .value.faint {
        opacity: 0.7;
      }

      /* Settings collapsed: one calm row; open: light lists without a surface */
      .more {
        border-top: 1px solid var(--pu-line);
        interpolate-size: allow-keywords;
      }
      /* Open and close smoothly where the browser can animate to auto height (elsewhere it simply jumps) */
      .more::details-content {
        block-size: 0;
        overflow: clip;
        transition:
          block-size 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
          content-visibility 240ms allow-discrete;
      }
      .more[open]::details-content {
        block-size: auto;
      }
      @media (prefers-reduced-motion: reduce) {
        .more::details-content {
          transition: none;
        }
      }
      summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: max(48px, var(--pu-hit));
        list-style: none;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        -webkit-tap-highlight-color: transparent;
      }
      summary::-webkit-details-marker {
        display: none;
      }
      summary ha-icon {
        color: var(--pu-muted);
        transition: transform 0.2s;
      }
      .more[open] summary ha-icon {
        transform: rotate(180deg);
      }
      summary:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 4px;
        border-radius: 8px;
      }
      summary:focus:not(:focus-visible) {
        outline: none;
      }
      .settings {
        display: grid;
        gap: 20px;
        padding: 4px 0 8px;
        --pu-card: transparent;
      }
      .settings .list {
        border-color: var(--pu-line);
      }
      .row .label {
        text-wrap: pretty;
      }
    `
		];
	}
}), I("pulse-mark", class extends N {
	render() {
		return E`<svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="pulse-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1c1838" />
          <stop offset="1" stop-color="#0d0b1c" />
        </linearGradient>
        <linearGradient id="pulse-mark-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#b9b0ff" />
          <stop offset="1" stop-color="#6d5dfc" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#pulse-mark-bg)" />
      <path
        d="M16 55 H34 L42 34 L54 72 L62 46 L67 55 H84"
        fill="none"
        stroke="url(#pulse-mark-line)"
        stroke-width="8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="84" cy="55" r="6" fill="#0d0b1c" stroke="#b9b0ff" stroke-width="4" />
    </svg>`;
	}
	static {
		this.styles = [J, o`
      :host {
        display: block;
        width: 64px;
        height: 64px;
      }
      svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 10px 24px rgba(109, 93, 252, 0.45));
      }
      /* Klein im Kopf: ohne Leuchten */
      :host([flat]) svg {
        filter: none;
      }
    `];
	}
});
//#endregion
//#region src/pulse-devices.ts
var sr = {
	area: "group_area",
	status: "group_status",
	none: "group_none"
};
I("pulse-devices", class extends N {
	static {
		this.properties = {
			devices: { attribute: !1 },
			language: { type: String },
			now: { type: Number },
			start: { type: Number },
			days: { type: Number },
			dayStarts: { attribute: !1 },
			timeZone: { attribute: !1 },
			timeFormat: { attribute: !1 },
			bucketHours: { type: Number },
			noData: { attribute: !1 },
			groupBy: { type: String },
			filter: { attribute: !1 },
			dueIds: { attribute: !1 },
			readonly: { type: Boolean },
			query: { state: !0 },
			collapsed: { state: !0 }
		};
	}
	constructor() {
		super(), this.gapsOf = R(ln), this.gaps = [], this.devices = [], this.language = "en", this.now = 0, this.start = 0, this.days = 7, this.dayStarts = [], this.timeZone = void 0, this.timeFormat = void 0, this.bucketHours = 2, this.noData = [], this.groupBy = "area", this.filter = null, this.dueIds = [], this.readonly = !1, this.query = "", this.collapsed = /* @__PURE__ */ new Set();
	}
	fire(e, t) {
		this.dispatchEvent(new CustomEvent(e, {
			detail: t,
			bubbles: !0,
			composed: !0
		}));
	}
	toggle(e) {
		let t = new Set(this.collapsed);
		t.has(e) ? t.delete(e) : t.add(e), this.collapsed = t;
	}
	setGroup(e) {
		(e === "area" || e === "status" || e === "none") && (this.groupBy = e, this.collapsed = /* @__PURE__ */ new Set(), this.fire("group-change", { group: e }));
	}
	onMenu(e, t) {
		let n = Re(t);
		n === "details" ? this.fire("open", { id: e.id }) : n === "replaced" ? this.fire("replaced", { id: e.id }) : n === "later" ? this.fire("later", { id: e.id }) : n === "important" ? this.fire("device-change", {
			id: e.id,
			changes: { critical: jt(e, !e.critical) }
		}) : n === "ignore" && this.fire("device-change", {
			id: e.id,
			changes: { ignored: !e.ignored }
		});
	}
	filterName(e) {
		let t = this.language;
		return e === "ignored" ? L(t, "ignored") : e === "important" ? L(t, "filter_important") : e === "battery" ? L(t, "filter_battery") : e === "mains" ? L(t, "filter_mains") : L(t, qe(e));
	}
	emptyText() {
		let e = this.language;
		return this.devices.length ? this.query.trim() ? L(e, "no_results", { query: this.query }) : L(e, "filter_empty") : L(e, "no_devices");
	}
	renderRow(e) {
		let t = this.language, n = $t(t, e, this.now), r = K(e) && e.last_activity !== null ? mt(t, e.last_activity, this.now, this.timeZone, this.timeFormat) : Xe(t, e.last_activity, this.now), i = e.ignored ? "ok" : V(e), a = this.readonly ? k : E`<span class="menu"><ha-dropdown placement="bottom-end" @wa-select=${(t) => this.onMenu(e, t)}>
          <ha-icon-button slot="trigger" .label=${L(t, "more_for", { name: e.name })}>
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </ha-icon-button>
          <ha-dropdown-item value="details"><ha-icon slot="icon" icon="mdi:information-outline"></ha-icon>${L(t, "details")}</ha-dropdown-item>
          ${e.mains ? k : E`<ha-dropdown-item value="replaced"><ha-icon slot="icon" icon="mdi:battery-sync-outline"></ha-icon>${L(t, "replaced")}</ha-dropdown-item>`}
          ${Ot(e) ? E`<ha-dropdown-item value="later"><ha-icon slot="icon" icon="mdi:bell-sleep-outline"></ha-icon>${L(t, "later")}</ha-dropdown-item>` : k}
          ${e.ignored || e.label ? k : E`<ha-dropdown-item value="important"><ha-icon slot="icon" icon=${e.critical ? "mdi:star-off-outline" : "mdi:star-outline"}></ha-icon>${L(t, e.critical ? "unmark_important" : "mark_important")}</ha-dropdown-item>`}
          ${e.label === "ignore" ? k : E`<ha-dropdown-item value="ignore">
            <ha-icon slot="icon" icon=${e.ignored ? "mdi:eye-outline" : "mdi:eye-off-outline"}></ha-icon>${L(t, e.ignored ? "resume" : "ignore_action")}
          </ha-dropdown-item>`}
        </ha-dropdown></span>`;
		return E`<div class="mrow">
      <button class="main rowgrid" type="button" @click=${() => this.fire("open", { id: e.id })}>
        <span class="nm">
          <ha-icon class=${`t-${i}`} .icon=${e.icon}></ha-icon>
          <span class="who">
            <span class="title"><b>${e.name}</b>${e.critical && !e.ignored ? E`<span class="star" role="img" aria-label=${L(t, "important_badge")} title=${L(t, "important_badge")}><ha-icon icon="mdi:star"></ha-icon></span>` : k}</span>
            ${this.groupBy !== "area" && e.area ? E`<span class="room">${e.area}</span>` : k}
          </span>
        </span>
        <pulse-rhythm
          .buckets=${e.strip}
          tone=${V(e)}
          ?learning=${e.status === "learning" && !e.ignored}
          .gaps=${this.gaps}
          .days=${Math.max(1, this.dayStarts.length - 1)}
          .silentFrom=${gn(e, this.dayStarts)}
          .flag=${Qt(t, e, this.now)}
        ></pulse-rhythm>
        <span class="st">
          ${n ? E`<b class=${`t-${n.tone}`}>${n.text}</b><span class="sep"> · </span>` : k}<span class="num time">${r}</span>
        </span>
      </button>
      ${a}
    </div>`;
	}
	render() {
		let e = this.language, t = vt(Tt(this.devices, this.filter, this.dueIds), this.query), n = this.groupBy === "area", r = t.filter((e) => !e.ignored), i = t.filter((e) => e.ignored), a = bt(r, this.groupBy, e, L(e, "no_area"));
		this.gaps = this.gapsOf(this.noData, this.dayStarts);
		let o = st(e, this.dayStarts, this.timeZone);
		i.length && a.push({
			area: L(e, "ignored"),
			devices: i
		});
		let s = this.filter ? L(e, "filter_label", { what: this.filterName(this.filter) }) : "";
		return E`<div class=${[
			"monitor",
			n ? "by-area" : "",
			this.readonly ? "readonly" : ""
		].join(" ")}>
      <div class="toolbar">
        <label class="search">
          <ha-icon icon="mdi:magnify"></ha-icon>
          <input
            id="search"
            type="search"
            aria-label=${L(e, "search_label")}
            .value=${this.query}
            placeholder=${this.devices.length === 1 ? L(e, "search_one") : L(e, "search", { count: this.devices.length })}
            @input=${(e) => {
			this.query = Le(e);
		}}
          />
        </label>
        <ha-dropdown placement="bottom-end" @wa-select=${(e) => this.setGroup(Re(e) ?? "")}>
          <button slot="trigger" class="chip" type="button">
            ${L(e, "group_by", { what: L(e, sr[this.groupBy]) })}
            <ha-icon icon="mdi:menu-down"></ha-icon>
          </button>
          ${[
			"area",
			"status",
			"none"
		].map((t) => E`<ha-dropdown-item value=${t}>
              <ha-icon slot="icon" class=${t === this.groupBy ? "check" : "check hidden"} icon="mdi:check"></ha-icon>
              ${L(e, sr[t])}
            </ha-dropdown-item>`)}
        </ha-dropdown>
        ${s ? E`<button class="chip filter" type="button" @click=${() => this.fire("filter-clear", {})} aria-label=${`${s}, ${L(e, "filter_clear")}`}>
                ${s}
                <ha-icon icon="mdi:close"></ha-icon>
              </button>` : k}
      </div>
      <div class="axis" aria-hidden="true">
        <span>${t.length === 1 ? L(e, "monitor_head_one") : L(e, "monitor_head", { count: t.length })}</span>
        <div class="days mono" style=${`grid-template-columns: ${ct(this.dayStarts)}`}>${o.map((e) => E`<span>${e.replace(".", "")}</span>`)}</div>
        <span class="right">${L(e, "col_last")}</span>
      </div>
      ${t.length ? a.map((e) => {
			let t = this.collapsed.has(e.area);
			return E`${e.area ? E`<button class="group" type="button" aria-expanded=${t ? "false" : "true"} @click=${() => this.toggle(e.area)}>
              <ha-icon icon=${t ? "mdi:chevron-right" : "mdi:chevron-down"}></ha-icon>
              <span>${e.area}</span><span class="count">${e.devices.length}</span>
            </button>` : k}${t ? k : e.devices.map((e) => this.renderRow(e))}`;
		}) : E`<p class="empty muted">${this.emptyText()}</p>`}
    </div>`;
	}
	static {
		this.styles = [
			J,
			Y,
			X,
			Fn,
			o`
      :host {
        display: block;
        container-type: inline-size;
      }
      .monitor {
        border-top: 1px solid var(--pu-line);
      }
      .toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        padding: 16px 0 6px;
      }
      .search {
        flex: 1 1 240px;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        height: max(40px, var(--pu-hit));
        padding: 0 14px;
        box-sizing: border-box;
        border-radius: 12px;
        border: 1px solid transparent;
        background: var(--pu-fill);
        color: var(--pu-muted);
      }
      .search:focus-within {
        border-color: var(--pu-accent);
        box-shadow: 0 0 0 1px var(--pu-accent);
      }
      .search input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-15);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: max(40px, var(--pu-hit));
        padding: 0 10px 0 16px;
        box-sizing: border-box;
        border: 1px solid var(--pu-line);
        border-radius: 99px;
        background: none;
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-13);
        white-space: nowrap;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .chip:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 2px;
      }
      .chip.filter {
        border-color: transparent;
        color: var(--pu-accent);
        background: color-mix(in srgb, var(--pu-accent) 12%, transparent);
        font-weight: 600;
        --mdc-icon-size: 18px;
      }
      .check {
        color: var(--pu-accent);
      }
      .check.hidden {
        visibility: hidden;
      }

      /* Zeilen-Vorlage aus styles.ts (monitor): Name | Leiste | Status · Zeit, dazu ⋮ */
      .axis {
        margin-right: 48px;
      }
      .monitor.readonly .axis {
        margin-right: 0;
      }
      .mrow {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 48px;
        align-items: center;
        border-bottom: 1px solid var(--pu-line);
      }
      .monitor.readonly .mrow {
        grid-template-columns: minmax(0, 1fr);
      }
      .main {
        min-height: max(48px, var(--pu-hit));
        padding: 0;
        border: 0;
        background: none;
        color: var(--pu-ink);
        font: inherit;
        text-align: start;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      @media (hover: hover) {
        .mrow:hover,
        .group:hover {
          background: color-mix(in srgb, var(--pu-ink) 3%, transparent);
        }
      }
      .mrow:active {
        background: color-mix(in srgb, var(--pu-ink) 6%, transparent);
      }
      .main:focus-visible,
      .group:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 3px;
        border-radius: var(--pu-r-8);
      }
      .group {
        display: flex;
        align-items: center;
        gap: var(--pu-sp-8);
        width: 100%;
        min-height: max(44px, var(--pu-hit));
        padding: var(--pu-sp-24) 0 var(--pu-sp-8);
        border: 0;
        border-bottom: 1px solid var(--pu-line);
        background: none;
        color: var(--pu-muted);
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        text-align: start;
        cursor: pointer;
        --mdc-icon-size: 18px;
      }
      .group .count {
        font-weight: 500;
        color: var(--pu-faint);
      }
      .empty {
        margin: 0;
        padding: var(--pu-sp-32) 20px;
        text-align: center;
      }
      .menu {
        display: flex;
        justify-content: center;
      }
      /* Handy: Name + Status oben (⋮ daneben), Leiste darunter über die ganze Breite */
      @container (max-width: 600px) {
        .axis {
          margin-right: 0;
        }
        .toolbar {
          padding-top: var(--pu-sp-12);
        }
        .search {
          flex-basis: 100%;
        }
        .mrow {
          grid-template-columns: minmax(0, 1fr) 44px;
          align-items: start;
        }
        .main.rowgrid {
          padding: var(--pu-sp-12) 0 18px;
        }
        .menu {
          margin-top: 4px;
        }
      }
    `
		];
	}
});
//#endregion
//#region src/pulse-dayband.ts
var cr = (e) => `${(e / 24 * 100).toFixed(2)}%`;
I("pulse-dayband", class extends N {
	static {
		this.properties = {
			settings: { attribute: !1 },
			language: { type: String },
			now: { type: Number },
			recipients: { type: String },
			timeZone: { attribute: !1 }
		};
	}
	constructor() {
		super(), this.language = "en", this.now = 0, this.recipients = "", this.timeZone = void 0;
	}
	render() {
		let e = this.language, t = this.settings, n = it(this.now, this.timeZone), r = tn(t.summary_time), i = t.quiet.enabled ? nn(t.quiet.start, t.quiet.end) : [], a = yn(e, t);
		return E`<div class="top">
        <span class="cap">${L(e, "day_title")}</span>
        <span class="to">${this.recipients}</span>
      </div>
      <p class="line">${a}</p>
      <div class="band" role="img" aria-label=${`${L(e, "day_title")}: ${a}`}>
        <div class="track" aria-hidden="true">
          ${i.map(([e, t]) => E`<span class="quiet" style=${`left: ${cr(e)}; width: ${cr(t - e)}`}></span>`)}
          <span class="nowline" style=${`left: ${cr(n)}`}></span>
          <span class="dot" style=${`left: ${cr(r)}`}></span>
        </div>
        <div class="hours mono" aria-hidden="true">
          ${[
			0,
			6,
			12,
			18,
			24
		].map((t) => E`<span>${L(e, "hour_label", { h: t })}</span>`)}
        </div>
      </div>`;
	}
	static {
		this.styles = [
			J,
			X,
			o`
      /* Haarlinie oben wie beim Monitor statt Rahmen und Fläche */
      :host {
        display: block;
        padding: var(--pu-sp-16) 0 0;
        border-top: 1px solid var(--pu-line);
        box-sizing: border-box;
        min-width: 0;
      }
      .top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--pu-sp-12);
      }
      .to {
        font-size: var(--pu-fs-13);
        color: var(--pu-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .line {
        margin: var(--pu-sp-4) 0 0;
        font-size: var(--pu-fs-13);
        color: var(--pu-ink);
        font-variant-numeric: tabular-nums;
      }
      .band {
        position: relative;
        margin-top: var(--pu-sp-12);
      }
      .track {
        position: relative;
        height: 14px;
        border-radius: 7px;
        background: var(--pu-track);
      }
      .quiet {
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: 7px;
        background: color-mix(in srgb, var(--pu-accent) 16%, transparent);
      }
      /* „jetzt“: feiner Strich über dem Punkt */
      .nowline {
        position: absolute;
        z-index: 1;
        top: -5px;
        bottom: -5px;
        width: 2px;
        margin-left: -1px;
        background: var(--pu-muted);
        border-radius: 1px;
      }
      .dot {
        position: absolute;
        top: 50%;
        width: 14px;
        height: 14px;
        margin: -10px 0 0 -10px;
        border-radius: 50%;
        background: var(--pu-accent);
        border: 3px solid var(--primary-background-color, #fff);
      }
      .hours {
        display: flex;
        justify-content: space-between;
        margin-top: var(--pu-sp-8);
        font-size: var(--pu-fs-11);
        color: var(--pu-faint);
      }
    `
		];
	}
});
//#endregion
//#region src/pulse-overview.ts
var lr = "pulse.closedRooms";
function ur() {
	try {
		let e = JSON.parse(window.localStorage.getItem(lr) ?? "[]");
		return new Set(Array.isArray(e) ? e.filter((e) => typeof e == "string") : []);
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
function dr(e) {
	try {
		window.localStorage.setItem(lr, JSON.stringify([...e]));
	} catch {}
}
I("pulse-overview", class extends N {
	static {
		this.properties = {
			snapshot: { attribute: !1 },
			language: { type: String },
			now: { type: Number },
			recipients: { type: String },
			timeZone: { attribute: !1 },
			timeFormat: { attribute: !1 },
			dayStarts: { attribute: !1 },
			noData: { attribute: !1 },
			readonly: { type: Boolean },
			closed: { state: !0 }
		};
	}
	constructor() {
		super(), this.gapsOf = R(ln), this.gaps = [], this.language = "en", this.now = 0, this.recipients = "", this.timeZone = void 0, this.timeFormat = void 0, this.dayStarts = [], this.noData = [], this.readonly = !1, this.closed = ur();
	}
	fire(e, t = {}) {
		this.dispatchEvent(new CustomEvent(e, {
			detail: t,
			bubbles: !0,
			composed: !0
		}));
	}
	show(e) {
		this.fire("show-devices", { filter: e });
	}
	toggleRoom(e) {
		let t = new Set(this.closed);
		t.has(e) ? t.delete(e) : t.add(e), this.closed = t, dr(t);
	}
	renderRow(e) {
		let t = this.language, n = $t(t, e, this.now), r = K(e) && e.last_activity !== null ? mt(t, e.last_activity, this.now, this.timeZone, this.timeFormat) : Xe(t, e.last_activity, this.now);
		return E`<button class="mrow rowgrid" type="button" @click=${() => this.fire("open", { id: e.id })}>
      <span class="nm">
        <ha-icon class=${`t-${e.ignored ? "ok" : V(e)}`} .icon=${e.icon}></ha-icon>
        <span class="who">
          <span class="title"><b>${e.name}</b>${e.critical && !e.ignored ? E`<span class="star" role="img" aria-label=${L(t, "important_badge")} title=${L(t, "important_badge")}><ha-icon icon="mdi:star"></ha-icon></span>` : k}</span>
          ${e.area ? E`<span class="room">${e.area}</span>` : k}
        </span>
      </span>
      <pulse-rhythm
        .buckets=${e.strip}
        tone=${V(e)}
        ?learning=${e.status === "learning" && !e.ignored}
        .gaps=${this.gaps}
        .days=${Math.max(1, this.dayStarts.length - 1)}
        .silentFrom=${gn(e, this.dayStarts)}
        .flag=${Qt(t, e, this.now)}
      ></pulse-rhythm>
      <span class="st">
        ${n ? E`<b class=${`t-${n.tone}`}>${n.text}</b><span class="sep"> · </span>` : k}<span class="num time">${r}</span>
      </span>
    </button>`;
	}
	renderSection(e, t) {
		let n = this.language, r = E`<div class="grp">
      <span>${L(n, Yt(e))}</span><span class="count">${t.length}</span>
    </div>`;
		return e !== "rhythm" || t.length <= 12 ? E`${r}${t.map((e) => this.renderRow(e))}` : E`${r}${Ye(t, L(n, "no_area")).map((e) => {
			let t = this.closed.has(e.area);
			return E`<button class="room-head" type="button" aria-expanded=${t ? "false" : "true"} @click=${() => this.toggleRoom(e.area)}>
          <ha-icon icon=${t ? "mdi:chevron-right" : "mdi:chevron-down"}></ha-icon>
          <span>${e.area}</span><span class="count">${e.devices.length}</span>
        </button>
        ${t ? k : e.devices.map((e) => this.renderRow(e))}`;
		})}`;
	}
	renderZigbee() {
		let e = this.language, t = this.snapshot.z2m, n = E`<span class="cap">${L(e, "welcome_zigbee_title")}</span>`;
		if (!t.present) return k;
		if (t.last_seen && t.availability) return E`<div class="fact zig">${n}<b class="t-ok on"><ha-icon icon="mdi:check-circle"></ha-icon>${L(e, "zigbee_active")}</b><span class="sub">${L(e, "zigbee_devices")}: ${t.devices}</span></div>`;
		let r = t.requested_at !== null && this.now - t.requested_at < 120;
		return this.readonly ? E`<div class="fact zig">${n}<b>${r ? L(e, "zigbee_requested") : L(e, "off")}</b><span class="sub">${L(e, "zigbee_hint")}</span></div>` : E`<div
      class="fact zig tappable"
      role="switch"
      aria-checked="false"
      tabindex="0"
      @click=${() => this.fire("enable-z2m")}
      @keydown=${(e) => {
			(e.key === "Enter" || e.key === " ") && (e.preventDefault(), this.fire("enable-z2m"));
		}}
    >
      ${n}
      <span class="line">
        <b>${r ? L(e, "zigbee_requested") : L(e, "off")}</b>
        ${r ? k : E`<ha-switch tabindex="-1" aria-hidden="true"></ha-switch>`}
      </span>
      <span class="sub">${L(e, "zigbee_hint")}</span>
    </div>`;
	}
	renderBattery() {
		let e = this.language, t = this.snapshot, n = t.summary.due_batteries, r = Mt(e, t.summary.low_batteries ?? []), i = t.summary.low_batteries ?? [], a = n === void 0 ? t.summary.next_battery ?? "" : Tn(e, n.filter((e) => !i.includes(e.name))), o = r.tone === "ok" && n?.length ? L(e, n.length === 1 ? "battery_due_one" : "battery_due_many", { count: n.length }) : r.label, s = wt(t.devices, (n ?? []).map((e) => e.id)), c = E`<span class="cap">${L(e, "batteries")}</span>
      <b class=${r.tone === "warn" ? "t-warn" : ""}>${o}</b>
      ${r.value ? E`<span class="sub">${r.value}</span>` : k}
      <span class="sub">${a || (r.value ? "" : L(e, "nothing_due"))}</span>`;
		return s.length ? E`<button class="fact tappable" type="button" @click=${() => {
			let [e] = s;
			s.length === 1 && e ? this.fire("open", { id: e.id }) : this.show("battery");
		}}>${c}</button>` : E`<div class="fact">${c}</div>`;
	}
	renderFacts() {
		let e = this.language, t = this.snapshot, n = St(t.devices), r = t.devices.filter((e) => e.ignored).length;
		return E`<section class="facts">
      ${this.renderBattery()}
      ${n ? E`<button class="fact tappable" type="button" @click=${() => this.fire("open", { id: n.device.id })}>
              <span class="cap">${L(e, "last_change")}</span>
              <b>${Dt(e, n.at, this.now, this.timeZone)}</b>
              <span class="sub">${n.device.name}</span>
            </button>` : E`<div class="fact"><span class="cap">${L(e, "last_change")}</span><b>${L(e, "unknown")}</b><span class="sub">${L(e, "never_replaced")}</span></div>`}
      ${this.renderZigbee()}
      ${r ? E`<button class="fact tappable" type="button" @click=${() => this.show("ignored")}>
              <span class="cap">${L(e, "ignored")}</span>
              <b>${L(e, "ignored_count", { count: r })}</b>
              <span class="sub">${L(e, "show_list")}</span>
            </button>` : k}
    </section>`;
	}
	render() {
		let e = this.language, t = this.snapshot, n = Wt(e, t.devices), r = Dn(e, t.summary.cloud_outages), i = {
			accent: "grad",
			warn: "t-warn",
			crit: "t-crit",
			plain: ""
		}[n.tone], a = Kt(e, t.devices, this.now, this.timeZone), o = Xt(t.devices);
		this.gaps = this.gapsOf(this.noData, this.dayStarts);
		let s = t.devices.filter((e) => !e.ignored).length, c = s === 1 ? L(e, "monitor_head_one") : L(e, "monitor_head", { count: s }), l = st(e, this.dayStarts, this.timeZone);
		return E`<div class="page">
      <section class="hero">
        <div class="words">
          <h2 class="hl">
            <span class="long">${n.line1}</span><span class="short">${n.line1Short}</span><br />
            <span class=${`l2 long ${i}`}>${n.line2}</span><span class=${`l2 short ${i}`}>${n.line2Short}</span>
          </h2>
          <p class="hsub">
            ${n.sub ? E`<span class="ok-line">${n.sub}</span>` : k}
            ${a.mentions.map((e) => E`${e.before}<b class=${`t-${e.tone}`}>${e.name}</b>${e.after} `)}${a.text}
          </p>
          ${r.map((e) => E`<p class="cloud"><ha-icon icon="mdi:cloud-off-outline"></ha-icon><span>${e}</span></p>`)}
        </div>
        ${this.readonly ? E`<pulse-dayband
                .settings=${t.settings}
                .language=${e}
                .timeZone=${this.timeZone}
                .now=${this.now}
                .recipients=${this.recipients}
              ></pulse-dayband>` : E`<pulse-dayband
                class="tappable"
                role="button"
                tabindex="0"
                .settings=${t.settings}
                .language=${e}
                .timeZone=${this.timeZone}
                .now=${this.now}
                .recipients=${this.recipients}
                @click=${() => this.fire("show-settings")}
                @keydown=${(e) => {
			(e.key === "Enter" || e.key === " ") && (e.preventDefault(), this.fire("show-settings"));
		}}
              ></pulse-dayband>`}
      </section>

      <section class="monitor" aria-label=${c}>
        <div class="axis">
          <span>${c}</span>
          <div class="days mono" style=${`grid-template-columns: ${ct(this.dayStarts)}`}>${l.map((e) => E`<span>${e.replace(".", "")}</span>`)}</div>
          <span class="right">${L(e, "col_last")}</span>
        </div>
        ${o.map((e) => this.renderSection(e.key, e.devices))}
      </section>

      ${this.renderFacts()}
    </div>`;
	}
	static {
		this.styles = [
			J,
			Y,
			X,
			Fn,
			o`
      :host {
        display: block;
        container-type: inline-size;
      }
      /* ── Schlagzeile ── */
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(360px, 470px);
        gap: var(--pu-sp-24) var(--pu-sp-48);
        align-items: end;
      }
      .hl {
        margin: 0;
        font-family: var(--pu-display);
        font-size: clamp(34px, 4.6cqi, var(--pu-fs-56));
        line-height: 1.02;
        font-weight: 800;
        letter-spacing: -0.025em;
        text-wrap: balance;
      }
      .short {
        display: none;
      }
      .hsub {
        margin: var(--pu-sp-16) 0 0;
        max-width: 46ch;
        font-size: clamp(var(--pu-fs-15), 1.7cqi, var(--pu-fs-20));
        line-height: 1.42;
        letter-spacing: -0.01em;
        color: var(--pu-muted);
        text-wrap: pretty;
      }
      .hsub b {
        font-weight: 600;
        white-space: nowrap;
      }
      .hsub b.t-ok {
        color: var(--pu-ink);
      }
      /* „2 von 10 im Takt.“ – eigene Zeile über den Sätzen */
      .ok-line {
        display: block;
        margin-bottom: var(--pu-sp-4);
        color: var(--pu-ink);
        font-weight: 600;
      }
      /* Ruhiger Sammelhinweis bei Cloud-Ausfall: grau, kein Alarm */
      .cloud {
        display: flex;
        align-items: flex-start;
        gap: var(--pu-sp-8);
        margin: var(--pu-sp-12) 0 0;
        max-width: 46ch;
        font-size: var(--pu-fs-15);
        line-height: 1.4;
        color: var(--pu-muted);
        --mdc-icon-size: 18px;
      }
      .cloud ha-icon {
        flex: none;
        margin-top: 1px;
      }
      pulse-dayband.tappable {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      pulse-dayband:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 2px;
      }

      /* ── Monitor ── */
      .monitor {
        margin-top: var(--pu-sp-32);
        border-top: 1px solid var(--pu-line);
      }
      .mrow {
        width: 100%;
        min-height: max(44px, var(--pu-hit));
        padding: 0;
        border: 0;
        border-bottom: 1px solid var(--pu-line);
        background: none;
        color: var(--pu-ink);
        font: inherit;
        text-align: start;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.15s;
      }
      @media (hover: hover) {
        .mrow:hover,
        .room-head:hover,
        .fact.tappable:hover {
          background: color-mix(in srgb, var(--pu-ink) 3%, transparent);
        }
      }
      .mrow:active {
        background: color-mix(in srgb, var(--pu-ink) 6%, transparent);
      }
      /* Fokusring mit Luft zum Text (nur Tastatur) */
      .mrow:focus-visible,
      .room-head:focus-visible,
      .fact.tappable:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 3px;
        border-radius: var(--pu-r-8);
      }
      .room-head {
        display: flex;
        align-items: center;
        gap: var(--pu-sp-8);
        width: 100%;
        min-height: max(40px, var(--pu-hit));
        padding: 0;
        border: 0;
        border-bottom: 1px solid var(--pu-line);
        background: none;
        color: var(--pu-ink);
        font: inherit;
        font-size: var(--pu-fs-15);
        font-weight: 600;
        text-align: start;
        cursor: pointer;
        --mdc-icon-size: 18px;
      }
      .room-head ha-icon {
        color: var(--pu-muted);
      }
      .room-head .count {
        color: var(--pu-faint);
        font-weight: 500;
      }

      /* ── Fakten unten ── */
      .facts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        margin-top: var(--pu-sp-32);
        border-top: 1px solid var(--pu-line);
      }
      .fact {
        display: grid;
        align-content: start;
        gap: var(--pu-sp-4);
        min-width: 0;
        padding: var(--pu-sp-16);
        border: 0;
        border-inline-start: 1px solid var(--pu-line);
        background: none;
        color: var(--pu-ink);
        font: inherit;
        text-align: start;
      }
      .fact:first-child {
        border-inline-start: 0;
        padding-inline-start: 0;
      }
      .fact.tappable {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .fact b {
        font-size: var(--pu-fs-17);
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      /* Hinweise höchstens zweizeilig statt abgeschnitten */
      .fact .sub {
        font-size: var(--pu-fs-13);
        line-height: 1.35;
        color: var(--pu-muted);
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .fact .sub:empty {
        display: none;
      }
      .fact .line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--pu-sp-12);
      }
      .fact ha-switch {
        pointer-events: none;
      }
      .on {
        display: inline-flex;
        align-items: center;
        gap: var(--pu-sp-4);
        --mdc-icon-size: 18px;
      }

      /* Schmaleres Panel (z. B. 1024 mit Seitenleiste): Tagesband unter die Schlagzeile */
      @container (max-width: 1000px) {
        .hero {
          grid-template-columns: minmax(0, 1fr);
        }
        pulse-dayband {
          max-width: 560px;
        }
      }
      /* Handy: Name und Status oben, Leiste darunter; Tagesband unter den Monitor */
      @container (max-width: 600px) {
        .page {
          display: flex;
          flex-direction: column;
        }
        .hero {
          display: contents;
        }
        .words {
          order: 1;
        }
        .monitor {
          order: 2;
          margin-top: var(--pu-sp-24);
        }
        pulse-dayband {
          order: 3;
          max-width: none;
          margin-top: var(--pu-sp-32);
        }
        .facts {
          order: 4;
          grid-template-columns: 1fr 1fr;
        }
        .long {
          display: none;
        }
        .short {
          display: inline;
        }
        .hl {
          font-size: clamp(34px, 10.5cqi, var(--pu-fs-42));
        }
        .hsub {
          font-size: var(--pu-fs-15);
        }
        /* Luft unter jeder Zeile (die Leiste klebt sonst an der nächsten) */
        .mrow.rowgrid {
          padding: var(--pu-sp-12) 0 18px;
        }
        .fact {
          border-inline-start: 0;
          padding-inline: 0;
          border-bottom: 1px solid var(--pu-line);
        }
        .fact:nth-child(even) {
          padding-inline-start: var(--pu-sp-16);
          border-inline-start: 1px solid var(--pu-line);
        }
        /* Zigbee-Lebenszeichen: Schalter + zweizeiliger Hinweis brauchen die ganze Breite */
        .fact.zig {
          grid-column: 1 / -1;
          padding-inline-start: 0;
          border-inline-start: 0;
        }
        .fact.zig .sub {
          -webkit-line-clamp: 3;
        }
        .fact.zig ~ .fact {
          padding-inline-start: 0;
          border-inline-start: 0;
        }
      }
    `
		];
	}
}), I("pulse-segmented", class extends N {
	static {
		this.properties = {
			options: { attribute: !1 },
			value: { type: String },
			label: { type: String }
		};
	}
	constructor() {
		super(), this.options = [], this.value = "", this.label = "";
	}
	pick(e) {
		e !== this.value && this.dispatchEvent(new CustomEvent("change", { detail: { value: e } }));
	}
	render() {
		return E`<nav aria-label=${this.label}>
      ${this.options.map((e) => E`<button
          type="button"
          aria-current=${e.value === this.value ? "page" : k}
          class=${e.value === this.value ? "active" : ""}
          @click=${() => this.pick(e.value)}
        >
          ${e.label}
        </button>`)}
    </nav>`;
	}
	static {
		this.styles = [J, o`
      :host {
        display: block;
        max-width: 100%;
      }
      nav {
        display: flex;
        gap: clamp(4px, 1.6vw, 14px);
      }
      button {
        position: relative;
        flex: none;
        min-height: var(--pu-hit);
        padding: 0 6px;
        border: 0;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        color: var(--pu-muted);
        background: transparent;
        transition: color 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      button::after {
        content: '';
        position: absolute;
        left: 6px;
        right: 6px;
        bottom: calc(50% - 15px);
        height: 2px;
        border-radius: 2px;
        background: transparent;
        transition: background 0.15s;
      }
      button.active {
        color: var(--pu-ink);
      }
      button.active::after {
        background: var(--pu-ink);
      }
      @media (hover: hover) {
        button:not(.active):hover {
          color: var(--pu-ink);
        }
      }
      button:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: -2px;
        border-radius: 8px;
      }
      @media (max-width: 420px) {
        button {
          font-size: 13px;
          padding: 0 4px;
        }
        button::after {
          left: 4px;
          right: 4px;
        }
      }
    `];
	}
});
//#endregion
//#region node_modules/lit-html/directive.js
var $ = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, fr = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), pr = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: mr } = Ae, hr = (e) => e.strings === void 0, gr = {}, _r = (e, t = gr) => e._$AH = t, vr = fr(class extends pr {
	constructor(e) {
		if (super(e), e.type !== $.PROPERTY && e.type !== $.ATTRIBUTE && e.type !== $.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!hr(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === O || t === k) return t;
		let n = e.element, r = e.name;
		if (e.type === $.PROPERTY) {
			if (t === n[r]) return O;
		} else if (e.type === $.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return O;
		} else if (e.type === $.ATTRIBUTE && n.getAttribute(r) === t + "") return O;
		return _r(e), t;
	}
}), yr = [
	"failed",
	"check",
	"battery",
	"recovered"
], br = {
	failed: "tpl_failed",
	check: "tpl_check",
	battery: "tpl_battery",
	recovered: "tpl_recovered"
};
I("pulse-template-sheet", class extends N {
	static {
		this.properties = {
			open: { type: Boolean },
			kind: { type: String },
			language: { type: String },
			current: { attribute: !1 },
			defaults: { attribute: !1 },
			vars: { attribute: !1 },
			example: { attribute: !1 },
			draftTitle: { state: !0 },
			draftMessage: { state: !0 }
		};
	}
	constructor() {
		super(), this.focused = "message", this.open = !1, this.kind = "failed", this.language = "en", this.current = {}, this.defaults = {}, this.vars = [], this.example = {}, this.draftTitle = "", this.draftMessage = "";
	}
	willUpdate(e) {
		(e.has("open") || e.has("kind")) && this.open && (this.draftTitle = this.value("title"), this.draftMessage = this.value("message"));
	}
	value(e) {
		let t = `${this.kind}_${e}`;
		return this.current[t] ?? this.defaults[t] ?? "";
	}
	insert(e) {
		let t = `{${e}}`, n = this.focused, r = this.renderRoot.querySelector(n === "title" ? "input" : "textarea"), i = n === "title" ? this.draftTitle : this.draftMessage, a = r?.selectionStart ?? i.length, o = r?.selectionEnd ?? i.length, s = i.slice(0, a) + t + i.slice(o);
		n === "title" ? this.draftTitle = s : this.draftMessage = s, this.updateComplete.then(() => {
			r?.focus(), r?.setSelectionRange(a + t.length, a + t.length);
		});
	}
	save(e) {
		let t = (t, n) => {
			let r = n.trim();
			return e || !r || r === this.defaults[`${this.kind}_${t}`] ? null : r;
		};
		this.dispatchEvent(new CustomEvent("template-save", {
			detail: { templates: {
				[`${this.kind}_title`]: t("title", this.draftTitle),
				[`${this.kind}_message`]: t("message", this.draftMessage)
			} },
			bubbles: !0,
			composed: !0
		})), this.close();
	}
	close() {
		this.dispatchEvent(new CustomEvent("closed", {
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		let e = this.language, t = (e) => Nn(e, this.example, this.vars), n = this.current[`${this.kind}_title`] != null || this.current[`${this.kind}_message`] != null;
		return E`<pulse-sheet
      no-close
      .open=${this.open}
      .heading=${L(e, br[this.kind])}
      .language=${e}
      @closed=${() => this.close()}
    >
      <div class="body">
        <label class="field">
          <span class="cap">${L(e, "tpl_title_field")}</span>
          <input
            type="text"
            maxlength="300"
            .value=${vr(this.draftTitle)}
            @focus=${() => {
			this.focused = "title";
		}}
            @input=${(e) => {
			e.target instanceof HTMLInputElement && (this.draftTitle = e.target.value);
		}}
          />
        </label>
        <label class="field">
          <span class="cap">${L(e, "tpl_message_field")}</span>
          <textarea
            rows="3"
            maxlength="300"
            .value=${vr(this.draftMessage)}
            @focus=${() => {
			this.focused = "message";
		}}
            @input=${(e) => {
			e.target instanceof HTMLTextAreaElement && (this.draftMessage = e.target.value);
		}}
          ></textarea>
        </label>
        <div>
          <span class="cap">${L(e, "tpl_vars")}</span>
          <div class="chips">
            ${this.vars.map((e) => E`<button class="chip" type="button" @mousedown=${(e) => e.preventDefault()} @click=${() => this.insert(e)}>{${e}}</button>`)}
          </div>
          <p class="hint">${L(e, "tpl_vars_hint")}</p>
        </div>
        ${Object.keys(this.example).length ? E`<div class="preview" aria-live="polite">
                <span class="cap">${L(e, "tpl_preview")}</span>
                <div class="bubble">
                  <b>${t(this.draftTitle) || this.example.name}</b>
                  <span>${t(this.draftMessage)}</span>
                </div>
              </div>` : k}
      </div>
      ${n ? E`<button slot="footer" class="pbtn" type="button" @click=${() => this.save(!0)}>${L(e, "tpl_reset")}</button>` : k}
      <button slot="footer" class="pbtn" type="button" @click=${() => this.close()}>${L(e, "cancel")}</button>
      <button slot="footer" class="pbtn primary" type="button" @click=${() => this.save(!1)}>${L(e, "tpl_save")}</button>
    </pulse-sheet>`;
	}
	static {
		this.styles = [
			J,
			Y,
			X,
			o`
      .body {
        display: grid;
        gap: 18px;
      }
      .cap {
        display: block;
        margin-bottom: 6px;
        font-size: var(--pu-fs-13);
        color: var(--pu-muted);
      }
      input,
      textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: var(--pu-hit);
        padding: 10px 12px;
        border: 1px solid transparent;
        border-radius: 10px;
        background: var(--pu-fill);
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-15);
        resize: vertical;
      }
      input:focus,
      textarea:focus {
        outline: none;
        border-color: var(--pu-accent);
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .chip {
        min-height: 32px;
        padding: 0 10px;
        border: 0;
        border-radius: 999px;
        background: var(--pu-fill);
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-13);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        cursor: pointer;
      }
      .hint {
        margin: 8px 0 0;
        font-size: var(--pu-fs-13);
        line-height: 1.4;
        color: var(--pu-muted);
      }
      .bubble {
        display: grid;
        gap: 2px;
        padding: 12px 14px;
        border-radius: 14px;
        background: var(--pu-fill);
        font-size: var(--pu-fs-15);
        line-height: 1.35;
        white-space: pre-line;
      }
    `
		];
	}
}), I("pulse-settings", class extends N {
	static {
		this.properties = {
			snapshot: { attribute: !1 },
			language: { type: String },
			now: { type: Number },
			recipients: { type: String },
			names: { attribute: !1 },
			timeZone: { attribute: !1 },
			editing: { state: !0 }
		};
	}
	constructor() {
		super(), this.language = "en", this.now = 0, this.recipients = "", this.names = {}, this.timeZone = void 0, this.editing = null;
	}
	save(e) {
		this.dispatchEvent(new CustomEvent("settings-change", {
			detail: { settings: e },
			bubbles: !0,
			composed: !0
		}));
	}
	fire(e, t = {}) {
		this.dispatchEvent(new CustomEvent(e, {
			detail: t,
			bubbles: !0,
			composed: !0
		}));
	}
	linkRow(e, t, n) {
		return E`<button class="row link" type="button" @click=${n}>
      <span class="label">${e}</span>
      <span class="value">${t}</span>
      <ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
    </button>`;
	}
	z2mOptionRow(e, t, n, r, i) {
		let a = this.language, o = E`<span class="label">${L(a, e)}<small>${L(a, t)}</small></span>`;
		return n ? E`<div class="row">${o}<span class="value t-ok on"><ha-icon icon="mdi:check-circle"></ha-icon>${L(a, "zigbee_active")}</span></div>` : typeof r == "number" && this.now - r < 120 ? E`<div class="row">${o}<span class="value">${L(a, "zigbee_requested")}</span></div>` : this.toggleRow(o, !1, () => this.fire(i));
	}
	onZ2mBase(e) {
		let t = e.target;
		if (!(t instanceof HTMLInputElement)) return;
		let n = this.snapshot.settings.z2m_base, r = gt(t.value);
		if (r === null) {
			P(this, L(this.language, "z2m_base_invalid")), t.value = n;
			return;
		}
		t.value = r, r !== n && this.save({ z2m_base: r });
	}
	targetLabel(e) {
		return this.names[e] ?? e.replace(/^mobile_app_/, "").replaceAll("_", " ");
	}
	toggleTarget(e, t) {
		let n = this.snapshot.settings.targets ?? this.snapshot.targets, r = t ? [.../* @__PURE__ */ new Set([...n, e])] : n.filter((t) => t !== e);
		this.save({ targets: r });
	}
	times(e) {
		return xt(e).map((e) => ({
			value: e,
			label: e
		}));
	}
	togglePerson(e, t) {
		let n = bn(this.snapshot.settings), r = t ? [.../* @__PURE__ */ new Set([...n, e])] : n.filter((t) => t !== e);
		this.save({ arrive_home: { persons: r } });
	}
	pickerRow(e, t, n, r, i) {
		let a = this.language;
		return E`<div class=${i ? "row has-icon" : "row"}>
      ${i ? E`<ha-icon class=${`ico ${i.tone}`} icon=${i.icon}></ha-icon>` : k}
      <span class="label">${L(a, e)}</span>
      <pulse-picker
        .language=${a}
        .label=${L(a, e)}
        .value=${t}
        .options=${n}
        @change=${(e) => r(e.detail.value)}
      ></pulse-picker>
    </div>`;
	}
	toggleRow(e, t, n, r = !1) {
		return E`<div
      class=${r ? "row has-icon tappable" : "row tappable"}
      role="switch"
      tabindex="0"
      aria-checked=${t ? "true" : "false"}
      @click=${() => n(!t)}
      @keydown=${(e) => {
			(e.key === "Enter" || e.key === " ") && (e.preventDefault(), n(!t));
		}}
    >
      ${e}
      <ha-switch tabindex="-1" aria-hidden="true" .checked=${t}></ha-switch>
    </div>`;
	}
	switchRow(e, t, n, r) {
		let i = this.language;
		return this.toggleRow(E`<span class="label">${L(i, e)}${r ? E`<small>${L(i, r)}</small>` : k}</span>`, t, n);
	}
	render() {
		let e = this.language, t = this.snapshot, n = t.settings, r = n.targets ?? t.targets, i = [
			{
				value: "now",
				label: L(e, "level_now")
			},
			{
				value: "daily",
				label: L(e, "level_daily")
			},
			{
				value: "off",
				label: L(e, "level_off")
			}
		], a = (e, t, r, a) => this.pickerRow(t, n.levels[e], i, (t) => this.save({ levels: { [e]: t } }), {
			icon: r,
			tone: a
		}), o = bn(n), s = xn(e, n), c = Et(t.devices), l = t.z2m, u = n.templates ?? {}, d = U(t.devices), f = d.filter((e) => e.mains).length, p = d.find((e) => e.area && !e.mains) ?? d[0];
		return E`
      <section class="hero">
        <div class="words">
          <h2 class="hl">${s.line1}<br /><span class="grad">${s.line2}</span></h2>
          <p class="hsub">${s.sub}</p>
        </div>
        <pulse-dayband
          .settings=${n}
          .language=${e}
          .timeZone=${this.timeZone}
          .now=${this.now}
          .recipients=${this.recipients}
        ></pulse-dayband>
      </section>

      <div class="cols">

      <section class="section">
        <h3 class="section-title">${L(e, "recipients")}</h3>
        <div class="list">
          ${t.targets.length ? t.targets.map((e) => this.toggleRow(E`<ha-icon class="ico" icon="mdi:cellphone"></ha-icon>
                      <span class=${this.names[e] ? "label" : "label capname"}>${this.targetLabel(e)}</span>`, r.includes(e), (t) => this.toggleTarget(e, t), !0)) : E`<div class="row"><span class="label muted">${L(e, "recipients_none")}</span></div>`}
        </div>
        ${t.targets.length ? E`<p class="section-foot">${L(e, "recipients_hint")}</p>` : k}
      </section>

      <section class="section">
        <h3 class="section-title">${L(e, "when")}</h3>
        <div class="list">
          ${a("failed", "level_failed", "mdi:heart-broken-outline", "t-crit")}
          ${a("check", "level_check", "mdi:alert-circle-outline", "t-warn")}
          ${a("battery", "level_battery", "mdi:battery-low", "")}
        </div>
        <p class="section-foot">${L(e, "levels_hint")}</p>
      </section>

      <section class="section">
        <h3 class="section-title">${L(e, "times")}</h3>
        <div class="list">
          ${this.pickerRow("summary_time", n.summary_time, this.times(n.summary_time), (e) => this.save({ summary_time: e }))}
          ${this.switchRow("quiet", n.quiet.enabled, (e) => this.save({ quiet: { enabled: e } }))}
          ${n.quiet.enabled ? E`${this.pickerRow("quiet_from", n.quiet.start, this.times(n.quiet.start), (e) => this.save({ quiet: { start: e } }))}
                ${this.pickerRow("quiet_to", n.quiet.end, this.times(n.quiet.end), (e) => this.save({ quiet: { end: e } }))}` : k}
        </div>
        ${n.quiet.enabled ? E`<p class="section-foot">${L(e, "quiet_hint")}</p>` : k}
      </section>

      <section class="section">
        <h3 class="section-title">${L(e, "special")}</h3>
        <div class="list">
          ${this.switchRow("critical", n.critical_alerts, (e) => this.save({ critical_alerts: e }), "critical_hint")}
          ${this.linkRow(L(e, "important_devices"), String(c), () => this.fire("show-devices", { filter: "important" }))}
          ${this.switchRow("arrive", n.arrive_home.enabled, (e) => this.save({ arrive_home: {
			enabled: e,
			persons: o.length || !e ? o : t.persons.slice(0, 1)
		} }), "arrive_hint")}
          ${n.arrive_home.enabled ? t.persons.length ? t.persons.map((e) => this.toggleRow(E`<ha-icon class="ico" icon="mdi:account-outline"></ha-icon>
                        <span class="label">${this.names[e] ?? e}</span>`, o.includes(e), (t) => this.togglePerson(e, t), !0)) : E`<div class="row"><span class="label muted">${L(e, "persons_none")}</span></div>` : k}
          ${this.switchRow("recovered", n.recovered, (e) => this.save({ recovered: e }), "recovered_hint")}
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">${L(e, "zigbee")}</h3>
        ${l.present ? E`<div class="list z2m">
                ${this.z2mOptionRow("welcome_zigbee_title", "zigbee_hint", l.last_seen && l.availability, l.requested_at, "enable-z2m")}
                ${this.z2mOptionRow("health_title", "health_hint", l.health === !0, l.health_requested_at, "enable-z2m-health")}
              </div>` : k}
        <details class="list adv">
          <summary class="row">
            <span class="label">${L(e, "advanced")}</span>
            <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
          </summary>
          <label class="row">
            <span class="label">${L(e, "z2m_base")}</span>
            <input
              class="text"
              type="text"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              placeholder="zigbee2mqtt"
              .value=${vr(n.z2m_base)}
              @change=${(e) => this.onZ2mBase(e)}
              @keydown=${(e) => {
			e.key === "Enter" && e.currentTarget instanceof HTMLInputElement && e.currentTarget.blur();
		}}
            />
          </label>
          <p class="row adv-hint">${L(e, "z2m_base_hint")}</p>
        </details>
      </section>

      <section class="section">
        <h3 class="section-title">${L(e, "texts")}</h3>
        <div class="list">
          ${yr.map((t) => this.linkRow(L(e, br[t]), L(e, u[`${t}_title`] != null || u[`${t}_message`] != null ? "tpl_custom" : "tpl_default"), () => {
			this.editing = t;
		}))}
        </div>
        <p class="section-foot">${L(e, "texts_hint")}</p>
      </section>

      <section class="section">
        <h3 class="section-title">${L(e, "beta")}</h3>
        <div class="list">
          ${this.switchRow("mains_beta", n.mains_beta ?? !0, (e) => this.save({ mains_beta: e }), "mains_beta_hint")}
          ${n.mains_beta ? this.linkRow(L(e, "mains_devices"), String(f), () => this.fire("show-devices", { filter: "mains" })) : k}
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">${L(e, "try_it")}</h3>
        <div class="list">
          <button class="row action" type="button" @click=${() => this.fire("test")}>${L(e, "test")}</button>
          <button class="row action" type="button" @click=${() => this.fire("summary")}>${L(e, "summary_now")}</button>
        </div>
      </section>
      </div>
      <pulse-template-sheet
        .open=${this.editing !== null}
        .kind=${this.editing ?? "failed"}
        .language=${e}
        .current=${u}
        .defaults=${t.template_defaults ?? {}}
        .vars=${t.template_vars ?? []}
        .example=${Pn(p)}
        @template-save=${(e) => this.save({ templates: e.detail.templates })}
        @closed=${() => {
			this.editing = null;
		}}
      ></pulse-template-sheet>
    `;
	}
	static {
		this.styles = [
			J,
			Y,
			X,
			o`
      :host {
        display: block;
        container-type: inline-size;
      }
      /* Schlagzeile wie in der Übersicht, das Tagesband zeigt live, was die Einstellungen bewirken */
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(340px, 470px);
        gap: 24px 48px;
        align-items: end;
        margin-bottom: 32px;
      }
      .hl {
        margin: 0;
        font-family: var(--pu-display);
        font-size: clamp(32px, 4.2cqi, var(--pu-fs-56));
        line-height: 1.04;
        font-weight: 800;
        letter-spacing: -0.025em;
        text-wrap: balance;
      }
      .hsub {
        margin: 14px 0 0;
        max-width: 46ch;
        font-size: clamp(var(--pu-fs-15), 1.6cqi, var(--pu-fs-17));
        line-height: 1.42;
        letter-spacing: -0.01em;
        color: var(--pu-muted);
        text-wrap: pretty;
      }
      /* Abschnitte in zwei Spalten, auf schmalen Bildschirmen eine */
      .cols {
        columns: 2 380px;
        column-gap: 24px;
        padding-top: 24px;
        border-top: 1px solid var(--pu-line);
      }
      .section {
        break-inside: avoid;
        margin-bottom: 28px;
      }
      .z2m {
        margin-bottom: var(--pu-sp-12);
      }
      .on {
        display: inline-flex;
        align-items: center;
        gap: var(--pu-sp-4);
        --mdc-icon-size: 18px;
      }
      .row .value.t-ok {
        color: var(--pu-ok-text);
      }
      .capname {
        text-transform: capitalize;
      }
      /* „Erweitert“: zugeklappte Zeile, darin das Zigbee2MQTT-Thema */
      .adv summary {
        list-style: none;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .adv summary::-webkit-details-marker {
        display: none;
      }
      .adv summary:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: -2px;
      }
      .adv .chev {
        transition: transform 0.2s;
      }
      .adv[open] .chev {
        transform: rotate(180deg);
      }
      .adv-hint {
        margin: 0;
        font-size: var(--pu-fs-13);
        line-height: 1.4;
        color: var(--pu-muted);
      }
      /* Textfeld rechts in der Zeile, ruhig wie ein Wert */
      .text {
        flex: 0 1 50%;
        min-width: 0;
        min-height: var(--pu-hit);
        padding: 0 10px;
        box-sizing: border-box;
        border: 1px solid transparent;
        border-radius: 8px;
        background: var(--pu-fill);
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-15);
        text-align: end;
      }
      .text:focus {
        outline: none;
        border-color: var(--pu-accent);
      }
      @container (max-width: 1000px) {
        .hero {
          grid-template-columns: minmax(0, 1fr);
        }
        pulse-dayband {
          max-width: 560px;
        }
      }
      @container (max-width: 600px) {
        .hl {
          font-size: clamp(30px, 9.5cqi, 40px);
        }
        .hsub {
          font-size: var(--pu-fs-15);
        }
        .hero {
          margin-bottom: 24px;
        }
      }
    `
		];
	}
});
//#endregion
//#region src/pulse-panel.ts
function xr() {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}
function Sr() {
	let e = xr();
	if (!e) return null;
	try {
		return Hn(e, "26.10.9b2", Ln.length > 0);
	} catch {
		return null;
	}
}
function Cr(e) {
	return [
		e.language,
		e.themes?.darkMode,
		e.dockedSidebar,
		e.kioskMode,
		e.config?.time_zone,
		e.locale?.time_format,
		e.user?.is_admin
	].join("|");
}
var wr = class extends N {
	static {
		this.properties = {
			hass: { attribute: !1 },
			narrow: { type: Boolean },
			route: { attribute: !1 },
			snapshot: { state: !0 },
			now: { state: !0 },
			openId: { state: !0 },
			welcome: { state: !0 },
			error: { state: !0 },
			groupBy: { state: !0 },
			filter: { state: !0 },
			confirmZigbee: { state: !0 },
			confirmHealth: { state: !0 }
		};
	}
	constructor() {
		super(), this.unsub = null, this.retryDelay = kn, this.namesCache = {
			key: "{}",
			value: {}
		}, this.spans = R((e) => cn(e)), this.watched = R((e) => U(e)), this.dayStarts = R((e) => at(e)), this.onMenuHidden = (e) => {
			let t = e.composedPath()[0];
			t instanceof HTMLElement && t.localName.endsWith("dropdown") && Ue();
		}, this.deepLink = "", this.subscribedLanguage = "", this.fetchHeartbeat = async (e) => this.hass ? await this.hass.callWS({
			type: "pulse/heartbeat",
			device_ids: e
		}) : null, this.dueIds = R((e) => (e.summary.due_batteries ?? []).map((e) => e.id)), this.narrow = !1, this.snapshot = null, this.now = Date.now() / 1e3, this.openId = null, this.welcome = Sr(), this.error = null, this.groupBy = "area", this.filter = null, this.confirmZigbee = !1, this.confirmHealth = !1;
	}
	get language() {
		return this.hass?.language ?? "en";
	}
	get timeZone() {
		return nt(this.hass?.config?.time_zone);
	}
	get timeFormat() {
		return pt(this.hass?.locale?.time_format);
	}
	get readonly() {
		return !Nt(this.hass?.user);
	}
	get view() {
		let e = this.route?.path ?? "";
		return e.startsWith("/settings") ? this.readonly ? "overview" : "settings" : e.startsWith("/devices") ? "devices" : "overview";
	}
	connectedCallback() {
		super.connectedCallback(), Ve(), this.addEventListener("wa-after-hide", this.onMenuHidden), this.openDeepLink(), this.now = Date.now() / 1e3, this.clock = window.setInterval(() => {
			this.now = Date.now() / 1e3;
		}, 3e4), this.ensureSubscribed();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.removeEventListener("wa-after-hide", this.onMenuHidden), window.clearInterval(this.clock), window.clearTimeout(this.retryTimer), this.retryTimer = void 0, this.unsubscribe();
	}
	unsubscribe() {
		let e = this.unsub;
		this.unsub = null, e?.then((e) => Promise.resolve(e()).catch(() => void 0), () => void 0);
	}
	openDeepLink() {
		let e = new URLSearchParams(location.search).get("device") ?? "";
		e && e !== this.deepLink && (this.openId = e), this.deepLink = e;
	}
	willUpdate(e) {
		e.has("route") && this.openDeepLink(), this.hass?.user && this.readonly && (this.route?.path ?? "").startsWith("/settings") && F("/pulse", !0);
	}
	shouldUpdate(e) {
		if (this.ensureSubscribed(), e.size !== 1 || !e.has("hass")) return !0;
		let t = e.get("hass");
		if (!t || !this.hass) return !0;
		let n = this.namesCache.value;
		return Cr(t) !== Cr(this.hass) || this.names() !== n;
	}
	updated() {
		this.toggleAttribute("dark", this.hass?.themes?.darkMode === !0);
	}
	ensureSubscribed() {
		this.hass && this.isConnected && (this.unsub && this.subscribedLanguage !== this.hass.language && this.unsubscribe(), !this.unsub && this.retryTimer === void 0 && this.subscribe());
	}
	subscribe() {
		if (!this.hass) return;
		this.subscribedLanguage = this.hass.language;
		let e = this.hass.connection.subscribeMessage((e) => {
			this.snapshot = e, this.now = Date.now() / 1e3, this.error = null, this.retryDelay = kn;
		}, {
			type: "pulse/subscribe",
			language: this.hass.language
		});
		this.unsub = e, e.catch((t) => {
			if (this.unsub !== e || (this.unsub = null, this.error = Ie(t), !this.isConnected)) return;
			let n = this.retryDelay;
			this.retryDelay = jn(n), this.retryTimer = window.setTimeout(() => {
				this.retryTimer = void 0, this.ensureSubscribed();
			}, n);
		});
	}
	async call(e, t) {
		if (this.hass) try {
			let n = await this.hass.callWS(e);
			return t && P(this, t), n ?? null;
		} catch (e) {
			P(this, Ie(e));
			return;
		}
	}
	go(e) {
		e !== "devices" && (this.filter = null), F(e === "overview" ? "/pulse" : `/pulse/${e}`);
	}
	loaded() {
		let e = this.snapshot;
		return e === null || e.loaded === !1 ? null : e;
	}
	onDeviceChange(e, t) {
		let n = this.loaded()?.devices.find((t) => t.id === e);
		this.call({
			type: "pulse/device",
			device_id: e,
			...t
		}), t.ignored === !0 && n && (this.openId = null, P(this, L(this.language, "ignored_done", { name: n.name }), {
			text: L(this.language, "undo"),
			action: () => void this.call({
				type: "pulse/device",
				device_id: e,
				ignored: !1
			})
		}));
	}
	async onReplaced(e) {
		let t = this.language;
		await this.call({
			type: "pulse/replaced",
			device_id: e
		}) !== void 0 && (this.openId = null, P(this, L(t, "replaced_done"), {
			text: L(t, "undo"),
			action: () => void this.onUndoReplaced(e)
		}));
	}
	async onUndoReplaced(e) {
		let t = this.language, n = await this.call({
			type: "pulse/replaced_undo",
			device_id: e
		});
		if (n === void 0) return;
		let r = Reflect.get(Object(n), "undone") === !0;
		P(this, L(t, r ? "replaced_undone" : "replaced_undo_failed"));
	}
	async onConfirmZigbee() {
		this.confirmZigbee = !1, await this.call({ type: "pulse/enable_z2m" }, L(this.language, "zigbee_sent"));
	}
	async onConfirmHealth() {
		this.confirmHealth = !1, await this.call({ type: "pulse/enable_z2m_health" }, L(this.language, "zigbee_sent"));
	}
	onPartnerDismiss(e, t) {
		this.readonly || this.call({
			type: "pulse/partner_suggestion_dismiss",
			device_id: e,
			partner_id: t
		});
	}
	async onTest() {
		let e = await this.call({ type: "pulse/test" });
		if (e === void 0) return;
		let t = Reflect.get(Object(e), "targets"), n = Array.isArray(t) ? t.length : 0;
		P(this, n ? L(this.language, "test_done", { count: n }) : L(this.language, "test_none"));
	}
	async onSummary() {
		let e = await this.call({ type: "pulse/summary" });
		e !== void 0 && P(this, L(this.language, Reflect.get(Object(e), "sent") ? "summary_sent" : "summary_empty"));
	}
	onMenu(e) {
		let t = Re(e);
		t === "summary" && !this.readonly ? this.onSummary() : t === "welcome" ? this.welcome = "welcome" : t === "integration" && F("/config/integrations/integration/pulse");
	}
	welcomeDone() {
		this.welcome = null;
		let e = xr();
		try {
			e && Un(e, "26.10.9b2");
		} catch {}
	}
	zigbeeOffer(e) {
		return !e.z2m.present || this.readonly ? "none" : e.z2m.last_seen && e.z2m.availability ? "on" : "offer";
	}
	names() {
		let e = {}, t = this.hass?.states ?? {}, n = this.loaded();
		for (let r of n?.targets ?? []) {
			let n = t[`device_tracker.${r.replace(/^mobile_app_/, "")}`]?.attributes.friendly_name;
			typeof n == "string" && (e[r] = n);
		}
		for (let r of n?.persons ?? []) {
			let n = t[r]?.attributes.friendly_name;
			typeof n == "string" && (e[r] = n);
		}
		let r = JSON.stringify(e);
		return r !== this.namesCache.key && (this.namesCache = {
			key: r,
			value: e
		}), this.namesCache.value;
	}
	recipients(e, t) {
		let n = this.language;
		if (this.readonly) return "";
		let r = (e.settings.targets ?? e.targets).filter((t) => e.targets.includes(t));
		if (!r.length) return L(n, "day_nobody");
		let i = r.slice(0, 2).map((e) => t[e] ?? e.replace(/^mobile_app_/, "").replaceAll("_", " ")).join(", ");
		return L(n, "day_to", { names: r.length > 2 ? `${i} +${r.length - 2}` : i });
	}
	renderHead() {
		let e = this.language, t = [
			{
				value: "overview",
				label: L(e, "tab_overview")
			},
			{
				value: "devices",
				label: L(e, "tab_devices")
			},
			...this.readonly ? [] : [{
				value: "settings",
				label: L(e, "tab_notify")
			}]
		];
		return E`<header class="head">
      <div class="brand" title=${L(e, "subtitle")}>
        <pulse-mark flat></pulse-mark>
        <span>${L(e, "title")}</span>
      </div>
      <pulse-segmented
        .options=${t}
        .value=${this.view}
        .label=${L(e, "title")}
        @change=${(e) => {
			let t = e.detail.value;
			(t === "overview" || t === "devices" || t === "settings") && this.go(t);
		}}
      ></pulse-segmented>
    </header>`;
	}
	renderView(e) {
		let t = this.language, n = this.now, r = this.timeZone, i = this.names();
		return this.view === "settings" ? E`<pulse-settings
        .snapshot=${e}
        .language=${t}
        .timeZone=${r}
        .now=${n}
        .recipients=${this.recipients(e, i)}
        .names=${i}
        @settings-change=${(e) => void this.call({
			type: "pulse/settings",
			settings: e.detail.settings
		})}
        @test=${() => void this.onTest()}
        @summary=${() => void this.onSummary()}
        @show-devices=${(e) => {
			this.filter = e.detail.filter, this.go("devices");
		}}
      ></pulse-settings>` : this.view === "devices" ? E`<pulse-devices
        .devices=${e.devices}
        .language=${t}
        .timeZone=${r}
        .timeFormat=${this.timeFormat}
        .now=${n}
        .start=${e.strip_start}
        .days=${e.strip_days}
        .dayStarts=${this.dayStarts(e)}
        .bucketHours=${e.bucket_hours}
        .noData=${this.spans(e.no_data)}
        .readonly=${this.readonly}
        .groupBy=${this.groupBy}
        .filter=${this.filter}
        .dueIds=${this.dueIds(e)}
        @group-change=${(e) => {
			this.groupBy = e.detail.group;
		}}
        @filter-clear=${() => {
			this.filter = null;
		}}
      ></pulse-devices>` : E`<pulse-overview
      .snapshot=${e}
      .language=${t}
      .timeZone=${r}
      .timeFormat=${this.timeFormat}
      .now=${n}
      .dayStarts=${this.dayStarts(e)}
      .noData=${this.spans(e.no_data)}
      .recipients=${this.recipients(e, i)}
      .readonly=${this.readonly}
      @show-devices=${(e) => {
			this.filter = e.detail.filter, this.go("devices");
		}}
      @show-settings=${() => this.go("settings")}
    ></pulse-overview>`;
	}
	renderContent() {
		let e = this.language, t = this.snapshot, n = this.error ? E`<ha-alert alert-type="warning" title=${this.error}>${L(e, "connection_lost")}</ha-alert>` : k;
		return t ? t.loaded === !1 ? E`${n}<ha-alert alert-type="info">${L(e, "not_loaded")}</ha-alert>` : E`${n}${this.renderView(t)}` : this.error ? n : E`<p class="muted center">${L(e, "loading")}</p>`;
	}
	render() {
		let e = this.loaded(), t = this.language, n = e?.devices.find((e) => e.id === this.openId) ?? null;
		return E`
      <div class="toolbar">
        ${Fe(this.hass, this.narrow) ? E`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>` : k}
        <div class="toolbar-title">${L(t, "title")}</div>
        <ha-dropdown placement="bottom-end" @wa-select=${(e) => this.onMenu(e)}>
          <ha-icon-button slot="trigger" .label=${L(t, "more")}>
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </ha-icon-button>
          ${this.readonly || this.view === "settings" ? k : E`<ha-dropdown-item value="summary"><ha-icon slot="icon" icon="mdi:text-box-outline"></ha-icon>${L(t, "summary_now")}</ha-dropdown-item>`}
          <ha-dropdown-item value="welcome"><ha-icon slot="icon" icon="mdi:hand-wave-outline"></ha-icon>${L(t, "show_welcome")}</ha-dropdown-item>
          ${this.readonly ? k : E`<ha-dropdown-item value="integration"><ha-icon slot="icon" icon="mdi:cog-outline"></ha-icon>${L(t, "open_integration")}</ha-dropdown-item>`}
        </ha-dropdown>
      </div>
      <main
        @open=${(e) => {
			this.openId = e.detail.id;
		}}
        @replaced=${(e) => void this.onReplaced(e.detail.id)}
        @later=${(e) => void this.call({
			type: "pulse/snooze",
			device_id: e.detail.id,
			hours: 24
		}, L(t, "later_done"))}
        @snooze-cancel=${(e) => void this.call({
			type: "pulse/snooze",
			device_id: e.detail.id,
			hours: 0
		}, L(t, "snooze_cancelled"))}
        @device-change=${(e) => this.onDeviceChange(e.detail.id, e.detail.changes)}
        @enable-z2m=${() => {
			this.readonly || (this.confirmZigbee = !0);
		}}
        @enable-z2m-health=${() => {
			this.readonly || (this.confirmHealth = !0);
		}}
        @partner-dismiss=${(e) => this.onPartnerDismiss(e.detail.id, e.detail.partner)}
      >
        ${this.renderHead()} ${this.renderContent()}
        <p class="version muted">${L(t, "version", { version: "26.10.9b2" })}</p>
        ${e ? E`<pulse-device-sheet
                  .open=${n !== null}
                  .device=${n}
                  .devices=${this.watched(e.devices)}
                  .language=${t}
                  .timeZone=${this.timeZone}
                  .timeFormat=${this.timeFormat}
                  .now=${this.now}
                  .stripStart=${e.strip_start}
                  .stripDays=${e.strip_days}
                  .dayStarts=${this.dayStarts(e)}
                  .bucketHours=${e.bucket_hours}
                  .fetchHeartbeat=${this.fetchHeartbeat}
                  .batteryTypes=${e.battery_types}
                  .chemistries=${e.chemistries}
                  .noData=${this.spans(e.no_data)}
                  .readonly=${this.readonly}
                  @sheet-closed=${() => {
			this.openId = null, location.search.includes("device=") && F(location.pathname, !0);
		}}
                ></pulse-device-sheet>
                <pulse-welcome
                  .mode=${this.welcome}
                  .language=${t}
                  .version=${"26.10.9b2"}
                  .zigbee=${this.zigbeeOffer(e)}
                  @closed=${() => this.welcomeDone()}
                  @enable-z2m=${() => {
			this.confirmZigbee = !0;
		}}
                ></pulse-welcome>
                <pulse-sheet
                  no-close
                  .open=${this.confirmZigbee}
                  .heading=${L(t, "zigbee_confirm_title")}
                  .language=${t}
                  @closed=${() => {
			this.confirmZigbee = !1;
		}}
                >
                  <p class="confirm-text">${L(t, "zigbee_confirm_text")}</p>
                  <p class="confirm-text">${L(t, "zigbee_confirm_side")}</p>
                  <button slot="footer" class="pbtn" type="button" @click=${() => {
			this.confirmZigbee = !1;
		}}>${L(t, "cancel")}</button>
                  <button slot="footer" class="pbtn primary" type="button" @click=${() => void this.onConfirmZigbee()}>
                    ${L(t, "zigbee_confirm_go")}
                  </button>
                </pulse-sheet>
                <pulse-sheet
                  no-close
                  .open=${this.confirmHealth}
                  .heading=${L(t, "health_confirm_title")}
                  .language=${t}
                  @closed=${() => {
			this.confirmHealth = !1;
		}}
                >
                  <p class="confirm-text">${L(t, "health_confirm_text")}</p>
                  <p class="confirm-text">${L(t, "health_confirm_side")}</p>
                  <button slot="footer" class="pbtn" type="button" @click=${() => {
			this.confirmHealth = !1;
		}}>${L(t, "cancel")}</button>
                  <button slot="footer" class="pbtn primary" type="button" @click=${() => void this.onConfirmHealth()}>
                    ${L(t, "zigbee_confirm_go")}
                  </button>
                </pulse-sheet>` : k}
      </main>
    `;
	}
	static {
		this.styles = [
			J,
			Y,
			o`
      :host {
        display: block;
        min-height: 100%;
        /* Systemschrift (SF auf Apple-Geräten), sonst HAs Schrift */
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--ha-font-family-body, Roboto), system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        background: var(--primary-background-color);
        color: var(--primary-text-color);
        /* Eine Akzentfarbe: HAs Schalter, Fokus und Auswahl im Panel ebenfalls Pulse-Violett */
        --primary-color: var(--pu-accent);
        --accent-color: var(--pu-accent);
        --ha-switch-checked-background-color: var(--pu-accent);
        --ha-switch-checked-background-color-hover: var(--pu-accent-hi);
        --ha-switch-checked-border-color: var(--pu-accent);
        --ha-switch-checked-border-color-hover: var(--pu-accent-hi);
        --ha-color-fill-primary-normal-resting: color-mix(in srgb, var(--pu-accent) 12%, transparent);
        --ha-switch-checked-thumb-background-color: #fff;
        --ha-switch-checked-thumb-background-color-hover: #fff;
        /* Aus-Zustand passend zum iOS-An: weißer Knopf auf heller Spur, ohne Rand */
        --ha-switch-thumb-background-color: #fff;
        --ha-switch-thumb-background-color-hover: #fff;
        --ha-switch-background-color: color-mix(in srgb, var(--primary-text-color) 16%, transparent);
        --ha-switch-background-color-hover: color-mix(in srgb, var(--primary-text-color) 20%, transparent);
        --ha-switch-border-color: transparent;
        --ha-switch-border-color-hover: transparent;
      }
      /* Dunkel: tiefe Bühne (nur im Pulse-Bereich), damit die Leisten leuchten; Blatt und aktives
         Segment eine Stufe heller als die Seite (iOS „erhöht“) */
      :host([dark]) {
        background: var(--pulse-dark-background, #050507);
        --pulse-raised: color-mix(in srgb, var(--card-background-color, #1c1c1c) 82%, white);
        --pulse-sheet-bg: color-mix(in srgb, var(--card-background-color, #1c1c1c) 94%, white);
        --pulse-sheet-card: color-mix(in srgb, var(--card-background-color, #1c1c1c) 84%, white);
        --pulse-sheet-edge: rgba(255, 255, 255, 0.08);
        --pulse-grab: rgba(255, 255, 255, 0.35);
        /* Dunkel leuchten die Rhythmusleisten in ihrer Statusfarbe wie ein EKG */
        --pulse-glow-strength: 55%;
        /* Hell #8b7cff nur für Leisten und Text auf Schwarz; Knopfflächen dunkler (Weiß ≥ 4,5:1) */
        --pulse-accent-default: #8b7cff;
        --pulse-accent-hi-default: #c4bcff;
        --pulse-accent-fill-default: #6f5cff;
        --pulse-warn-text: color-mix(in srgb, var(--pu-warn) 70%, var(--primary-text-color));
        --pulse-grad-text: linear-gradient(90deg, var(--pu-accent), var(--pu-accent-hi));
      }
      .confirm-text {
        margin: 0 0 var(--pu-sp-12);
        line-height: 1.5;
        color: var(--pu-muted);
      }
      /* HA-App-Leiste wie auf HAs eigenen Seiten (und FLODE) */
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 4px;
        height: var(--header-height, 56px);
        padding: 0 12px;
        box-sizing: border-box;
        font-family: var(--ha-font-family-body, Roboto, sans-serif);
        background: var(--app-header-background-color, var(--primary-background-color));
        color: var(--app-header-text-color, var(--primary-text-color));
        border-bottom: var(--app-header-border-bottom, 1px solid var(--divider-color));
      }
      .toolbar-title {
        flex: 1;
        margin-inline-start: 8px;
        font-size: 20px;
      }
      main {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: var(--pu-sp-24);
        max-width: 1280px;
        margin: 0 auto;
        padding: var(--pu-sp-24) clamp(16px, 4vw, 56px) var(--pu-sp-48);
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: var(--pu-fs-17);
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .brand pulse-mark {
        width: 28px;
        height: 28px;
      }
      .center {
        padding: 48px 0;
        text-align: center;
      }
      .version {
        margin: 8px 0 0;
        font-size: var(--pu-fs-11);
        text-align: center;
      }
      .head pulse-segmented {
        min-width: 0;
      }
      /* Handy: kein doppelter „Pulse“-Titel (die App-Leiste zeigt ihn), Reiter links über die volle
         Breite; dunkel geht die App-Leiste in die Bühne über */
      @media (max-width: 600px) {
        main {
          padding-top: var(--pu-sp-16);
          gap: var(--pu-sp-16);
        }
        .brand {
          display: none;
        }
        .head {
          justify-content: flex-start;
        }
        .head pulse-segmented {
          flex: 1;
        }
        :host([dark]) .toolbar {
          background: var(--pulse-dark-background, #050507);
        }
      }
    `
		];
	}
};
I("pulse-panel", wr);
//#endregion
export { wr as PulsePanel };
