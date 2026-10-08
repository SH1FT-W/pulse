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
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, g = h.trustedTypes, ee = g ? g.emptyScript : "", te = h.reactiveElementPolyfillSupport, _ = (e, t) => e, ne = {
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
}, re = (e, t) => !l(e, t), ie = {
	attribute: !0,
	type: String,
	converter: ne,
	reflect: !1,
	useDefault: !1,
	hasChanged: re
};
Symbol.metadata ??= Symbol("metadata"), h.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var v = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ie) {
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
		return this.elementProperties.get(e) ?? ie;
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
			let i = (n.converter?.toAttribute === void 0 ? ne : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? ne : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? re)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
v.elementStyles = [], v.shadowRootOptions = { mode: "open" }, v[_("elementProperties")] = /* @__PURE__ */ new Map(), v[_("finalized")] = /* @__PURE__ */ new Map(), te?.({ ReactiveElement: v }), (h.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ae = globalThis, oe = (e) => e, y = ae.trustedTypes, se = y ? y.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ce = "$lit$", b = `lit$${Math.random().toFixed(9).slice(2)}$`, le = "?" + b, ue = `<${le}>`, x = document, S = () => x.createComment(""), C = (e) => e === null || typeof e != "object" && typeof e != "function", de = Array.isArray, fe = (e) => de(e) || typeof e?.[Symbol.iterator] == "function", pe = "[ 	\n\f\r]", w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, me = /-->/g, he = />/g, T = RegExp(`>|${pe}(?:([^\\s"'>=/]+)(${pe}*=${pe}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ge = /'/g, _e = /"/g, ve = /^(?:script|style|textarea|title)$/i, ye = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), E = ye(1), D = ye(2), O = Symbol.for("lit-noChange"), k = Symbol.for("lit-nothing"), be = /* @__PURE__ */ new WeakMap(), A = x.createTreeWalker(x, 129);
function xe(e, t) {
	if (!de(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return se === void 0 ? t : se.createHTML(t);
}
var Se = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = w;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === w ? c[1] === "!--" ? o = me : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = T) : (ve.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = T) : o = he : o === T ? c[0] === ">" ? (o = i ?? w, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? T : c[3] === "\"" ? _e : ge) : o === _e || o === ge ? o = T : o === me || o === he ? o = w : (o = T, i = void 0);
		let d = o === T && e[t + 1].startsWith("/>") ? " " : "";
		a += o === w ? n + ue : l >= 0 ? (r.push(s), n.slice(0, l) + ce + n.slice(l) + b + d) : n + b + (l === -2 ? t : d);
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
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ce)) {
					let t = u[o++], n = i.getAttribute(e).split(b), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Ee : r[1] === "?" ? De : r[1] === "@" ? Oe : M
					}), i.removeAttribute(e);
				} else e.startsWith(b) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ve.test(i.tagName)) {
					let e = i.textContent.split(b), t = e.length - 1;
					if (t > 0) {
						i.textContent = y ? y.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], S()), A.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], S());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === le) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(b, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += b.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = x.createElement("template");
		return n.innerHTML = e, n;
	}
};
function j(e, t, n = e, r) {
	if (t === O) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = C(t) ? void 0 : t._$litDirective$;
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? x).importNode(t, !0);
		A.currentNode = r;
		let i = A.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Te(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new ke(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = A.nextNode(), a++);
		}
		return A.currentNode = x, r;
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
		e = j(this, e, t), C(e) ? e === k || e == null || e === "" ? (this._$AH !== k && this._$AR(), this._$AH = k) : e !== this._$AH && e !== O && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? fe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== k && C(this._$AH) ? this._$AA.nextSibling.data = e : this.T(x.createTextNode(e)), this._$AH = e;
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
		de(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(S()), this.O(S()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = oe(e).nextSibling;
			oe(e).remove(), e = t;
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
		if (i === void 0) e = j(this, e, t, 0), a = !C(e) || e !== this._$AH && e !== O, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = j(this, r[n + o], t, o), s === O && (s = this._$AH[o]), a ||= !C(s) || s !== this._$AH[o], s === k ? e = k : e !== k && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
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
	M: ce,
	P: b,
	A: le,
	C: 1,
	L: Se,
	R: we,
	D: fe,
	V: j,
	I: Te,
	H: M,
	N: De,
	U: Oe,
	B: Ee,
	F: ke
}, je = ae.litHtmlPolyfillSupport;
je?.(Ce, Te), (ae.litHtmlVersions ??= []).push("3.3.3");
var Me = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Te(t.insertBefore(S(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Ne = globalThis, N = class extends v {
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
function L(e) {
	let t = Reflect.get(Object(Reflect.get(e, "detail")), "item"), n = Reflect.get(Object(t), "value");
	return typeof n == "string" ? n : null;
}
var Re = "pointer", ze = !1;
function Be() {
	ze || (ze = !0, window.addEventListener("pointerdown", () => Re = "pointer", !0), window.addEventListener("keydown", () => Re = "keyboard", !0));
}
function Ve() {
	let e = document.activeElement;
	for (; e?.shadowRoot?.activeElement;) e = e.shadowRoot.activeElement;
	return e;
}
function He() {
	Re === "pointer" && window.setTimeout(() => {
		let e = Ve();
		e instanceof HTMLElement && e.blur();
		let t = document.activeElement;
		t instanceof HTMLElement && t.tagName !== "BODY" && t.blur();
	}, 0);
}
//#endregion
//#region src/strings-de.ts
var Ue = {
	title: "Pulse",
	subtitle: "Merkt, wenn ein Batteriesensor still wird – hört nur zu und kostet keine Batterie.",
	tab_overview: "Übersicht",
	tab_devices: "Geräte",
	tab_notify: "Mitteilungen",
	close: "Schließen",
	more: "Mehr",
	loading: "Pulse lädt …",
	not_loaded: "Pulse ist noch nicht eingerichtet. Füge die Integration unter Einstellungen → Geräte & Dienste hinzu.",
	status_ok: "Gut",
	status_learning: "Lernt",
	status_watch: "Beobachten",
	status_check: "Prüfen",
	status_failed: "Ausgefallen",
	ignored: "Ignoriert",
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
	ignore: "Nicht überwachen",
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
	ignored_count: "{count} ignoriert",
	show_list: "Liste zeigen",
	device_settings: "Einstellungen",
	no_data_legend: "Keine Daten – Pulse lief nicht",
	stat_rechargeable: "Akku · ungenau",
	set_head: "Pulse meldet sich um {time}.",
	set_quiet: "Ruhe {start}–{end}.",
	set_no_quiet: "Ohne Ruhezeit.",
	set_failed: "Ausfälle",
	set_check: "Auffälliges",
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
	advanced: "Erweitert",
	snooze_cancel: "Erinnerung aufheben",
	snooze_cancelled: "Erinnerung aufgehoben",
	read_only: "Ändern können nur Admins.",
	levels_hint: "Ausgefallen: viel länger still als sonst oder nicht erreichbar. Prüfen: auffällig still oder Batterie unter 10 %. Beobachten bleibt im Panel.",
	recipients_hint: "Neue Handys kommen automatisch dazu, bis du hier etwas änderst.",
	recovered_hint: "Auch erkannte Batteriewechsel.",
	arrive_hint: "Mitteilungen warten, bis jemand der Gewählten zu Hause ist. Gilt für alle Empfänger.",
	persons_none: "Keine Person in Home Assistant gefunden.",
	learning_hint: "Lernt noch: braucht etwa 7 Meldungen, um den Takt zu kennen.",
	learning_one: "Ein Gerät lernt Pulse noch kennen.",
	learning_many: "{count} Geräte lernt Pulse noch kennen.",
	pill_learning: "Lernt noch",
	pill_waiting: "Wartet",
	status_waiting: "Wartet",
	dh_waiting: "Wartet auf die erste Meldung.",
	sent_waiting: "{name} wartet auf die erste Meldung nach dem Batteriewechsel.",
	day_line_summary: "{time} Zusammenfassung",
	day_line_quiet: "Ruhe {start} bis {end}",
	day_line_no_quiet: "Ohne Ruhezeit"
}, We = {
	title: "Pulse",
	subtitle: "Notices when a battery sensor goes quiet – it only listens and costs no battery.",
	tab_overview: "Overview",
	tab_devices: "Devices",
	tab_notify: "Notifications",
	close: "Close",
	more: "More",
	loading: "Loading Pulse …",
	not_loaded: "Pulse is not set up yet. Add the integration under Settings → Devices & services.",
	status_ok: "Good",
	status_learning: "Learning",
	status_watch: "Watch",
	status_check: "Check",
	status_failed: "Failed",
	ignored: "Ignored",
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
	ignore: "Don't monitor",
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
	group_watch: "Keeping an eye on",
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
	ignored_count: "{count} ignored",
	show_list: "Show list",
	device_settings: "Settings",
	no_data_legend: "No data – Pulse wasn’t running",
	stat_rechargeable: "Rechargeable · rough",
	set_head: "Pulse checks in at {time}.",
	set_quiet: "Quiet {start}–{end}.",
	set_no_quiet: "No quiet hours.",
	set_failed: "failures",
	set_check: "anomalies",
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
	advanced: "Advanced",
	snooze_cancel: "Cancel reminder",
	snooze_cancelled: "Reminder cancelled",
	read_only: "Only admins can make changes.",
	levels_hint: "Failed: silent much longer than usual or unreachable. Check: unusually quiet or battery below 10%. Watch stays in the panel.",
	recipients_hint: "New phones are added automatically until you change something here.",
	recovered_hint: "Also detected battery changes.",
	arrive_hint: "Notifications wait until one of the selected people is home. Applies to all recipients.",
	persons_none: "No person found in Home Assistant.",
	learning_hint: "Still learning: needs about 7 reports to know the rhythm.",
	learning_one: "Pulse is still getting to know 1 device.",
	learning_many: "Pulse is still getting to know {count} devices.",
	pill_learning: "Learning",
	pill_waiting: "Waiting",
	status_waiting: "Waiting",
	dh_waiting: "Waiting for the first report.",
	sent_waiting: "{name} is waiting for its first report after the battery change.",
	day_line_summary: "Summary {time}",
	day_line_quiet: "Quiet {start} to {end}",
	day_line_no_quiet: "No quiet hours"
};
//#endregion
//#region src/strings.ts
function R(e, t, n = {}) {
	return (e.startsWith("de") ? Ue : We)[t].replace(/\{(\w+)\}/g, (e, t) => t in n ? String(n[t]) : e);
}
//#endregion
//#region src/logic.ts
function z(e) {
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
var B = {
	ok: 0,
	learning: 0,
	watch: 1,
	check: 2,
	failed: 3
};
function V(e) {
	return e === "failed" ? "crit" : e === "check" || e === "watch" ? "warn" : e === "learning" ? "muted" : "ok";
}
function H(e) {
	return e.ignored ? "muted" : V(e.status);
}
function Ge(e) {
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
function Ke(e) {
	return U(e).filter((e) => B[e.status] >= 2).sort((e, t) => B[t.status] - B[e.status] || e.name.localeCompare(t.name));
}
function qe(e, t) {
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
function Je(e, t, n) {
	if (t === null) return R(e, "unknown");
	let r = Math.max(0, n - t);
	if (r < 60) return R(e, "just_now");
	if (r < 3600) return R(e, "minutes_ago", { n: Math.round(r / 60) });
	if (r < 86400) return R(e, "hours_ago", { n: Math.round(r / 3600) });
	let i = Math.round(r / 86400);
	return i === 1 ? R(e, "day_ago") : R(e, "days_ago", { n: i });
}
function Ye(e, t) {
	return t === null ? R(e, "unknown") : t < 3600 ? R(e, "every_minutes", { n: Math.max(1, Math.round(t / 60)) }) : t < 172800 ? R(e, "every_hours", { n: Math.round(t / 3600) }) : R(e, "every_days", { n: Math.round(t / 86400) });
}
function Xe(e) {
	let t = e.filter((e) => e !== null && e > 0).sort((e, t) => e - t);
	if (!t.length) return e.map((e) => e === null ? null : 0);
	let n = t[Math.min(t.length - 1, Math.floor(t.length * .9))] ?? 1;
	return e.map((e) => e === null ? null : Math.min(1, e / n));
}
var Ze = /* @__PURE__ */ new Map();
function Qe(e) {
	let t = e ?? "", n = Ze.get(t);
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
	return Ze.set(t, r), r;
}
var $e = /* @__PURE__ */ new Map();
function et(e) {
	if (!e) return;
	let t = $e.get(e);
	if (t === void 0) {
		try {
			new Intl.DateTimeFormat("en-US", { timeZone: e }), t = !0;
		} catch {
			t = !1;
		}
		$e.set(e, t);
	}
	return t ? e : void 0;
}
function W(e) {
	let t = et(e);
	return t ? { timeZone: t } : {};
}
function tt(e, t) {
	let n = {
		year: 1970,
		month: 1,
		day: 1,
		hour: 0,
		minute: 0
	};
	for (let r of Qe(t).formatToParts(/* @__PURE__ */ new Date(e * 1e3))) {
		let e = Number(r.value);
		r.type === "year" ? n.year = e : r.type === "month" ? n.month = e : r.type === "day" ? n.day = e : r.type === "hour" ? n.hour = e % 24 : r.type === "minute" && (n.minute = e);
	}
	return n;
}
function nt(e, t) {
	let n = tt(e, t);
	return Date.UTC(n.year, n.month - 1, n.day) / 864e5;
}
function rt(e, t) {
	let n = tt(e, t);
	return n.hour + n.minute / 60;
}
function it(e) {
	return at(e.day_starts, e.strip_start, e.strip_days);
}
function at(e, t, n) {
	return Array.isArray(e) && e.length === n + 1 && e.every((t, n) => typeof t == "number" && (n === 0 || t > e[n - 1])) ? e.filter((e) => typeof e == "number") : Array.from({ length: n + 1 }, (e, n) => t + n * 86400);
}
function ot(e, t, n) {
	let r = new Intl.DateTimeFormat(e, {
		weekday: "short",
		...W(n)
	}), i = Math.max(0, t.length - 1);
	return Array.from({ length: i }, (n, a) => a === i - 1 ? R(e, "today") : r.format(/* @__PURE__ */ new Date(((t[a] ?? 0) + (t[a + 1] ?? 0)) / 2 * 1e3)));
}
function st(e) {
	return `repeat(${Math.max(1, e.length - 1)}, minmax(0, 1fr))`;
}
function ct(e, t) {
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
function lt(e, t) {
	let n = t.length - 1, r = t[0];
	if (n <= 0 || r === void 0 || e <= r) return 0;
	for (let r = 0; r < n; r++) {
		let i = t[r] ?? 0, a = t[r + 1] ?? i;
		if (e < a) return (r + (e - i) / (a - i)) / n;
	}
	return 1;
}
function ut(e, t, n, r) {
	let i = t - e;
	if (i <= 0) return [];
	let a = /* @__PURE__ */ new Map();
	for (let o = e; o < t; o += 3600) {
		let t = Math.round(rt(o, r));
		n.includes(t) && !a.has(t) && a.set(t, (o - e) / i);
	}
	return n.flatMap((e) => {
		let t = a.get(e);
		return t === void 0 ? [] : [t];
	});
}
function dt(e, t, n) {
	return new Intl.DateTimeFormat(e, {
		day: "numeric",
		month: "long",
		year: "numeric",
		...W(n)
	}).format(/* @__PURE__ */ new Date(t * 1e3));
}
function ft(e) {
	if (e === "12" || e === "am_pm") return "12";
	if (e === "24") return "24";
}
function pt(e, t, n, r) {
	return new Intl.DateTimeFormat(e, {
		weekday: "short",
		hour: "numeric",
		minute: "2-digit",
		...r ? { hourCycle: r === "12" ? "h12" : "h23" } : {},
		...W(n)
	}).format(/* @__PURE__ */ new Date(t * 1e3));
}
function mt(e, t) {
	return Math.abs(t) >= 1e3 ? R(e, "unit_volt", { value: new Intl.NumberFormat(e, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(t / 1e3) }) : R(e, "unit_millivolt", { value: Math.round(t) });
}
function ht(e) {
	let t = e.trim();
	return !t || t.includes("#") || t.includes("+") || t.startsWith("/") || t.endsWith("/") ? null : t;
}
function gt(e, t) {
	return U(e).filter((e) => e.id !== t.id).sort((e, t) => e.name.localeCompare(t.name));
}
function _t(e, t) {
	let n = t.trim().toLowerCase();
	return n ? e.filter((e) => [
		e.name,
		e.area,
		e.manufacturer,
		e.model
	].some((e) => e?.toLowerCase().includes(n))) : e;
}
var vt = [
	"failed",
	"check",
	"watch",
	"learning",
	"ok"
];
function yt(e, t, n, r) {
	return t === "none" ? [{
		area: "",
		devices: [...e].sort((e, t) => e.name.localeCompare(t.name))
	}] : t === "area" ? qe(e, r) : vt.map((t) => ({
		area: R(n, Ge(t)),
		devices: U(e).filter((e) => e.status === t).sort((e, t) => e.name.localeCompare(t.name))
	})).filter((e) => e.devices.length > 0);
}
function bt(e) {
	let t = [];
	for (let e = 0; e < 1440; e += 30) t.push(`${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`);
	return e && !t.includes(e) && t.push(e), t.sort();
}
function xt(e) {
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
function St(e, t) {
	return e > 120 || e > 24 && t > .5;
}
function Ct(e, t) {
	return t === null ? e : t === "ignored" ? e.filter((e) => e.ignored) : U(e).filter((e) => e.status === t);
}
function wt(e, t, n, r) {
	let i = nt(n, r) - nt(t, r);
	if (i === 0) return R(e, "today_cap");
	if (i === 1) return R(e, "yesterday_cap");
	let a = tt(t, r).year === tt(n, r).year;
	return new Intl.DateTimeFormat(e, {
		day: "numeric",
		month: "short",
		...a ? {} : { year: "numeric" },
		...W(r)
	}).format(/* @__PURE__ */ new Date(t * 1e3));
}
function Tt(e) {
	return !e.ignored && B[e.status] >= 2;
}
function Et(e, t) {
	return t.length ? {
		label: R(e, t.length === 1 ? "battery_low_one" : "battery_low_many", { count: t.length }),
		value: t.join(", "),
		tone: "warn"
	} : {
		label: R(e, "battery_none_low"),
		value: "",
		tone: "ok"
	};
}
function Dt(e) {
	return e?.is_admin === !0;
}
function G(e) {
	return e.silence_from === void 0 ? e.last_activity : e.silence_from;
}
function Ot(e) {
	return !e.ignored && e.reason_key === "waiting_first";
}
var kt = /* @__PURE__ */ new Set([
	"silent",
	"silent_new",
	"unavailable",
	"partner"
]), At = /* @__PURE__ */ new Set(["silent", "silent_new"]);
function jt(e, t) {
	let n = Math.max(0, t);
	if (n < 3600) return R(e, "span_minutes", { n: Math.max(1, Math.round(n / 60)) });
	if (n < 86400) {
		let t = Math.round(n / 3600);
		return t <= 1 ? R(e, "span_hour") : R(e, "span_hours", { n: t });
	}
	let r = Math.floor(n / 86400);
	return r <= 1 ? R(e, "span_day") : R(e, "span_days", { n: r });
}
function Mt(e, t, n, r) {
	let i = nt(n, r) - nt(t, r);
	return i === 1 ? R(e, "yesterday") : i >= 2 && i <= 6 ? new Intl.DateTimeFormat(e, {
		weekday: "long",
		...W(r)
	}).format(/* @__PURE__ */ new Date(t * 1e3)) : null;
}
function K(e) {
	return !e.ignored && B[e.status] >= 1 && G(e) !== null && At.has(e.reason_key ?? "");
}
function Nt(e) {
	return B[e.status] >= 1 && kt.has(e.reason_key ?? "");
}
function Pt(e, t) {
	let n = U(t), r = n.filter((e) => e.status !== "learning");
	if (!n.length) {
		let t = R(e, "hero_none1"), n = R(e, "hero_none2");
		return {
			line1: t,
			line1Short: t,
			line2: n,
			line2Short: n
		};
	}
	if (!r.length) {
		let t = R(e, "hero_learn1"), n = R(e, "hero_learn2");
		return {
			line1: t,
			line1Short: t,
			line2: n,
			line2Short: n
		};
	}
	let i = r.filter(Nt).length, a = r.length - i;
	if (r.length === 1) {
		let t = R(e, "hero_one"), n = R(e, i ? "hero_beat_off" : "hero_beat_one");
		return {
			line1: t,
			line1Short: t,
			line2: n,
			line2Short: n
		};
	}
	let o = R(e, "hero_beat"), s = R(e, "hero_beat_short");
	if (!i) {
		let t = R(e, "hero_all", { count: r.length });
		return {
			line1: t,
			line1Short: t,
			line2: o,
			line2Short: s
		};
	}
	return {
		line1: R(e, "hero_some", {
			ok: a,
			total: r.length
		}),
		line1Short: R(e, "hero_some_short", {
			ok: a,
			total: r.length
		}),
		line2: o,
		line2Short: s
	};
}
var Ft = "\0";
function q(e, t, n, r) {
	let [i = "", a = ""] = R(e, t, {
		...r,
		name: Ft
	}).split(Ft);
	return {
		before: i,
		name: n.name,
		after: a,
		tone: V(n.status)
	};
}
function It(e, t, n, r) {
	let i = U(t).filter((e) => B[e.status] >= 1).sort((e, t) => B[t.status] - B[e.status] || e.name.localeCompare(t.name)), a = U(t), o = a.filter((e) => e.status === "learning").length, s = o ? Lt(e, o) : "";
	if (!i.length) return {
		mentions: [],
		more: 0,
		text: o > 0 && o === a.length ? R(e, "sent_learning") : [o < a.length ? R(e, "sent_all_good") : "", s].filter(Boolean).join(" ")
	};
	let c = i.slice(0, 2).map((t) => {
		let i = t.reason_key ?? "", a = G(t);
		if (At.has(i) && a !== null) {
			let i = Mt(e, a, n, r);
			return i ? q(e, "sent_silent_since", t, { day: i }) : q(e, "sent_silent_for", t, { span: jt(e, n - a) });
		}
		return i === "waiting_first" ? q(e, "sent_waiting", t, {}) : i === "battery_low" ? q(e, "sent_battery_low", t, {}) : i === "battery_soon" ? q(e, "sent_battery", t, {}) : i === "unavailable" ? q(e, "sent_unavailable", t, {}) : i === "partner" ? q(e, "sent_partner", t, { partner: t.partner_name ?? "" }) : q(e, "sent_other", t, { reason: t.reason });
	}), l = i.length - c.length;
	return {
		mentions: c,
		more: l,
		text: [l ? R(e, "sent_more", { count: l }) : "", s].filter(Boolean).join(" ")
	};
}
function Lt(e, t) {
	return t === 1 ? R(e, "learning_one") : R(e, "learning_many", { count: t });
}
var Rt = {
	need: "group_need",
	watch: "group_watch",
	rhythm: "group_rhythm",
	learning: "group_learning"
};
function zt(e) {
	return Rt[e];
}
function Bt(e) {
	let t = U(e), n = (e, t) => e.name.localeCompare(t.name);
	return [
		{
			key: "need",
			devices: Ke(t)
		},
		{
			key: "watch",
			devices: t.filter((e) => e.status === "watch").sort(n)
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
function Vt(e, t, n) {
	let r = G(t);
	return !K(t) || r === null ? null : R(e, "flag_silent", { span: jt(e, n - r) });
}
function Ht(e, t, n) {
	return t.ignored ? "" : Vt(e, t, n) || (Ot(t) ? R(e, "pill_waiting") : t.status === "learning" ? R(e, "pill_learning") : "");
}
function Ut(e, t, n) {
	if (t.ignored) return {
		text: R(e, "ignored"),
		tone: "muted"
	};
	if (Ot(t)) return {
		text: R(e, "status_waiting"),
		tone: "warn"
	};
	let r = t.battery.level;
	if (t.status === "watch" && t.reason_key?.startsWith("battery") && r !== null) return {
		text: R(e, "status_battery", { level: Math.round(r) }),
		tone: "warn"
	};
	if (B[t.status] >= 1) return {
		text: R(e, Ge(t.status)),
		tone: V(t.status)
	};
	if (t.status === "learning") return {
		text: R(e, "status_learning"),
		tone: "muted"
	};
	let i = t.battery.replaced.at(-1);
	return i !== void 0 && n - i < 172800 ? {
		text: R(e, "new_battery"),
		tone: "ok"
	} : null;
}
function Wt(e, t) {
	if (t <= 0 || e.length <= t) return e;
	let n = Math.ceil(e.length / t), r = [];
	for (let t = 0; t < e.length; t += n) {
		let i = e.slice(t, t + n);
		r.push(i.every((e) => e === null) ? null : i.reduce((e, t) => e + (t ?? 0), 0));
	}
	return r;
}
function Gt(e) {
	let [t = "0", n = "0"] = e.split(":");
	return Number(t) + Number(n) / 60;
}
function Kt(e, t) {
	let n = Gt(e), r = Gt(t);
	return n === r ? [] : n < r ? [[n, r]] : [[0, r], [n, 24]];
}
function qt(e, t, n) {
	if (t.ignored) return {
		text: R(e, "dh_ignored"),
		tone: "muted"
	};
	let r = t.reason_key ?? "", i = G(t);
	return K(t) && i !== null ? {
		text: B[t.status] >= 2 ? R(e, "dh_silent", { span: jt(e, n - i) }) : R(e, "dh_watch"),
		tone: V(t.status)
	} : Ot(t) ? {
		text: R(e, "dh_waiting"),
		tone: "warn"
	} : r === "unavailable" ? {
		text: R(e, "dh_unavailable"),
		tone: V(t.status)
	} : r === "partner" ? {
		text: R(e, "dh_partner"),
		tone: V(t.status)
	} : r.startsWith("battery") && t.battery.level !== null ? {
		text: R(e, "dh_battery", { level: Math.round(t.battery.level) }),
		tone: V(t.status)
	} : t.status === "learning" ? {
		text: R(e, "dh_learning"),
		tone: "muted"
	} : {
		text: R(e, "dh_ok"),
		tone: "accent"
	};
}
function Jt(e, t, n, r) {
	return K(t) && t.typical !== null && t.last_activity !== null ? R(e, "detail_every", {
		every: Ye(e, t.typical).replace(/\.$/, ""),
		when: pt(e, t.last_activity, n, r)
	}) : t.status === "learning" && !t.ignored ? R(e, "learning_hint") : t.reason;
}
function Yt(e, t, n) {
	return K(t) && !Nt(n) ? R(e, "partner_quiet", {
		partner: n.name,
		name: t.name
	}) : !Nt(t) && !Nt(n) ? R(e, "partner_both") : "";
}
function Xt(e) {
	return Array.isArray(e) && e.length === 2 && typeof e[0] == "number" && typeof e[1] == "number";
}
function Zt(e) {
	return Array.isArray(e) ? e.filter(Xt) : [];
}
function Qt(e, t) {
	return t.length < 2 ? [] : e.map(([e, n]) => [lt(e, t), lt(n, t)]).filter(([e, t]) => t > e);
}
function $t(e) {
	return Array.isArray(e) && e.every((e) => e === null || typeof e == "number");
}
function en(e) {
	return Array.isArray(e) && e.every($t);
}
function tn(e) {
	if (typeof e != "object" || !e) return null;
	let t = Reflect.get(e, "start"), n = Reflect.get(e, "days"), r = Reflect.get(e, "bin_minutes"), i = Reflect.get(e, "devices");
	if (typeof t != "number" || typeof n != "number" || typeof r != "number" || r <= 0 || typeof i != "object" || !i) return null;
	let a = {};
	for (let [e, t] of Object.entries(i)) en(t) && (a[e] = t);
	return {
		start: t,
		days: n,
		binMinutes: r,
		dayStarts: at(Reflect.get(e, "day_starts"), t, n),
		devices: a,
		noData: Zt(Reflect.get(e, "no_data"))
	};
}
function nn(e, t, n) {
	let r = n * 60, i = [];
	return t <= 0 || e.forEach((e, n) => {
		e && i.push({
			at: (n + .5) * r / t,
			count: e
		});
	}), i;
}
function rn(e) {
	return e >= 3 ? 22 : e === 2 ? 18 : 12;
}
var an = 2;
function on(e, t) {
	let n = G(e);
	if (!K(e) || n === null || t.length < 2) return -1;
	let r = t.length - 1, i = ((t[r] ?? 0) - (t[0] ?? 0)) / (r * 12), a = ct(n, t);
	if (a < 0) return 0;
	let o = [];
	e.strip.forEach((e, t) => {
		e && t <= a && o.push(t);
	});
	let s = Math.max(3, Math.ceil(3 * (e.typical ?? 0) / i));
	for (let e = o.length - 2; e >= 0 && o.length - 1 - e <= an; e--) {
		let t = o[e], n = o[e + 1];
		if (t === void 0 || n === void 0) break;
		if (n - t - 1 >= s) return t + 1;
	}
	return a + 1;
}
function sn(e, t, n, r) {
	let i = G(e);
	if (!K(e) || i === null) return -1;
	let a = r * 60, o = -1;
	return t.forEach((e, t) => {
		let r = n[t], i = n[t + 1];
		r !== void 0 && i !== void 0 && e.forEach((e, t) => {
			e && (o = Math.max(o, Math.min(i, r + (t + 1) * a)));
		});
	}), Math.max(i, o);
}
var cn = {
	now: "set_level_now",
	daily: "set_level_daily",
	off: "set_level_off"
};
function ln(e, t) {
	let n = t.quiet;
	return [R(e, "day_line_summary", { time: t.summary_time }), n.enabled ? R(e, "day_line_quiet", {
		start: n.start,
		end: n.end
	}) : R(e, "day_line_no_quiet")].join(" · ");
}
function un(e) {
	let t = Reflect.get(e.arrive_home, "persons");
	if (Array.isArray(t)) return t.filter((e) => typeof e == "string");
	let n = Reflect.get(e.arrive_home, "person");
	return typeof n == "string" ? [n] : [];
}
function dn(e, t, n) {
	let r = t.quiet, i = {
		failed: "set_failed",
		check: "set_check",
		battery: "set_battery"
	}, a = /* @__PURE__ */ new Map();
	for (let n of [
		"failed",
		"check",
		"battery"
	]) {
		let r = t.levels[n];
		a.set(r, [...a.get(r) ?? [], R(e, i[n])]);
	}
	let o = new Intl.ListFormat(e, { type: "conjunction" }), s = [...a].map(([t, n]) => R(e, "set_group", {
		names: o.format(n),
		level: R(e, cn[t])
	})).join(", "), c = `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
	return {
		line1: R(e, "set_head", { time: t.summary_time }),
		line2: r.enabled ? R(e, "set_quiet", {
			start: r.start,
			end: r.end
		}) : R(e, "set_no_quiet"),
		sub: [n ? `${n}.` : "", c].filter(Boolean).join(" ")
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
`, fn = o`
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
  .nm {
    display: flex;
    align-items: center;
    gap: var(--pu-sp-12);
    min-width: 0;
  }
  .nm ha-icon {
    flex: none;
    color: var(--pu-muted);
    --mdc-icon-size: 20px;
  }
  /* Name immer in Textfarbe – die Statusfarbe steht höchstens am Symbol */
  .nm ha-icon.t-crit {
    color: var(--pu-crit-text);
  }
  .nm ha-icon.t-warn {
    color: var(--pu-warn-text);
  }
  /* Erst weicht der Raum, dann der Name */
  .nm b {
    flex: 0 0 auto;
    max-width: 100%;
    min-width: 0;
    font-size: var(--pu-fs-15);
    font-weight: 600;
    color: var(--pu-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .room {
    flex: 0 100 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--pu-fs-13);
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
      padding: var(--pu-sp-12) 0 10px;
    }
    .rowgrid pulse-rhythm {
      grid-column: 1 / -1;
      grid-row: 2;
      --rhythm-height: 22px;
    }
    .nm ha-icon,
    .room {
      display: none;
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
`, pn = [
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
], mn = [], hn = "https://github.com/SH1FT-W/pulse/blob/main/CHANGELOG.md";
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
      <span><b>${R(e, "welcome_zigbee_title")}</b><small>${R(e, "welcome_zigbee_text")}</small></span>
      ${t ? E`<span class="on"><ha-icon icon="mdi:check-circle"></ha-icon>${R(e, "zigbee_active")}</span>` : E`<ha-switch tabindex="-1" aria-hidden="true"></ha-switch>`}
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
		let e = this.language, t = this.mode === "welcome", n = t ? pn : mn;
		return E`<ha-dialog open @closed=${() => this.close()}>
      <div class="sheet">
        <div class="glow" aria-hidden="true"></div>
        ${this.renderEcg()}
        ${t ? E`<h2>${R(e, "welcome_head1")}<br /><span class="grad">${R(e, "welcome_head2")}</span></h2>
                <p class="lead">${R(e, "welcome_lead")}</p>` : E`<h2 class="news">${R(e, "whats_new_title", { version: this.version })}</h2>`}
        <ol>
          ${n.map((t, n) => E`<li>
              <em class="mono">${String(n + 1).padStart(2, "0")}</em>
              <span><b>${R(e, t.title)}.</b> ${R(e, t.text)}</span>
            </li>`)}
        </ol>
      </div>
      <!-- Fester Fuß: Schalter und „Weiter“ bleiben immer sichtbar, der Text darüber scrollt -->
      <div slot="footer" class="foot">
        ${t && this.zigbee !== "none" ? this.renderZigbee() : k}
        <button class="go" type="button" @click=${() => this.close()}>${R(e, "continue")}</button>
        ${t ? k : E`<a class="all" href=${hn} target="_blank" rel="noreferrer">${R(e, "whats_new_all")}</a>`}
      </div>
    </ha-dialog>`;
	}
	static {
		this.styles = [
			J,
			X,
			o`
      ha-dialog {
        /* Bühne wie die Seite: im Dunkeln schwarz, damit das EKG leuchtet */
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
      /* Leuchten läuft zu allen Rändern weich aus – keine Kante am Dialogrand */
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
        /* Einfarbig wie alle Primärknöpfe: Weiß auf dem Flächen-Akzent ≥ 4,5:1 */
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
      /* Handy: HAs Dialog-Fuß hat dort keinen Innenabstand – bündig mit dem Text darüber */
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
var gn = "pulse.seenVersion", _n = "", vn = "pulse.welcome";
function yn(e, t, n = !0) {
	let r = e.getItem(gn);
	return r === t ? null : r === _n ? "welcome" : r !== null || e.getItem(vn) !== null ? n ? "whatsNew" : (bn(e, t), null) : (e.setItem(gn, _n), "welcome");
}
function bn(e, t) {
	e.setItem(gn, t);
}
//#endregion
//#region src/pulse-heartbeat.ts
var xn = 1e3, Sn = 24, Cn = [
	3,
	6,
	9,
	12,
	15,
	18,
	21
];
function wn(e) {
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
		Array.isArray(t) && t.length === this.bins.length && wn(this.bins) > wn(t) && (this.beating = !0);
	}
	row(e, t, n) {
		let r = n - t, i = (e) => `${(e / r * 100).toFixed(2)}%`, a = (e) => (e / r * xn).toFixed(1), o = ut(t, n, Cn, this.timeZone).map((e) => {
			let t = (e * xn).toFixed(1);
			return D`<line class="grid" x1=${t} x2=${t} y1="3" y2=${21}></line>`;
		}), s = k;
		if (this.silentSince > 0 && this.silentSince < n && this.now > t) {
			let e = Math.max(this.silentSince, t) - t, r = Math.min(this.now, n) - t;
			r > e && (s = D`<line class="silent" x1=${a(e)} x2=${a(r)} y1=${Sn / 2} y2=${Sn / 2}></line>`);
		}
		let c = nn(this.bins[e] ?? [], r, this.binMinutes).map((e) => E`<i class="tk" style=${`left: ${(e.at * 100).toFixed(2)}%; height: ${rn(e.count)}px`}></i>`), l = this.noData.map(([e, r]) => [Math.max(e, t), Math.min(r, n)]).filter(([e, t]) => t > e).map(([e, n]) => E`<span class="gap" style=${`left: ${i(e - t)}; width: ${i(n - e)}`}></span>`), u = this.now >= t && this.now < n, d = u ? E`<span
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
        <svg viewBox="0 0 ${xn} ${Sn}" preserveAspectRatio="none" aria-hidden="true">${o}${s}</svg>
        <div class="ticks">${c}</div>
        ${d}
      </div>
    </div>`;
	}
	render() {
		let e = Math.max(0, this.dayStarts.length - 1), t = wn(this.bins), n = Array.from({ length: e }, (e, t) => this.row(t, this.dayStarts[t] ?? 0, this.dayStarts[t + 1] ?? 0));
		return E`<div class="cal" role="img" aria-label=${R(this.language, "heartbeat_aria", {
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
var Tn = "(pointer: coarse), (max-width: 600px)", En = 6, Z = 0, Dn = "";
function On(e) {
	let t = document.documentElement;
	e ? (Z === 0 && (Dn = t.style.overflow, t.style.overflow = "hidden"), Z += 1) : Z > 0 && (--Z, Z === 0 && (t.style.overflow = Dn));
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
		e !== this.locked && (this.locked = e, On(e));
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
		e.target === this.dialog && this.dialog?.close();
	}
	onWheel(e) {
		let t = this.body;
		t !== null && e.composedPath().includes(t) || e.preventDefault();
	}
	sheetMode() {
		return window.matchMedia(Tn).matches;
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
			if (Math.abs(r) < En) return;
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
		n.style.transition = "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)", St(t.dy, r) ? (n.style.transform = "translateY(100%)", window.setTimeout(() => n.close(), 220)) : n.style.transform = "";
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
            ${this.noClose ? k : E`<ha-icon-button .label=${R(this.language, "close")} @click=${() => this.dialog?.close()}>
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
        /* Flächen: hell = Seitenhintergrund mit weißen Listen, dunkel = erhöhte Fläche (setzt das Panel) */
        --pu-card: var(--pulse-sheet-card, var(--card-background-color, #fff));
        width: min(100% - 2 * 16px, 520px);
        max-height: min(100dvh - 2 * 32px, 760px);
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
      /* Nur offen sichtbar – sonst überschriebe display:flex das Verstecken des <dialog> */
      dialog[open] {
        display: flex;
        flex-direction: column;
        animation: fade-in 250ms cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      /* Den Dialog selbst nicht umranden – der Fokus liegt auf seinen Knöpfen */
      dialog:focus {
        outline: none;
      }
      dialog::backdrop {
        /* ::backdrop erbt je nach Browser keine Variablen – deshalb ohne Token */
        background: color-mix(in srgb, black 40%, transparent);
      }
      /* Kopf fest, nur der Inhalt scrollt (min-height: 0 lässt den Flex-Bereich schrumpfen) */
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
      /* Handy: am unteren Rand, volle Breite, fährt von unten herein, Griff + Kopf zum Wegwischen */
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
var kn = 12;
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
		return this.options.length > kn ? this.renderSheet() : E`<ha-dropdown placement="bottom-end" @wa-select=${(e) => this.pick(L(e))}>
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
var An = 480, jn = 1e3, Q = 26;
function Mn(e) {
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
			let t = e[0]?.contentRect.width ?? 0, n = t > 0 && t < An;
			n !== this.narrow && (this.narrow = n), Math.abs(t - this.width) >= 8 && (this.width = t);
		}), this.observer.observe(this);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.observer?.disconnect(), this.observer = null;
	}
	willUpdate(e) {
		if (!e.has("buckets")) return;
		let t = e.get("buckets");
		Array.isArray(t) && t.length === this.buckets.length ? Mn(this.buckets) > Mn(t) && (this.growAt = this.buckets.findLastIndex((e) => (e ?? 0) > 0)) : this.growAt = -1;
	}
	render() {
		let e = this.narrow && this.buckets.length > 48 ? 2 : 1, t = e > 1 ? Wt(this.buckets, Math.ceil(this.buckets.length / 2)) : this.buckets, n = t.length || 1, r = this.silentFrom >= 0 ? Math.ceil(this.silentFrom / e) : -1, i = Xe(t), a = jn / n, o = a * .56, s = i.indexOf(null), c = s < 0 ? n : s, l = this.tone === "warn" || this.tone === "crit", u = this.growAt >= 0 ? Math.floor(this.growAt / e) : -1, d = -1;
		if (l && r >= 0) for (let e = 0; e < Math.min(r, n); e++) (i[e] ?? 0) > 0 && (d = e);
		let f = l && r < 0 && c > 0 ? c - 1 : -1, p = (e) => {
			let t = (e + .5) / n;
			return this.gaps.some(([e, n]) => t >= e && t <= n);
		}, m = [], h = [];
		i.forEach((e, t) => {
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
		}), f >= 0 && h.push(D`<rect class="mark" x=${(f * a + (a - o) / 2).toFixed(1)} y="1" width=${o.toFixed(1)} height=${24} rx=${(o / 2).toFixed(1)}></rect>`), r >= 0 && r < c && h.push(D`<line class="silent" x1=${(r * a).toFixed(1)} x2=${(c * a).toFixed(1)} y1=${Q / 2} y2=${Q / 2}></line>`);
		let g = Array.from({ length: Math.max(0, this.days - 1) }, (e, t) => {
			let n = ((t + 1) / this.days * jn).toFixed(1);
			return D`<line class="day" x1=${n} x2=${n} y1="1" y2=${25}></line>`;
		});
		return E`${this.gaps.map(([e, t]) => E`<span class="gap" style=${`left: ${(e * 100).toFixed(2)}%; width: ${((t - e) * 100).toFixed(2)}%`}></span>`)}<svg class="base" viewBox="0 0 ${jn} ${Q}" preserveAspectRatio="none" aria-hidden="true">${g}${m}</svg><svg class="hot" viewBox="0 0 ${jn} ${Q}" preserveAspectRatio="none" aria-hidden="true">${h}</svg>${this.renderFlag(r, c, n, (e) => `${(e / n * 100).toFixed(2)}%`)}`;
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
function Nn(e) {
	return V(e.status) === "warn" ? "warn" : "crit";
}
function Pn(e) {
	return e.ignored ? "muted" : V(e.status) === "ok" ? "ok" : "neutral";
}
var Fn = Array.from({ length: 12 }, (e, t) => ({
	value: String(t + 1),
	label: String(t + 1)
})), In = {
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
			settingsOpen: { state: !0 }
		};
	}
	constructor() {
		super(), this.gapsOf = z(Qt), this.beatKey = "", this.device = null, this.devices = [], this.language = "en", this.now = 0, this.stripStart = 0, this.stripDays = 7, this.dayStarts = [], this.timeZone = void 0, this.timeFormat = void 0, this.bucketHours = 2, this.fetchHeartbeat = null, this.beat = null, this.batteryTypes = [], this.chemistries = [], this.noData = [], this.open = !1, this.readonly = !1, this.settingsOpen = !1;
	}
	willUpdate(e) {
		if (!e.has("device") && !e.has("open") && !e.has("stripStart")) return;
		let t = this.device;
		if (!this.open || !t) {
			this.beatKey = "";
			return;
		}
		let n = `${t.id}|${t.last_activity ?? ""}|${this.dayStarts[0] ?? this.stripStart}`;
		n !== this.beatKey && ((!this.beat || !(t.id in this.beat.devices)) && (this.beat = null), this.beatKey = n, this.loadBeat(t.id, n));
	}
	async loadBeat(e, t) {
		if (!this.fetchHeartbeat) return;
		let n = tn(await this.fetchHeartbeat([e]));
		t === this.beatKey && n && (this.beat = n);
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
	switchRow(e, t, n, r) {
		return this.readonly ? E`<div class="row">
        <span class="label">${e}<small>${t}</small></span>
        <span class="value">${R(this.language, n ? "on" : "off")}</span>
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
		let t = this.language, n = e.battery, r = e.snooze_until !== null && e.snooze_until > this.now, i = n.flag ? R(t, n.low ? "battery_flag_low" : "battery_flag_ok") : n.level === null ? R(t, "unknown") : R(t, "unit_percent", { value: Math.round(n.level) }), a = n.type ? (n.count ?? 1) > 1 ? R(t, "battery_count_type", {
			count: n.count ?? 1,
			type: n.type
		}) : n.type : R(t, "unknown"), o = this.timeZone, s = qt(t, e, this.now), c = e.partner ? this.devices.find((t) => t.id === e.partner) ?? null : null, l = n.replaced.at(-1), u = this.beat, d = u?.devices[e.id] ?? null, f = u?.noData ?? this.noData, p = this.gapsOf(f, this.dayStarts), m = Math.max(1, this.dayStarts.length - 1), h = (e) => E`<pulse-rhythm .buckets=${e.strip} tone=${H(e)} ?learning=${e.status === "learning" && !e.ignored} .gaps=${p} .days=${m} .silentFrom=${on(e, this.dayStarts)}></pulse-rhythm>`, g = c ? Yt(t, e, c) : "", ee = [e.area, e.model].filter(Boolean).join(" · ");
		return E`
      <header class="hero">
        ${ee ? E`<p class="dname"><ha-icon .icon=${e.icon}></ha-icon><span>${ee}</span></p>` : k}
        <h3 class=${`dhl ${s.tone === "accent" ? "grad" : `t-${s.tone}`}`}>${s.text}</h3>
        <p class="dtx">${Jt(t, e, o, this.timeFormat)}</p>
      </header>

      ${this.readonly ? E`<p class="ro muted small"><ha-icon icon="mdi:lock-outline"></ha-icon>${R(t, "read_only")}</p>` : k}
      ${Tt(e) && !this.readonly ? E`<div class="buttons">
              <button class="pbtn primary" type="button" @click=${() => this.fire("replaced", { id: e.id })}>
                <ha-icon icon="mdi:battery-sync-outline"></ha-icon>${R(t, "replaced")}
              </button>
              ${r && e.snooze_until !== null ? E`<span class="snoozed">
                      <span class="muted small">${R(t, "snoozed_until", { when: pt(t, e.snooze_until, o, this.timeFormat) })}</span>
                      <button class="pbtn" type="button" @click=${() => this.fire("snooze-cancel", { id: e.id })}>${R(t, "snooze_cancel")}</button>
                    </span>` : E`<button class="pbtn" type="button" @click=${() => this.fire("later", { id: e.id })}>${R(t, "later")}</button>`}
            </div>` : k}

      <section class="cal">
        <div class="hd">
          <span class="cap">${R(t, "heartbeat_title")}</span>
          <span class="legend">
            <span>${R(t, "heartbeat_legend")}</span>
            ${p.length ? E`<span class="lg-gap"><i aria-hidden="true"></i>${R(t, "no_data_legend")}</span>` : k}
          </span>
        </div>
        ${d && u ? E`<pulse-heartbeat
                .bins=${d}
                .dayStarts=${u.dayStarts}
                .binMinutes=${u.binMinutes}
                .timeZone=${o}
                .now=${this.now}
                .silentSince=${sn(e, d, u.dayStarts, u.binMinutes)}
                .noData=${f}
                silence=${Nn(e)}
                .language=${t}
                tone=${Pn(e)}
              ></pulse-heartbeat>` : E`<div class="cal-wait"><pulse-rhythm .buckets=${e.strip} tone=${H(e)} ?learning=${e.status === "learning" && !e.ignored} .gaps=${p} .days=${m} .silentFrom=${on(e, this.dayStarts)} .flag=${Ht(t, e, this.now)}></pulse-rhythm>
                <div class="axis muted" aria-hidden="true" style=${`grid-template-columns: ${st(this.dayStarts)}`}>${ot(t, this.dayStarts, o).map((e) => E`<span>${e}</span>`)}</div></div>`}
      </section>

      ${c ? E`<section class="pair">
              <span class="cap">${R(t, "with_partner")}</span>
              <div class="l"><span>${c.name}</span>${h(c)}</div>
              <div class="l"><span>${e.name}</span>${h(e)}</div>
              ${g ? E`<p>${g}</p>` : k}
            </section>` : k}

      <section class="stats">
        <div>
          <span>${R(t, "battery")}</span>
          <b class=${n.trusted ? "" : "faint"}>${i}</b>
          ${n.trusted ? k : E`<small>${R(t, "stat_rechargeable")}</small>`}
        </div>
        <div><span>${R(t, "battery_type")}</span><b>${a}</b></div>
        <div><span>${R(t, "stat_changed")}</span><b>${l === void 0 ? R(t, "unknown") : wt(t, l, this.now, o)}</b></div>
      </section>

      <details class="more" ?open=${this.settingsOpen} @toggle=${(e) => {
			let t = e.currentTarget;
			t instanceof HTMLDetailsElement && (this.settingsOpen = t.open);
		}}>
        <summary>
          <span>${R(t, "device_settings")}</span>
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </summary>
        ${this.renderSettings(e)}
      </details>
    `;
	}
	renderSettings(e) {
		let t = this.language, n = e.battery, r = [{
			value: "",
			label: R(t, "type_unknown")
		}, ...this.batteryTypes.map((e) => ({
			value: e,
			label: e
		}))], i = [{
			value: "",
			label: R(t, "chem_unknown")
		}, ...this.chemistries.map((e) => ({
			value: e,
			label: R(t, In[e] ?? "chem_unknown")
		}))], a = [{
			value: "",
			label: R(t, "partner_none")
		}, ...gt(this.devices, e).map((e) => ({
			value: e.id,
			label: e.name
		}))];
		return E`<div class="settings">
      <section class="section">
        <h4 class="section-title">${R(t, "battery")}</h4>
        <div class="list">
          ${this.picker(R(t, "battery_type"), n.type ?? "", r, (e) => this.change({ battery_type: e || null }))}
          ${this.picker(R(t, "battery_count"), String(n.count ?? 1), Fn, (e) => this.change({ battery_count: Number(e) }))}
          ${this.picker(R(t, "chemistry"), n.chemistry ?? "", i, (e) => this.change({ chemistry: e || null }), n.trusted ? void 0 : R(t, "level_unreliable"))}
          ${n.voltage === null ? k : E`<div class="row"><span class="label">${R(t, "voltage")}</span><span class="value">${mt(t, n.voltage)}</span></div>`}
        </div>
      </section>

      <section class="section">
        <h4 class="section-title">${R(t, "replaced_history")}</h4>
        <div class="list">
          ${Tt(e) || this.readonly ? k : E`<button class="row action" type="button" @click=${() => this.fire("replaced", { id: e.id })}>
                  <span class="label">${R(t, "replaced_now")}</span>
                </button>`}
          ${n.replaced.length ? [...n.replaced].reverse().slice(0, 3).map((e) => E`<div class="row"><span class="label">${dt(t, e, this.timeZone)}</span><span class="value">${Je(t, e, this.now)}</span></div>`) : E`<div class="row"><span class="label muted">${R(t, "never_replaced")}</span></div>`}
        </div>
      </section>

      <section class="section">
        <h4 class="section-title">${R(t, "partner")}</h4>
        <div class="list">
          ${this.picker(R(t, "partner"), e.partner ?? "", a, (e) => this.change({ partner: e || null }))}
        </div>
        <p class="section-foot">${R(t, "partner_hint")}</p>
      </section>

      <section class="section">
        <h4 class="section-title">${R(t, "monitoring")}</h4>
        <div class="list">
          ${this.switchRow(R(t, "important"), R(t, "important_hint"), e.critical, (t) => this.change({ critical: t === e.critical_auto ? null : t }))}
          ${this.switchRow(R(t, "ignore"), R(t, "ignore_hint"), e.ignored, (e) => this.change({ ignored: e }))}
          ${this.readonly ? k : E`<button class="row action" type="button" @click=${() => F(`/config/devices/device/${e.id}`)}>
                  <span class="label">${R(t, "open_device")}</span>
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
      .axis {
        display: grid;
        text-align: center;
        font-size: 12px;
      }
      /* Partner-Vergleich: Haarlinie statt Fläche – im Dunkeln keine graue Kachel */
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

      /* Einstellungen eingeklappt: eine ruhige Zeile, aufgeklappt leichte Listen ohne Fläche */
      .more {
        border-top: 1px solid var(--pu-line);
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
var Ln = {
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
			readonly: { type: Boolean },
			query: { state: !0 },
			collapsed: { state: !0 }
		};
	}
	constructor() {
		super(), this.gapsOf = z(Qt), this.gaps = [], this.devices = [], this.language = "en", this.now = 0, this.start = 0, this.days = 7, this.dayStarts = [], this.timeZone = void 0, this.timeFormat = void 0, this.bucketHours = 2, this.noData = [], this.groupBy = "area", this.filter = null, this.readonly = !1, this.query = "", this.collapsed = /* @__PURE__ */ new Set();
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
		let n = L(t);
		n === "details" ? this.fire("open", { id: e.id }) : n === "replaced" ? this.fire("replaced", { id: e.id }) : n === "later" ? this.fire("later", { id: e.id }) : n === "ignore" && this.fire("device-change", {
			id: e.id,
			changes: { ignored: !e.ignored }
		});
	}
	renderRow(e) {
		let t = this.language, n = Ut(t, e, this.now), r = K(e) && e.last_activity !== null ? pt(t, e.last_activity, this.timeZone, this.timeFormat) : Je(t, e.last_activity, this.now), i = e.ignored ? "ok" : V(e.status), a = this.readonly ? k : E`<span class="menu"><ha-dropdown placement="bottom-end" @wa-select=${(t) => this.onMenu(e, t)}>
          <ha-icon-button slot="trigger" .label=${R(t, "more_for", { name: e.name })}>
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </ha-icon-button>
          <ha-dropdown-item value="details"><ha-icon slot="icon" icon="mdi:information-outline"></ha-icon>${R(t, "details")}</ha-dropdown-item>
          <ha-dropdown-item value="replaced"><ha-icon slot="icon" icon="mdi:battery-sync-outline"></ha-icon>${R(t, "replaced")}</ha-dropdown-item>
          <ha-dropdown-item value="later"><ha-icon slot="icon" icon="mdi:bell-sleep-outline"></ha-icon>${R(t, "later")}</ha-dropdown-item>
          <ha-dropdown-item value="ignore">
            <ha-icon slot="icon" icon=${e.ignored ? "mdi:eye-outline" : "mdi:eye-off-outline"}></ha-icon>${R(t, e.ignored ? "resume" : "ignore")}
          </ha-dropdown-item>
        </ha-dropdown></span>`;
		return E`<div class="mrow">
      <button class="main rowgrid" type="button" @click=${() => this.fire("open", { id: e.id })}>
        <span class="nm">
          <ha-icon class=${`t-${i}`} .icon=${e.icon}></ha-icon>
          <b>${e.name}</b>
          ${this.groupBy !== "area" && e.area ? E`<span class="room">${e.area}</span>` : k}
        </span>
        <pulse-rhythm
          .buckets=${e.strip}
          tone=${H(e)}
          ?learning=${e.status === "learning" && !e.ignored}
          .gaps=${this.gaps}
          .days=${Math.max(1, this.dayStarts.length - 1)}
          .silentFrom=${on(e, this.dayStarts)}
          .flag=${Ht(t, e, this.now)}
        ></pulse-rhythm>
        <span class="st">
          ${n ? E`<b class=${`t-${n.tone}`}>${n.text}</b><span class="sep"> · </span>` : k}<span class="num time">${r}</span>
        </span>
      </button>
      ${a}
    </div>`;
	}
	render() {
		let e = this.language, t = _t(Ct(this.devices, this.filter), this.query), n = this.groupBy === "area", r = t.filter((e) => !e.ignored), i = t.filter((e) => e.ignored), a = yt(r, this.groupBy, e, R(e, "no_area"));
		this.gaps = this.gapsOf(this.noData, this.dayStarts);
		let o = ot(e, this.dayStarts, this.timeZone);
		i.length && a.push({
			area: R(e, "ignored"),
			devices: i
		});
		let s = this.filter ? R(e, "filter_label", { what: R(e, this.filter === "ignored" ? "ignored" : Ge(this.filter)) }) : "";
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
            .value=${this.query}
            placeholder=${this.devices.length === 1 ? R(e, "search_one") : R(e, "search", { count: this.devices.length })}
            @input=${(e) => {
			this.query = Le(e);
		}}
          />
        </label>
        <ha-dropdown placement="bottom-end" @wa-select=${(e) => this.setGroup(L(e) ?? "")}>
          <button slot="trigger" class="chip" type="button">
            ${R(e, "group_by", { what: R(e, Ln[this.groupBy]) })}
            <ha-icon icon="mdi:menu-down"></ha-icon>
          </button>
          ${[
			"area",
			"status",
			"none"
		].map((t) => E`<ha-dropdown-item value=${t}>
              <ha-icon slot="icon" class=${t === this.groupBy ? "check" : "check hidden"} icon="mdi:check"></ha-icon>
              ${R(e, Ln[t])}
            </ha-dropdown-item>`)}
        </ha-dropdown>
        ${s ? E`<button class="chip filter" type="button" @click=${() => this.fire("filter-clear", {})} aria-label=${`${s}, ${R(e, "filter_clear")}`}>
                ${s}
                <ha-icon icon="mdi:close"></ha-icon>
              </button>` : k}
      </div>
      <div class="axis" aria-hidden="true">
        <span>${t.length === 1 ? R(e, "monitor_head_one") : R(e, "monitor_head", { count: t.length })}</span>
        <div class="days mono" style=${`grid-template-columns: ${st(this.dayStarts)}`}>${o.map((e) => E`<span>${e.replace(".", "")}</span>`)}</div>
        <span class="right">${R(e, "col_last")}</span>
      </div>
      ${t.length ? a.map((e) => {
			let t = this.collapsed.has(e.area);
			return E`${e.area ? E`<button class="group" type="button" aria-expanded=${t ? "false" : "true"} @click=${() => this.toggle(e.area)}>
              <ha-icon icon=${t ? "mdi:chevron-right" : "mdi:chevron-down"}></ha-icon>
              <span>${e.area}</span><span class="count">${e.devices.length}</span>
            </button>` : k}${t ? k : e.devices.map((e) => this.renderRow(e))}`;
		}) : E`<p class="empty muted">${this.query.trim() ? R(e, "no_results", { query: this.query }) : R(e, "filter_empty")}</p>`}
    </div>`;
	}
	static {
		this.styles = [
			J,
			Y,
			X,
			fn,
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
          padding-right: 0;
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
var Rn = (e) => `${(e / 24 * 100).toFixed(2)}%`;
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
		let e = this.language, t = this.settings, n = rt(this.now, this.timeZone), r = Gt(t.summary_time), i = t.quiet.enabled ? Kt(t.quiet.start, t.quiet.end) : [], a = ln(e, t);
		return E`<div class="top">
        <span class="cap">${R(e, "day_title")}</span>
        <span class="to">${this.recipients}</span>
      </div>
      <p class="line">${a}</p>
      <div class="band" role="img" aria-label=${`${R(e, "day_title")}: ${a}`}>
        <div class="track" aria-hidden="true">
          ${i.map(([e, t]) => E`<span class="quiet" style=${`left: ${Rn(e)}; width: ${Rn(t - e)}`}></span>`)}
          <span class="nowline" style=${`left: ${Rn(n)}`}></span>
          <span class="dot" style=${`left: ${Rn(r)}`}></span>
        </div>
        <div class="hours mono" aria-hidden="true">
          ${[
			0,
			6,
			12,
			18,
			24
		].map((t) => E`<span>${R(e, "hour_label", { h: t })}</span>`)}
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
var zn = "pulse.closedRooms";
function Bn() {
	try {
		let e = JSON.parse(window.localStorage.getItem(zn) ?? "[]");
		return new Set(Array.isArray(e) ? e.filter((e) => typeof e == "string") : []);
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
function Vn(e) {
	try {
		window.localStorage.setItem(zn, JSON.stringify([...e]));
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
		super(), this.gapsOf = z(Qt), this.gaps = [], this.language = "en", this.now = 0, this.recipients = "", this.timeZone = void 0, this.timeFormat = void 0, this.dayStarts = [], this.noData = [], this.readonly = !1, this.closed = Bn();
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
		t.has(e) ? t.delete(e) : t.add(e), this.closed = t, Vn(t);
	}
	renderRow(e) {
		let t = this.language, n = Ut(t, e, this.now), r = K(e) && e.last_activity !== null ? pt(t, e.last_activity, this.timeZone, this.timeFormat) : Je(t, e.last_activity, this.now);
		return E`<button class="mrow rowgrid" type="button" @click=${() => this.fire("open", { id: e.id })}>
      <span class="nm">
        <ha-icon class=${`t-${e.ignored ? "ok" : V(e.status)}`} .icon=${e.icon}></ha-icon>
        <b>${e.name}</b>
        ${e.area ? E`<span class="room">${e.area}</span>` : k}
      </span>
      <pulse-rhythm
        .buckets=${e.strip}
        tone=${H(e)}
        ?learning=${e.status === "learning" && !e.ignored}
        .gaps=${this.gaps}
        .days=${Math.max(1, this.dayStarts.length - 1)}
        .silentFrom=${on(e, this.dayStarts)}
        .flag=${Ht(t, e, this.now)}
      ></pulse-rhythm>
      <span class="st">
        ${n ? E`<b class=${`t-${n.tone}`}>${n.text}</b><span class="sep"> · </span>` : k}<span class="num time">${r}</span>
      </span>
    </button>`;
	}
	renderSection(e, t) {
		let n = this.language, r = E`<div class="grp">
      <span>${R(n, zt(e))}</span><span class="count">${t.length}</span>
    </div>`;
		return e !== "rhythm" || t.length <= 12 ? E`${r}${t.map((e) => this.renderRow(e))}` : E`${r}${qe(t, R(n, "no_area")).map((e) => {
			let t = this.closed.has(e.area);
			return E`<button class="room-head" type="button" aria-expanded=${t ? "false" : "true"} @click=${() => this.toggleRoom(e.area)}>
          <ha-icon icon=${t ? "mdi:chevron-right" : "mdi:chevron-down"}></ha-icon>
          <span>${e.area}</span><span class="count">${e.devices.length}</span>
        </button>
        ${t ? k : e.devices.map((e) => this.renderRow(e))}`;
		})}`;
	}
	renderZigbee() {
		let e = this.language, t = this.snapshot.z2m, n = E`<span class="cap">${R(e, "welcome_zigbee_title")}</span>`;
		if (!t.present) return k;
		if (t.last_seen && t.availability) return E`<div class="fact zig">${n}<b class="t-ok on"><ha-icon icon="mdi:check-circle"></ha-icon>${R(e, "zigbee_active")}</b><span class="sub">${R(e, "zigbee_devices")}: ${t.devices}</span></div>`;
		let r = t.requested_at !== null && this.now - t.requested_at < 120;
		return this.readonly ? E`<div class="fact zig">${n}<b>${r ? R(e, "zigbee_requested") : R(e, "off")}</b><span class="sub">${R(e, "zigbee_hint")}</span></div>` : E`<div
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
        <b>${r ? R(e, "zigbee_requested") : R(e, "off")}</b>
        ${r ? k : E`<ha-switch tabindex="-1" aria-hidden="true"></ha-switch>`}
      </span>
      <span class="sub">${R(e, "zigbee_hint")}</span>
    </div>`;
	}
	renderFacts() {
		let e = this.language, t = this.snapshot, n = Et(e, t.summary.low_batteries ?? []), r = t.summary.next_battery, i = xt(t.devices), a = t.devices.filter((e) => e.ignored).length;
		return E`<section class="facts">
      <div class="fact">
        <span class="cap">${R(e, "batteries")}</span>
        <b class=${n.tone === "warn" ? "t-warn" : ""}>${n.label}</b>
        <span class="sub">${[n.value, r].filter(Boolean).join(" · ") || R(e, "nothing_due")}</span>
      </div>
      ${i ? E`<button class="fact tappable" type="button" @click=${() => this.fire("open", { id: i.device.id })}>
              <span class="cap">${R(e, "last_change")}</span>
              <b>${wt(e, i.at, this.now, this.timeZone)}</b>
              <span class="sub">${i.device.name}</span>
            </button>` : E`<div class="fact"><span class="cap">${R(e, "last_change")}</span><b>${R(e, "unknown")}</b><span class="sub">${R(e, "never_replaced")}</span></div>`}
      ${this.renderZigbee()}
      ${a ? E`<button class="fact tappable" type="button" @click=${() => this.show("ignored")}>
              <span class="cap">${R(e, "ignored")}</span>
              <b>${R(e, "ignored_count", { count: a })}</b>
              <span class="sub">${R(e, "show_list")}</span>
            </button>` : k}
    </section>`;
	}
	render() {
		let e = this.language, t = this.snapshot, n = Pt(e, t.devices), r = It(e, t.devices, this.now, this.timeZone), i = Bt(t.devices);
		this.gaps = this.gapsOf(this.noData, this.dayStarts);
		let a = t.devices.filter((e) => !e.ignored).length, o = a === 1 ? R(e, "monitor_head_one") : R(e, "monitor_head", { count: a }), s = new Intl.DateTimeFormat(e, {
			weekday: "short",
			...this.timeZone ? { timeZone: this.timeZone } : {}
		}).format(/* @__PURE__ */ new Date(this.now * 1e3)), c = ot(e, this.dayStarts, this.timeZone).map((e, t, n) => t === n.length - 1 ? s : e);
		return E`<div class="page">
      <section class="hero">
        <div class="words">
          <h2 class="hl">
            <span class="long">${n.line1}</span><span class="short">${n.line1Short}</span><br />
            <span class="grad long">${n.line2}</span><span class="grad short">${n.line2Short}</span>
          </h2>
          <p class="hsub">
            ${r.mentions.map((e) => E`${e.before}<b class=${`t-${e.tone}`}>${e.name}</b>${e.after} `)}${r.text}
          </p>
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

      <section class="monitor" aria-label=${o}>
        <div class="axis">
          <span>${o}</span>
          <div class="days mono" style=${`grid-template-columns: ${st(this.dayStarts)}`}>${c.map((e) => E`<span>${e.replace(".", "")}</span>`)}</div>
          <span class="right">${R(e, "col_last")}</span>
        </div>
        ${i.map((e) => this.renderSection(e.key, e.devices))}
      </section>

      ${this.renderFacts()}
    </div>`;
	}
	static {
		this.styles = [
			J,
			Y,
			X,
			fn,
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
      .grp .count::before {
        content: '· ';
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
      .fact .sub {
        font-size: var(--pu-fs-13);
        color: var(--pu-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
          white-space: normal;
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
}, Hn = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Un = class {
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
}, { I: Wn } = Ae, Gn = (e) => e.strings === void 0, Kn = {}, qn = (e, t = Kn) => e._$AH = t, Jn = Hn(class extends Un {
	constructor(e) {
		if (super(e), e.type !== $.PROPERTY && e.type !== $.ATTRIBUTE && e.type !== $.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!Gn(e)) throw Error("`live` bindings can only contain a single expression");
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
		return qn(e), t;
	}
});
I("pulse-settings", class extends N {
	static {
		this.properties = {
			snapshot: { attribute: !1 },
			language: { type: String },
			now: { type: Number },
			recipients: { type: String },
			names: { attribute: !1 },
			timeZone: { attribute: !1 }
		};
	}
	constructor() {
		super(), this.language = "en", this.now = 0, this.recipients = "", this.names = {}, this.timeZone = void 0;
	}
	save(e) {
		this.dispatchEvent(new CustomEvent("settings-change", {
			detail: { settings: e },
			bubbles: !0,
			composed: !0
		}));
	}
	fire(e) {
		this.dispatchEvent(new CustomEvent(e, {
			bubbles: !0,
			composed: !0
		}));
	}
	onZ2mBase(e) {
		let t = e.target;
		if (!(t instanceof HTMLInputElement)) return;
		let n = this.snapshot.settings.z2m_base, r = ht(t.value);
		if (r === null) {
			P(this, R(this.language, "z2m_base_invalid")), t.value = n;
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
		return bt(e).map((e) => ({
			value: e,
			label: e
		}));
	}
	togglePerson(e, t) {
		let n = un(this.snapshot.settings), r = t ? [.../* @__PURE__ */ new Set([...n, e])] : n.filter((t) => t !== e);
		this.save({ arrive_home: { persons: r } });
	}
	pickerRow(e, t, n, r, i) {
		let a = this.language;
		return E`<div class=${i ? "row has-icon" : "row"}>
      ${i ? E`<ha-icon class=${`ico ${i.tone}`} icon=${i.icon}></ha-icon>` : k}
      <span class="label">${R(a, e)}</span>
      <pulse-picker
        .language=${a}
        .label=${R(a, e)}
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
		return this.toggleRow(E`<span class="label">${R(i, e)}${r ? E`<small>${R(i, r)}</small>` : k}</span>`, t, n);
	}
	render() {
		let e = this.language, t = this.snapshot, n = t.settings, r = n.targets ?? t.targets, i = [
			{
				value: "now",
				label: R(e, "level_now")
			},
			{
				value: "daily",
				label: R(e, "level_daily")
			},
			{
				value: "off",
				label: R(e, "level_off")
			}
		], a = (e, t, r, a) => this.pickerRow(t, n.levels[e], i, (t) => this.save({ levels: { [e]: t } }), {
			icon: r,
			tone: a
		}), o = un(n), s = dn(e, n, this.recipients);
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
        <h3 class="section-title">${R(e, "recipients")}</h3>
        <div class="list">
          ${t.targets.length ? t.targets.map((e) => this.toggleRow(E`<ha-icon class="ico" icon="mdi:cellphone"></ha-icon>
                      <span class=${this.names[e] ? "label" : "label capname"}>${this.targetLabel(e)}</span>`, r.includes(e), (t) => this.toggleTarget(e, t), !0)) : E`<div class="row"><span class="label muted">${R(e, "recipients_none")}</span></div>`}
        </div>
        ${t.targets.length ? E`<p class="section-foot">${R(e, "recipients_hint")}</p>` : k}
      </section>

      <section class="section">
        <h3 class="section-title">${R(e, "when")}</h3>
        <div class="list">
          ${a("failed", "level_failed", "mdi:heart-broken-outline", "t-crit")}
          ${a("check", "level_check", "mdi:alert-circle-outline", "t-warn")}
          ${a("battery", "level_battery", "mdi:battery-low", "")}
        </div>
        <p class="section-foot">${R(e, "levels_hint")}</p>
      </section>

      <section class="section">
        <h3 class="section-title">${R(e, "times")}</h3>
        <div class="list">
          ${this.pickerRow("summary_time", n.summary_time, this.times(n.summary_time), (e) => this.save({ summary_time: e }))}
          ${this.switchRow("quiet", n.quiet.enabled, (e) => this.save({ quiet: { enabled: e } }))}
          ${n.quiet.enabled ? E`${this.pickerRow("quiet_from", n.quiet.start, this.times(n.quiet.start), (e) => this.save({ quiet: { start: e } }))}
                ${this.pickerRow("quiet_to", n.quiet.end, this.times(n.quiet.end), (e) => this.save({ quiet: { end: e } }))}` : k}
        </div>
        ${n.quiet.enabled ? E`<p class="section-foot">${R(e, "quiet_hint")}</p>` : k}
      </section>

      <section class="section">
        <h3 class="section-title">${R(e, "special")}</h3>
        <div class="list">
          ${this.switchRow("critical", n.critical_alerts, (e) => this.save({ critical_alerts: e }), "critical_hint")}
          ${this.switchRow("arrive", n.arrive_home.enabled, (e) => this.save({ arrive_home: {
			enabled: e,
			persons: o.length || !e ? o : t.persons.slice(0, 1)
		} }), "arrive_hint")}
          ${n.arrive_home.enabled ? t.persons.length ? t.persons.map((e) => this.toggleRow(E`<ha-icon class="ico" icon="mdi:account-outline"></ha-icon>
                        <span class="label">${this.names[e] ?? e}</span>`, o.includes(e), (t) => this.togglePerson(e, t), !0)) : E`<div class="row"><span class="label muted">${R(e, "persons_none")}</span></div>` : k}
          ${this.switchRow("recovered", n.recovered, (e) => this.save({ recovered: e }), "recovered_hint")}
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">${R(e, "zigbee")}</h3>
        <details class="list adv">
          <summary class="row">
            <span class="label">${R(e, "advanced")}</span>
            <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
          </summary>
          <label class="row">
            <span class="label">${R(e, "z2m_base")}</span>
            <input
              class="text"
              type="text"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              placeholder="zigbee2mqtt"
              .value=${Jn(n.z2m_base)}
              @change=${(e) => this.onZ2mBase(e)}
              @keydown=${(e) => {
			e.key === "Enter" && e.currentTarget instanceof HTMLInputElement && e.currentTarget.blur();
		}}
            />
          </label>
          <p class="row adv-hint">${R(e, "z2m_base_hint")}</p>
        </details>
      </section>

      <section class="section">
        <h3 class="section-title">${R(e, "try_it")}</h3>
        <div class="list">
          <button class="row action" type="button" @click=${() => this.fire("test")}>${R(e, "test")}</button>
          <button class="row action" type="button" @click=${() => this.fire("summary")}>${R(e, "summary_now")}</button>
        </div>
      </section>
      </div>
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
var Yn = 2e3, Xn = 6e4;
function Zn() {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}
function Qn() {
	let e = Zn();
	if (!e) return null;
	try {
		return yn(e, "1.0.0", mn.length > 0);
	} catch {
		return null;
	}
}
function $n(e) {
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
var er = class extends N {
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
			confirmZigbee: { state: !0 }
		};
	}
	constructor() {
		super(), this.unsub = null, this.retryDelay = Yn, this.namesCache = {
			key: "{}",
			value: {}
		}, this.spans = z((e) => Zt(e)), this.watched = z((e) => U(e)), this.dayStarts = z((e) => it(e)), this.onMenuHidden = (e) => {
			let t = e.composedPath()[0];
			t instanceof HTMLElement && t.localName.endsWith("dropdown") && He();
		}, this.deepLink = "", this.subscribedLanguage = "", this.fetchHeartbeat = async (e) => {
			if (!this.hass) return null;
			try {
				return await this.hass.callWS({
					type: "pulse/heartbeat",
					device_ids: e
				});
			} catch {
				return null;
			}
		}, this.narrow = !1, this.snapshot = null, this.now = Date.now() / 1e3, this.openId = null, this.welcome = Qn(), this.error = null, this.groupBy = "area", this.filter = null, this.confirmZigbee = !1;
	}
	get language() {
		return this.hass?.language ?? "en";
	}
	get timeZone() {
		return et(this.hass?.config?.time_zone);
	}
	get timeFormat() {
		return ft(this.hass?.locale?.time_format);
	}
	get readonly() {
		return !Dt(this.hass?.user);
	}
	get view() {
		let e = this.route?.path ?? "";
		return e.startsWith("/settings") ? this.readonly ? "overview" : "settings" : e.startsWith("/devices") ? "devices" : "overview";
	}
	connectedCallback() {
		super.connectedCallback(), Be(), this.addEventListener("wa-after-hide", this.onMenuHidden), this.openDeepLink(), this.now = Date.now() / 1e3, this.clock = window.setInterval(() => {
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
		return $n(t) !== $n(this.hass) || this.names() !== n;
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
			this.snapshot = e, this.now = Date.now() / 1e3, this.error = null, this.retryDelay = Yn;
		}, {
			type: "pulse/subscribe",
			language: this.hass.language
		});
		this.unsub = e, e.catch((t) => {
			if (this.unsub !== e || (this.unsub = null, this.error = Ie(t), !this.isConnected)) return;
			let n = this.retryDelay;
			this.retryDelay = Math.min(n * 2, Xn), this.retryTimer = window.setTimeout(() => {
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
		}), t.ignored === !0 && n && (this.openId = null, P(this, R(this.language, "ignored_done", { name: n.name }), {
			text: R(this.language, "undo"),
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
		}) !== void 0 && (this.openId = null, P(this, R(t, "replaced_done"), {
			text: R(t, "undo"),
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
		P(this, R(t, r ? "replaced_undone" : "replaced_undo_failed"));
	}
	async onConfirmZigbee() {
		this.confirmZigbee = !1, await this.call({ type: "pulse/enable_z2m" }, R(this.language, "zigbee_sent"));
	}
	async onTest() {
		let e = await this.call({ type: "pulse/test" });
		if (e === void 0) return;
		let t = Reflect.get(Object(e), "targets"), n = Array.isArray(t) ? t.length : 0;
		P(this, n ? R(this.language, "test_done", { count: n }) : R(this.language, "test_none"));
	}
	async onSummary() {
		let e = await this.call({ type: "pulse/summary" });
		e !== void 0 && P(this, R(this.language, Reflect.get(Object(e), "sent") ? "summary_sent" : "summary_empty"));
	}
	onMenu(e) {
		let t = L(e);
		t === "summary" && !this.readonly ? this.onSummary() : t === "welcome" ? this.welcome = "welcome" : t === "integration" && F("/config/integrations/integration/pulse");
	}
	welcomeDone() {
		this.welcome = null;
		let e = Zn();
		try {
			e && bn(e, "1.0.0");
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
		let n = this.language, r = (e.settings.targets ?? e.targets).filter((t) => e.targets.includes(t));
		if (!r.length) return R(n, "day_nobody");
		let i = r.slice(0, 2).map((e) => t[e] ?? e.replace(/^mobile_app_/, "").replaceAll("_", " ")).join(", ");
		return R(n, "day_to", { names: r.length > 2 ? `${i} +${r.length - 2}` : i });
	}
	renderHead() {
		let e = this.language, t = [
			{
				value: "overview",
				label: R(e, "tab_overview")
			},
			{
				value: "devices",
				label: R(e, "tab_devices")
			},
			...this.readonly ? [] : [{
				value: "settings",
				label: R(e, "tab_notify")
			}]
		];
		return E`<header class="head">
      <div class="brand" title=${R(e, "subtitle")}>
        <pulse-mark flat></pulse-mark>
        <span>${R(e, "title")}</span>
      </div>
      <pulse-segmented
        .options=${t}
        .value=${this.view}
        .label=${R(e, "title")}
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
		let e = this.language, t = this.snapshot;
		return this.error ? E`<ha-alert alert-type="error">${this.error}</ha-alert>` : t ? t.loaded === !1 ? E`<ha-alert alert-type="info">${R(e, "not_loaded")}</ha-alert>` : this.renderView(t) : E`<p class="muted center">${R(e, "loading")}</p>`;
	}
	render() {
		let e = this.loaded(), t = this.language, n = e?.devices.find((e) => e.id === this.openId) ?? null;
		return E`
      <div class="toolbar">
        ${Fe(this.hass, this.narrow) ? E`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>` : k}
        <div class="toolbar-title">${R(t, "title")}</div>
        <ha-dropdown placement="bottom-end" @wa-select=${(e) => this.onMenu(e)}>
          <ha-icon-button slot="trigger" .label=${R(t, "more")}>
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </ha-icon-button>
          ${this.readonly ? k : E`<ha-dropdown-item value="summary"><ha-icon slot="icon" icon="mdi:text-box-outline"></ha-icon>${R(t, "summary_now")}</ha-dropdown-item>`}
          <ha-dropdown-item value="welcome"><ha-icon slot="icon" icon="mdi:hand-wave-outline"></ha-icon>${R(t, "show_welcome")}</ha-dropdown-item>
          ${this.readonly ? k : E`<ha-dropdown-item value="integration"><ha-icon slot="icon" icon="mdi:cog-outline"></ha-icon>${R(t, "open_integration")}</ha-dropdown-item>`}
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
		}, R(t, "later_done"))}
        @snooze-cancel=${(e) => void this.call({
			type: "pulse/snooze",
			device_id: e.detail.id,
			hours: 0
		}, R(t, "snooze_cancelled"))}
        @device-change=${(e) => this.onDeviceChange(e.detail.id, e.detail.changes)}
        @enable-z2m=${() => {
			this.readonly || (this.confirmZigbee = !0);
		}}
      >
        ${this.renderHead()} ${this.renderContent()}
        <p class="version muted">${R(t, "version", { version: "1.0.0" })}</p>
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
                  .version=${"1.0.0"}
                  .zigbee=${this.zigbeeOffer(e)}
                  @closed=${() => this.welcomeDone()}
                  @enable-z2m=${() => {
			this.confirmZigbee = !0;
		}}
                ></pulse-welcome>
                <pulse-sheet
                  no-close
                  .open=${this.confirmZigbee}
                  .heading=${R(t, "zigbee_confirm_title")}
                  .language=${t}
                  @closed=${() => {
			this.confirmZigbee = !1;
		}}
                >
                  <p class="confirm-text">${R(t, "zigbee_confirm_text")}</p>
                  <p class="confirm-text">${R(t, "zigbee_confirm_side")}</p>
                  <button slot="footer" class="pbtn" type="button" @click=${() => {
			this.confirmZigbee = !1;
		}}>${R(t, "cancel")}</button>
                  <button slot="footer" class="pbtn primary" type="button" @click=${() => void this.onConfirmZigbee()}>
                    ${R(t, "zigbee_confirm_go")}
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
I("pulse-panel", er);
//#endregion
export { er as PulsePanel };
