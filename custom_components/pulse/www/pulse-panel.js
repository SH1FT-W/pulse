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
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: ee, getPrototypeOf: p } = Object, m = globalThis, te = m.trustedTypes, ne = te ? te.emptyScript : "", re = m.reactiveElementPolyfillSupport, h = (e, t) => e, g = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ne : null;
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
}, ie = (e, t) => !l(e, t), _ = {
	attribute: !0,
	type: String,
	converter: g,
	reflect: !1,
	useDefault: !1,
	hasChanged: ie
};
Symbol.metadata ??= Symbol("metadata"), m.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var v = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = _) {
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
		return this.elementProperties.get(e) ?? _;
	}
	static _$Ei() {
		if (this.hasOwnProperty(h("elementProperties"))) return;
		let e = p(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(h("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(h("properties"))) {
			let e = this.properties, t = [...f(e), ...ee(e)];
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
			let i = (n.converter?.toAttribute === void 0 ? g : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? g : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ie)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
v.elementStyles = [], v.shadowRootOptions = { mode: "open" }, v[h("elementProperties")] = /* @__PURE__ */ new Map(), v[h("finalized")] = /* @__PURE__ */ new Map(), re?.({ ReactiveElement: v }), (m.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ae = globalThis, oe = (e) => e, se = ae.trustedTypes, ce = se ? se.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, le = "$lit$", y = `lit$${Math.random().toFixed(9).slice(2)}$`, ue = "?" + y, de = `<${ue}>`, b = document, fe = () => b.createComment(""), x = (e) => e === null || typeof e != "object" && typeof e != "function", pe = Array.isArray, me = (e) => pe(e) || typeof e?.[Symbol.iterator] == "function", he = "[ 	\n\f\r]", S = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ge = /-->/g, _e = />/g, C = RegExp(`>|${he}(?:([^\\s"'>=/]+)(${he}*=${he}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ve = /'/g, ye = /"/g, be = /^(?:script|style|textarea|title)$/i, xe = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), w = xe(1), T = xe(2), E = Symbol.for("lit-noChange"), D = Symbol.for("lit-nothing"), Se = /* @__PURE__ */ new WeakMap(), O = b.createTreeWalker(b, 129);
function Ce(e, t) {
	if (!pe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ce === void 0 ? t : ce.createHTML(t);
}
var we = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = S;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === S ? c[1] === "!--" ? o = ge : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = C) : (be.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = C) : o = _e : o === C ? c[0] === ">" ? (o = i ?? S, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? C : c[3] === "\"" ? ye : ve) : o === ye || o === ve ? o = C : o === ge || o === _e ? o = S : (o = C, i = void 0);
		let d = o === C && e[t + 1].startsWith("/>") ? " " : "";
		a += o === S ? n + de : l >= 0 ? (r.push(s), n.slice(0, l) + le + n.slice(l) + y + d) : n + y + (l === -2 ? t : d);
	}
	return [Ce(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Te = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = we(t, n);
		if (this.el = e.createElement(l, r), O.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = O.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(le)) {
					let t = u[o++], n = i.getAttribute(e).split(y), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? ke : r[1] === "?" ? Ae : r[1] === "@" ? je : Oe
					}), i.removeAttribute(e);
				} else e.startsWith(y) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (be.test(i.tagName)) {
					let e = i.textContent.split(y), t = e.length - 1;
					if (t > 0) {
						i.textContent = se ? se.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], fe()), O.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], fe());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ue) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(y, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += y.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = b.createElement("template");
		return n.innerHTML = e, n;
	}
};
function k(e, t, n = e, r) {
	if (t === E) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = x(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = k(e, i._$AS(e, t.values), i, r)), t;
}
var Ee = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? b).importNode(t, !0);
		O.currentNode = r;
		let i = O.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new De(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Me(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = O.nextNode(), a++);
		}
		return O.currentNode = b, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, De = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = D, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = k(this, e, t), x(e) ? e === D || e == null || e === "" ? (this._$AH !== D && this._$AR(), this._$AH = D) : e !== this._$AH && e !== E && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? me(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== D && x(this._$AH) ? this._$AA.nextSibling.data = e : this.T(b.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Te.createElement(Ce(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ee(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Se.get(e.strings);
		return t === void 0 && Se.set(e.strings, t = new Te(e)), t;
	}
	k(t) {
		pe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(fe()), this.O(fe()), this, this.options)) : r = n[i], r._$AI(a), i++;
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
}, Oe = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = D, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = D;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = k(this, e, t, 0), a = !x(e) || e !== this._$AH && e !== E, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = k(this, r[n + o], t, o), s === E && (s = this._$AH[o]), a ||= !x(s) || s !== this._$AH[o], s === D ? e = D : e !== D && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === D ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, ke = class extends Oe {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === D ? void 0 : e;
	}
}, Ae = class extends Oe {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== D);
	}
}, je = class extends Oe {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = k(this, e, t, 0) ?? D) === E) return;
		let n = this._$AH, r = e === D && n !== D || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== D && (n === D || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Me = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		k(this, e);
	}
}, Ne = {
	M: le,
	P: y,
	A: ue,
	C: 1,
	L: we,
	R: Ee,
	D: me,
	V: k,
	I: De,
	H: Oe,
	N: Ae,
	U: je,
	B: ke,
	F: Me
}, Pe = ae.litHtmlPolyfillSupport;
Pe?.(Te, De), (ae.litHtmlVersions ??= []).push("3.3.3");
var Fe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new De(t.insertBefore(fe(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Ie = globalThis, A = class extends v {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Fe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return E;
	}
};
A._$litElement$ = !0, A.finalized = !0, Ie.litElementHydrateSupport?.({ LitElement: A });
var Le = Ie.litElementPolyfillSupport;
Le?.({ LitElement: A }), (Ie.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/ha.ts
function Re(e, t) {
	return e?.kioskMode !== !0 && (t || e?.dockedSidebar === "always_hidden");
}
function j(e, t, n) {
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
function ze(e, t = !1) {
	t ? history.replaceState(null, "", e) : history.pushState(null, "", e), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: t } }));
}
function M(e, t) {
	customElements.get(e) || customElements.define(e, t);
}
function Be(e) {
	return e instanceof Error ? e.message : typeof e == "object" && e && "message" in e ? String(e.message) : String(e);
}
function Ve(e) {
	let t = e.target;
	return t instanceof HTMLSelectElement || t instanceof HTMLInputElement ? t.value : "";
}
function He(e) {
	let t = Reflect.get(Object(Reflect.get(e, "detail")), "item"), n = Reflect.get(Object(t), "value");
	return typeof n == "string" ? n : null;
}
var Ue = "pointer", We = !1;
function Ge() {
	We || (We = !0, window.addEventListener("pointerdown", () => Ue = "pointer", !0), window.addEventListener("keydown", () => Ue = "keyboard", !0));
}
function Ke() {
	let e = document.activeElement;
	for (; e?.shadowRoot?.activeElement;) e = e.shadowRoot.activeElement;
	return e;
}
function qe() {
	Ue === "pointer" && window.setTimeout(() => {
		let e = Ke();
		e instanceof HTMLElement && e.blur();
		let t = document.activeElement;
		t instanceof HTMLElement && t.tagName !== "BODY" && t.blur();
	}, 0);
}
//#endregion
//#region src/strings-de.ts
var Je = {
	title: "Pulse",
	subtitle: "Merkt, wenn ein Batteriesensor still wird – hört nur zu und kostet keine Batterie.",
	tab_overview: "Übersicht",
	tab_devices: "Geräte",
	tab_notify: "Mitteilungen",
	tab_options: "Einstellungen",
	options_hl1: "{count} Geräte",
	options_hl1_one: "Ein Gerät",
	options_hl2: "hört Pulse zu.",
	options_sub: "Hier legst du fest, was Pulse überwacht und was es zusätzlich mitliest.",
	options_sub_mains: "Davon {mains} am Strom. Hier legst du fest, was Pulse überwacht und was es zusätzlich mitliest.",
	options_watch: "Überwachen",
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
	flag_gone: "Seit {span} nicht erreichbar",
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
	dh_unavailable_for: "Seit {span} nicht erreichbar.",
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
	new_mains_text: "Pulse achtet jetzt auch auf Lampen, Steckdosen und Schalter am Strom, aus jeder Integration. Geräte, die oft aus sind, lernt es kennen. Abschalten unter Einstellungen.",
	new_layout_title: "Übersichtlicher",
	new_layout_text: "Räume heben sich in den Listen klar ab, und „Einstellungen“ hat einen eigenen Reiter: Netzgeräte und Zigbee2MQTT stehen jetzt dort, „Mitteilungen“ ist nur noch für Mitteilungen.",
	new_texts_title: "Deine eigenen Worte",
	new_texts_text: "Titel und Text jeder Mitteilung lassen sich anpassen, mit Platzhaltern und Vorschau.",
	new_labels_title: "Labels statt Klicks",
	new_labels_text: "Das HA-Label pulse_important oder pulse_ignore an einem Gerät reicht. Mitteilungen nennen jetzt den Raum.",
	new_languages_title: "Fünf Sprachen",
	new_languages_text: "Pulse spricht Deutsch, Englisch, Französisch, Spanisch und Niederländisch.",
	manual_title: "Von Hand hinzugefügt",
	manual_add: "Gerät hinzufügen",
	manual_hint: "Kameras, Lautsprecher, Saugroboter oder jedes andere Gerät, das Pulse nicht von selbst überwacht. Pulse meldet, wenn eines nicht mehr erreichbar ist; ob es gerade spielt, wartet oder aus ist, zählt nicht. Geht auch, wenn „Netzgeräte überwachen“ aus ist.",
	manual_remove: "{name} entfernen",
	manual_added: "{name} wird jetzt überwacht.",
	manual_removed: "{name} wird nicht mehr überwacht.",
	manual_search: "Name, Raum oder Integration suchen",
	manual_none: "Pulse überwacht schon jedes Gerät, das es könnte.",
	manual_no_match: "Kein Gerät passt.",
	manual_loading: "Geräte werden geladen …",
	manual_chip: "Von Hand hinzugefügt",
	manual_note: "Von Hand hinzugefügt. Pulse achtet darauf, ob es erreichbar ist und, wenn es sich regelmäßig meldet, ob es still wird.",
	new_manual_title: "Jedes Gerät hinzufügen",
	new_manual_text: "Kameras, Echo-Lautsprecher, Saugroboter oder beliebige Netzgeräte: unter Einstellungen hinzufügen, dann meldet Pulse, wenn eines nicht mehr erreichbar ist."
}, Ye = {
	title: "Pulse",
	subtitle: "Notices when a battery sensor goes quiet – it only listens and costs no battery.",
	tab_overview: "Overview",
	tab_devices: "Devices",
	tab_notify: "Notifications",
	tab_options: "Settings",
	options_hl1: "{count} devices",
	options_hl1_one: "One device",
	options_hl2: "Pulse is listening.",
	options_sub: "Choose what Pulse watches and what it reads in addition.",
	options_sub_mains: "{mains} of them on the mains. Choose what Pulse watches and what it reads in addition.",
	options_watch: "Watch",
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
	flag_gone: "Unreachable for {span}",
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
	dh_unavailable_for: "Unreachable for {span}.",
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
	new_mains_text: "Pulse now also watches lamps, plugs and switches on the mains, from any integration. Devices that are often off are learned. Turn it off under Settings.",
	new_layout_title: "Easier to scan",
	new_layout_text: "Rooms stand out in the lists, and Settings has its own tab: mains-powered devices and Zigbee2MQTT live there now, Notifications is only about notifications.",
	new_texts_title: "Your own words",
	new_texts_text: "Change the title and text of every notification, with placeholders and a preview.",
	new_labels_title: "Labels instead of clicks",
	new_labels_text: "The HA label pulse_important or pulse_ignore on a device is enough. Notifications now name the room.",
	new_languages_title: "Five languages",
	new_languages_text: "Pulse speaks English, German, French, Spanish and Dutch.",
	manual_title: "Added by hand",
	manual_add: "Add device",
	manual_hint: "Cameras, speakers, robot vacuums or any other device Pulse does not watch by itself. Pulse tells you when one is no longer reachable; whether it is playing, idle or off does not matter. Works also with mains-powered devices switched off.",
	manual_remove: "Remove {name}",
	manual_added: "{name} is watched now.",
	manual_removed: "{name} is no longer watched.",
	manual_search: "Search name, room or integration",
	manual_none: "Pulse already watches every device it could.",
	manual_no_match: "No device matches.",
	manual_loading: "Loading devices …",
	manual_chip: "Added by hand",
	manual_note: "Added by hand. Pulse watches whether it is reachable and, if it reports regularly, whether it goes silent.",
	new_manual_title: "Add any device",
	new_manual_text: "Cameras, Echo speakers, robot vacuums or any network device: add them under Settings, Pulse then tells you when one is no longer reachable."
}, Xe = {
	de: Je,
	fr: {
		title: "Pulse",
		subtitle: "Remarque quand un capteur sur pile se tait – il ne fait qu’écouter et ne coûte aucune pile.",
		tab_overview: "Vue d’ensemble",
		tab_devices: "Appareils",
		tab_notify: "Notifications",
		tab_options: "Réglages",
		options_hl1: "{count} appareils",
		options_hl1_one: "Un appareil",
		options_hl2: "Pulse écoute.",
		options_sub: "Choisissez ce que Pulse surveille et ce qu’il lit en plus.",
		options_sub_mains: "Dont {mains} sur secteur. Choisissez ce que Pulse surveille et ce qu’il lit en plus.",
		options_watch: "Surveiller",
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
		flag_gone: "Injoignable depuis {span}",
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
		dh_unavailable_for: "Injoignable depuis {span}.",
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
		new_mains_text: "Pulse surveille désormais aussi lampes, prises et interrupteurs sur secteur, de toute intégration. Les appareils souvent éteints sont appris. À désactiver sous Réglages.",
		new_layout_title: "Plus lisible",
		new_layout_text: "Les pièces se distinguent dans les listes, et Réglages a son propre onglet : appareils sur secteur et Zigbee2MQTT y sont désormais, Notifications ne concerne plus que les notifications.",
		new_texts_title: "Vos propres mots",
		new_texts_text: "Modifiez le titre et le texte de chaque notification, avec des variables et un aperçu.",
		new_labels_title: "Des labels plutôt que des clics",
		new_labels_text: "Le label HA pulse_important ou pulse_ignore sur un appareil suffit. Les notifications indiquent désormais la pièce.",
		new_languages_title: "Cinq langues",
		new_languages_text: "Pulse parle anglais, allemand, français, espagnol et néerlandais.",
		manual_title: "Ajoutés à la main",
		manual_add: "Ajouter un appareil",
		manual_hint: "Caméras, enceintes, robots aspirateurs ou tout autre appareil que Pulse ne surveille pas de lui-même. Pulse vous prévient quand l’un d’eux n’est plus joignable ; qu’il joue, attende ou soit éteint ne compte pas. Fonctionne aussi quand la surveillance des appareils sur secteur est désactivée.",
		manual_remove: "Retirer {name}",
		manual_added: "{name} est maintenant surveillé.",
		manual_removed: "{name} n’est plus surveillé.",
		manual_search: "Chercher un nom, une pièce ou une intégration",
		manual_none: "Pulse surveille déjà tous les appareils possibles.",
		manual_no_match: "Aucun appareil ne correspond.",
		manual_loading: "Chargement des appareils …",
		manual_chip: "Ajouté à la main",
		manual_note: "Ajouté à la main. Pulse vérifie qu’il est joignable et, s’il se signale régulièrement, qu’il ne se tait pas.",
		new_manual_title: "Ajouter n’importe quel appareil",
		new_manual_text: "Caméras, enceintes Echo, robots aspirateurs ou tout appareil réseau : ajoutez-les dans Réglages, Pulse vous prévient quand l’un d’eux n’est plus joignable."
	},
	es: {
		title: "Pulse",
		subtitle: "Se da cuenta cuando un sensor con pila se queda en silencio – solo escucha y no gasta pila.",
		tab_overview: "Resumen",
		tab_devices: "Dispositivos",
		tab_notify: "Notificaciones",
		tab_options: "Ajustes",
		options_hl1: "{count} dispositivos",
		options_hl1_one: "Un dispositivo",
		options_hl2: "Pulse escucha.",
		options_sub: "Elige qué vigila Pulse y qué lee además.",
		options_sub_mains: "{mains} de ellos con corriente. Elige qué vigila Pulse y qué lee además.",
		options_watch: "Vigilar",
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
		flag_gone: "No disponible desde hace {span}",
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
		dh_unavailable_for: "No disponible desde hace {span}.",
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
		new_mains_text: "Pulse ahora también vigila lámparas, enchufes e interruptores conectados a la red, de cualquier integración. Aprende los que suelen estar apagados. Desactívalo en Ajustes.",
		new_layout_title: "Más claro",
		new_layout_text: "Las estancias destacan en las listas y Ajustes tiene su propia pestaña: los dispositivos con corriente y Zigbee2MQTT están ahora allí, Notificaciones solo trata de notificaciones.",
		new_texts_title: "Tus propias palabras",
		new_texts_text: "Cambia el título y el texto de cada notificación, con marcadores y vista previa.",
		new_labels_title: "Etiquetas en vez de clics",
		new_labels_text: "Basta con la etiqueta de HA pulse_important o pulse_ignore en un dispositivo. Las notificaciones ya indican el área.",
		new_languages_title: "Cinco idiomas",
		new_languages_text: "Pulse habla inglés, alemán, francés, español y neerlandés.",
		manual_title: "Añadidos a mano",
		manual_add: "Añadir dispositivo",
		manual_hint: "Cámaras, altavoces, robots aspiradores o cualquier otro dispositivo que Pulse no vigila por sí mismo. Pulse avisa cuando uno deja de estar accesible; que esté reproduciendo, en espera o apagado no cuenta. Funciona también con la vigilancia de dispositivos de red eléctrica desactivada.",
		manual_remove: "Quitar {name}",
		manual_added: "Ahora se vigila {name}.",
		manual_removed: "{name} ya no se vigila.",
		manual_search: "Buscar nombre, habitación o integración",
		manual_none: "Pulse ya vigila todos los dispositivos posibles.",
		manual_no_match: "Ningún dispositivo coincide.",
		manual_loading: "Cargando dispositivos …",
		manual_chip: "Añadido a mano",
		manual_note: "Añadido a mano. Pulse vigila que esté accesible y, si da señales con regularidad, que no se quede en silencio.",
		new_manual_title: "Añade cualquier dispositivo",
		new_manual_text: "Cámaras, altavoces Echo, robots aspiradores o cualquier dispositivo de red: añádelos en Ajustes y Pulse avisará cuando uno deje de estar accesible."
	},
	nl: {
		title: "Pulse",
		subtitle: "Merkt het als een batterijsensor stil wordt – luistert alleen en kost geen batterij.",
		tab_overview: "Overzicht",
		tab_devices: "Apparaten",
		tab_notify: "Meldingen",
		tab_options: "Instellingen",
		options_hl1: "{count} apparaten",
		options_hl1_one: "Eén apparaat",
		options_hl2: "Pulse luistert.",
		options_sub: "Kies wat Pulse in de gaten houdt en wat het daarnaast leest.",
		options_sub_mains: "Daarvan {mains} op netstroom. Kies wat Pulse in de gaten houdt en wat het daarnaast leest.",
		options_watch: "In de gaten houden",
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
		flag_gone: "Al {span} onbereikbaar",
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
		dh_unavailable_for: "Al {span} onbereikbaar.",
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
		new_mains_text: "Pulse let nu ook op lampen, stekkers en schakelaars op netstroom, uit elke integratie. Apparaten die vaak uit staan leert Pulse kennen. Uitzetten onder Instellingen.",
		new_layout_title: "Overzichtelijker",
		new_layout_text: "Ruimtes vallen op in de lijsten en Instellingen heeft een eigen tabblad: apparaten op netstroom en Zigbee2MQTT staan nu daar, Meldingen gaat alleen nog over meldingen.",
		new_texts_title: "Je eigen woorden",
		new_texts_text: "Pas de titel en tekst van elke melding aan, met placeholders en een voorbeeld.",
		new_labels_title: "Labels in plaats van klikken",
		new_labels_text: "Het HA-label pulse_important of pulse_ignore op een apparaat is genoeg. Meldingen noemen nu de ruimte.",
		new_languages_title: "Vijf talen",
		new_languages_text: "Pulse spreekt Engels, Duits, Frans, Spaans en Nederlands.",
		manual_title: "Met de hand toegevoegd",
		manual_add: "Apparaat toevoegen",
		manual_hint: "Camera’s, speakers, robotstofzuigers of elk ander apparaat dat Pulse niet vanzelf bewaakt. Pulse meldt wanneer er een niet meer bereikbaar is; of het speelt, wacht of uit staat telt niet. Werkt ook als het bewaken van apparaten op netstroom uit staat.",
		manual_remove: "{name} verwijderen",
		manual_added: "{name} wordt nu bewaakt.",
		manual_removed: "{name} wordt niet meer bewaakt.",
		manual_search: "Zoek naam, ruimte of integratie",
		manual_none: "Pulse bewaakt al elk apparaat dat het kan.",
		manual_no_match: "Geen apparaat gevonden.",
		manual_loading: "Apparaten laden …",
		manual_chip: "Met de hand toegevoegd",
		manual_note: "Met de hand toegevoegd. Pulse let erop of het bereikbaar is en, als het zich regelmatig meldt, of het stil wordt.",
		new_manual_title: "Elk apparaat toevoegen",
		new_manual_text: "Camera’s, Echo-speakers, robotstofzuigers of elk netwerkapparaat: voeg ze toe onder Instellingen, dan meldt Pulse wanneer er een niet meer bereikbaar is."
	}
};
function N(e, t, n = {}) {
	return (Xe[e.slice(0, 2).toLowerCase()] ?? Ye)[t].replace(/\{(\w+)\}/g, (e, t) => t in n ? String(n[t]) : e);
}
//#endregion
//#region src/logic.ts
function P(e) {
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
var F = {
	ok: 0,
	learning: 0,
	watch: 1,
	check: 2,
	failed: 3
};
function I(e) {
	return e === "failed" ? "crit" : e === "check" || e === "watch" ? "warn" : e === "learning" ? "muted" : "ok";
}
function L(e) {
	return e.ignored || R(e) ? "muted" : I(e.status);
}
function R(e) {
	return !e.ignored && e.reason_key === "cloud_outage";
}
function Ze(e) {
	return {
		ok: "status_ok",
		learning: "status_learning",
		watch: "status_watch",
		check: "status_check",
		failed: "status_failed"
	}[e];
}
function z(e) {
	return e.filter((e) => !e.ignored);
}
function Qe(e) {
	return z(e).filter((e) => F[e.status] >= 2 && !R(e)).sort((e, t) => F[t.status] - F[e.status] || e.name.localeCompare(t.name));
}
function $e(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of z(e)) {
		let e = r.area ?? t, i = n.get(e) ?? [];
		i.push(r), n.set(e, i);
	}
	return [...n.entries()].sort(([e], [n]) => e === t ? 1 : n === t ? -1 : e.localeCompare(n)).map(([e, t]) => ({
		area: e,
		devices: t.sort((e, t) => e.name.localeCompare(t.name))
	}));
}
function et(e, t, n) {
	if (t === null) return N(e, "unknown");
	let r = Math.max(0, n - t);
	if (r < 60) return N(e, "just_now");
	if (r < 3600) return N(e, "minutes_ago", { n: Math.round(r / 60) });
	if (r < 86400) return N(e, "hours_ago", { n: Math.round(r / 3600) });
	let i = Math.round(r / 86400);
	return i === 1 ? N(e, "day_ago") : N(e, "days_ago", { n: i });
}
function tt(e, t) {
	return t === null ? N(e, "unknown") : t < 3600 ? N(e, "every_minutes", { n: Math.max(1, Math.round(t / 60)) }) : t < 172800 ? N(e, "every_hours", { n: Math.round(t / 3600) }) : N(e, "every_days", { n: Math.round(t / 86400) });
}
function nt(e) {
	let t = e.filter((e) => e !== null && e > 0).sort((e, t) => e - t);
	if (!t.length) return e.map((e) => e === null ? null : 0);
	let n = t[Math.min(t.length - 1, Math.floor(t.length * .9))] ?? 1;
	return e.map((e) => e === null ? null : Math.min(1, e / n));
}
var rt = /* @__PURE__ */ new Map();
function it(e) {
	let t = e ?? "", n = rt.get(t);
	if (n) return n;
	let r = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		hourCycle: "h23",
		...B(e)
	});
	return rt.set(t, r), r;
}
var at = /* @__PURE__ */ new Map();
function ot(e) {
	if (!e) return;
	let t = at.get(e);
	if (t === void 0) {
		try {
			new Intl.DateTimeFormat("en-US", { timeZone: e }), t = !0;
		} catch {
			t = !1;
		}
		at.set(e, t);
	}
	return t ? e : void 0;
}
function B(e) {
	let t = ot(e);
	return t ? { timeZone: t } : {};
}
function st(e, t) {
	let n = {
		year: 1970,
		month: 1,
		day: 1,
		hour: 0,
		minute: 0
	};
	for (let r of it(t).formatToParts(/* @__PURE__ */ new Date(e * 1e3))) {
		let e = Number(r.value);
		r.type === "year" ? n.year = e : r.type === "month" ? n.month = e : r.type === "day" ? n.day = e : r.type === "hour" ? n.hour = e % 24 : r.type === "minute" && (n.minute = e);
	}
	return n;
}
function V(e, t) {
	let n = st(e, t);
	return Date.UTC(n.year, n.month - 1, n.day) / 864e5;
}
function ct(e, t) {
	let n = st(e, t);
	return n.hour + n.minute / 60;
}
function lt(e) {
	return ut(e.day_starts, e.strip_start, e.strip_days);
}
function ut(e, t, n) {
	return Array.isArray(e) && e.length === n + 1 && e.every((t, n) => typeof t == "number" && (n === 0 || t > e[n - 1])) ? e.filter((e) => typeof e == "number") : Array.from({ length: n + 1 }, (e, n) => t + n * 86400);
}
function dt(e, t, n) {
	let r = new Intl.DateTimeFormat(e, {
		weekday: "short",
		...B(n)
	}), i = Math.max(0, t.length - 1);
	return Array.from({ length: i }, (n, a) => a === i - 1 ? N(e, "today") : r.format(/* @__PURE__ */ new Date(((t[a] ?? 0) + (t[a + 1] ?? 0)) / 2 * 1e3)));
}
function ft(e) {
	return `repeat(${Math.max(1, e.length - 1)}, minmax(0, 1fr))`;
}
function pt(e, t) {
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
function mt(e, t) {
	let n = t.length - 1, r = t[0];
	if (n <= 0 || r === void 0 || e <= r) return 0;
	for (let r = 0; r < n; r++) {
		let i = t[r] ?? 0, a = t[r + 1] ?? i;
		if (e < a) return (r + (e - i) / (a - i)) / n;
	}
	return 1;
}
function ht(e, t, n, r) {
	let i = t - e;
	if (i <= 0) return [];
	let a = /* @__PURE__ */ new Map();
	for (let o = e; o < t; o += 3600) {
		let t = Math.round(ct(o, r));
		n.includes(t) && !a.has(t) && a.set(t, (o - e) / i);
	}
	return n.flatMap((e) => {
		let t = a.get(e);
		return t === void 0 ? [] : [t];
	});
}
function gt(e, t, n) {
	return new Intl.DateTimeFormat(e, {
		day: "numeric",
		month: "long",
		year: "numeric",
		...B(n)
	}).format(/* @__PURE__ */ new Date(t * 1e3));
}
function _t(e) {
	if (e === "12" || e === "am_pm") return "12";
	if (e === "24") return "24";
}
function vt(e, t, n, r, i) {
	let a = Math.abs(V(n, r) - V(t, r)), o = a === 0 ? {} : a < 6 ? { weekday: "short" } : {
		day: "2-digit",
		month: "2-digit"
	}, s = i ? { hourCycle: i === "12" ? "h12" : "h23" } : {};
	return new Intl.DateTimeFormat(e, {
		...o,
		hour: "numeric",
		minute: "2-digit",
		...s,
		...B(r)
	}).format(/* @__PURE__ */ new Date(t * 1e3));
}
function yt(e, t) {
	return Math.abs(t) >= 1e3 ? N(e, "unit_volt", { value: new Intl.NumberFormat(e, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(t / 1e3) }) : N(e, "unit_millivolt", { value: Math.round(t) });
}
function bt(e) {
	let t = e.trim();
	return !t || t.includes("#") || t.includes("+") || t.startsWith("/") || t.endsWith("/") ? null : t;
}
function xt(e, t) {
	return z(e).filter((e) => e.id !== t.id).sort((e, t) => e.name.localeCompare(t.name));
}
function St(e, t) {
	let n = t.trim().toLowerCase();
	return n ? e.filter((e) => [
		e.name,
		e.area,
		e.manufacturer,
		e.model
	].some((e) => e?.toLowerCase().includes(n))) : e;
}
var Ct = [
	"failed",
	"check",
	"watch",
	"learning",
	"ok"
];
function wt(e, t, n, r) {
	return t === "none" ? [{
		area: "",
		devices: [...e].sort((e, t) => e.name.localeCompare(t.name))
	}] : t === "area" ? $e(e, r) : Ct.map((t) => ({
		area: N(n, Ze(t)),
		devices: z(e).filter((e) => e.status === t).sort((e, t) => e.name.localeCompare(t.name))
	})).filter((e) => e.devices.length > 0);
}
function Tt(e) {
	let t = [];
	for (let e = 0; e < 1440; e += 30) t.push(`${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`);
	return e && !t.includes(e) && t.push(e), t.sort();
}
function Et(e) {
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
function Dt(e, t) {
	return e > 120 || e > 24 && t > .5;
}
function Ot(e, t = []) {
	return z(e).filter((e) => t.includes(e.id) || e.battery.flag && e.battery.low || F[e.status] >= 1 && (e.reason_key ?? "").startsWith("battery")).sort((e, t) => e.name.localeCompare(t.name));
}
function kt(e, t, n = []) {
	return t === null ? e : t === "ignored" ? e.filter((e) => e.ignored) : t === "important" ? z(e).filter((e) => e.critical) : t === "battery" ? Ot(e, n) : t === "mains" ? z(e).filter((e) => e.mains && !e.manual) : z(e).filter((e) => e.status === t);
}
function At(e) {
	return z(e).filter((e) => e.critical).length;
}
function jt(e, t, n, r) {
	let i = V(n, r) - V(t, r);
	if (i === 0) return N(e, "today_cap");
	if (i === 1) return N(e, "yesterday_cap");
	let a = st(t, r).year === st(n, r).year;
	return new Intl.DateTimeFormat(e, {
		day: "numeric",
		month: "short",
		...a ? {} : { year: "numeric" },
		...B(r)
	}).format(/* @__PURE__ */ new Date(t * 1e3));
}
function Mt(e) {
	return !e.ignored && F[e.status] >= 2;
}
var Nt = /* @__PURE__ */ new Set(["battery_low", "battery_low_flag"]);
function Pt(e) {
	let t = e.battery, n = t.flag && t.low || t.trusted && t.level !== null && t.level <= 20;
	return Nt.has(e.reason_key ?? "") || n;
}
function Ft(e, t) {
	return t === e.critical_auto ? null : t;
}
function It(e, t) {
	return t.length ? {
		label: N(e, t.length === 1 ? "battery_low_one" : "battery_low_many", { count: t.length }),
		value: t.join(", "),
		tone: "warn"
	} : {
		label: N(e, "battery_none_low"),
		value: "",
		tone: "ok"
	};
}
function Lt(e) {
	return e?.is_admin === !0;
}
function Rt(e) {
	return e.silence_from === void 0 ? e.last_activity : e.silence_from;
}
function zt(e) {
	return typeof e.silence_start == "number" ? e.silence_start : Rt(e);
}
function Bt(e) {
	return e.ignored || F[e.status] < 1 || e.reason_key !== "unavailable" && e.reason_key !== "unavailable_usual" ? null : typeof e.unavailable_since == "number" ? e.unavailable_since : null;
}
function Vt(e, t, n, r, i) {
	let a = Bt(t);
	return a === null ? U(t) && t.last_activity !== null ? vt(e, t.last_activity, n, r, i) : et(e, t.last_activity, n) : vt(e, a, n, r, i);
}
function Ht(e) {
	return typeof e.strays == "number" && e.strays > 0 ? e.strays : 0;
}
function Ut(e) {
	return !e.ignored && e.reason_key === "waiting_first";
}
var Wt = /* @__PURE__ */ new Set([
	"silent",
	"silent_new",
	"unavailable",
	"unavailable_usual",
	"partner",
	"radio_only"
]), Gt = /* @__PURE__ */ new Set(["silent", "silent_new"]);
function H(e, t) {
	let n = Math.max(0, t);
	if (Math.round(n / 60) < 60) return N(e, "span_minutes", { n: Math.max(1, Math.round(n / 60)) });
	if (Math.round(n / 3600) < 48) {
		let t = Math.round(n / 3600);
		return t <= 1 ? N(e, "span_hour") : N(e, "span_hours", { n: t });
	}
	let r = Math.round(n / 86400);
	return r <= 1 ? N(e, "span_day") : N(e, "span_days", { n: r });
}
function Kt(e, t, n, r) {
	let i = V(n, r) - V(t, r);
	return i === 1 ? N(e, "yesterday") : i >= 2 && i <= 6 ? new Intl.DateTimeFormat(e, {
		weekday: "long",
		...B(r)
	}).format(/* @__PURE__ */ new Date(t * 1e3)) : null;
}
function U(e) {
	return !e.ignored && F[e.status] >= 1 && zt(e) !== null && Gt.has(e.reason_key ?? "");
}
function qt(e) {
	return F[e.status] >= 1 && Wt.has(e.reason_key ?? "");
}
function W(e, t, n, r = "") {
	return {
		line1: e,
		line1Short: e,
		line2: t,
		line2Short: t,
		tone: n,
		sub: r
	};
}
function Jt(e, t) {
	let n = z(t), r = n.filter((e) => e.status !== "learning");
	if (!n.length) return W(N(e, "hero_none1"), N(e, "hero_none2"), "accent");
	if (!r.length) return W(N(e, "hero_learn1"), N(e, "hero_learn2"), "accent");
	let i = r.filter(qt).length, a = r.length - i, o = Qe(r), s = o.some((e) => e.status === "failed") ? "crit" : "warn";
	if (r.length === 1) {
		let t = N(e, "hero_one");
		return o.length ? W(t, N(e, "hero_need_one"), s) : W(t, N(e, i ? "hero_beat_off" : "hero_beat_one"), i ? "plain" : "accent");
	}
	let c = N(e, "hero_sub", {
		ok: a,
		total: r.length
	});
	if (o.length) {
		let t = o.length === 1;
		return W(t ? N(e, "hero_need1_one") : N(e, "hero_need1", { count: o.length }), N(e, t ? "hero_need_one" : "hero_need"), s, c);
	}
	let l = N(e, "hero_beat"), u = N(e, "hero_beat_short");
	if (!i) {
		let t = N(e, "hero_all", { count: r.length });
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
		line1: N(e, "hero_some", {
			ok: a,
			total: r.length
		}),
		line1Short: N(e, "hero_some_short", {
			ok: a,
			total: r.length
		}),
		line2: l,
		line2Short: u,
		tone: "plain",
		sub: ""
	};
}
var Yt = "\0";
function G(e, t, n, r) {
	let [i = "", a = ""] = N(e, t, {
		...r,
		name: Yt
	}).split(Yt);
	return {
		before: i,
		name: n.name,
		after: a,
		tone: I(n.status)
	};
}
function Xt(e, t, n, r) {
	let i = z(t).filter((e) => F[e.status] >= 1 && !R(e)).sort((e, t) => F[t.status] - F[e.status] || e.name.localeCompare(t.name)), a = z(t), o = a.filter((e) => e.status === "learning").length, s = o ? Zt(e, o) : "";
	if (!i.length) return {
		mentions: [],
		more: 0,
		text: o > 0 && o === a.length ? N(e, "sent_learning") : [o < a.length ? N(e, "sent_all_good") : "", s].filter(Boolean).join(" ")
	};
	let c = i.slice(0, 2).map((t) => {
		let i = t.reason_key ?? "", a = zt(t);
		if (Gt.has(i) && a !== null && Ht(t) > 0) {
			let i = Kt(e, a, n, r), o = et(e, t.last_activity, n).replace(/\.$/, "");
			return i ? G(e, "sent_strays_since", t, {
				day: i,
				last: o
			}) : G(e, "sent_strays_for", t, {
				span: H(e, n - a),
				last: o
			});
		}
		if (Gt.has(i) && a !== null) {
			let i = Kt(e, a, n, r);
			return i ? G(e, "sent_silent_since", t, { day: i }) : G(e, "sent_silent_for", t, { span: H(e, n - a) });
		}
		return i === "waiting_first" ? G(e, "sent_waiting", t, {}) : i === "battery_low" ? G(e, "sent_battery_low", t, {}) : i === "battery_soon" ? G(e, "sent_battery", t, {}) : i === "unavailable" || i === "unavailable_usual" ? G(e, "sent_unavailable", t, {}) : i === "startup_waiting" ? G(e, "sent_startup", t, {}) : i === "radio_only" ? G(e, "sent_radio_only", t, {}) : i === "battery_missing" ? G(e, "sent_battery_missing", t, {}) : i === "partner" ? G(e, "sent_partner", t, { partner: t.partner_name ?? "" }) : G(e, "sent_other", t, { reason: t.reason });
	}), l = i.length - c.length;
	return {
		mentions: c,
		more: l,
		text: [l ? N(e, "sent_more", { count: l }) : "", s].filter(Boolean).join(" ")
	};
}
function Zt(e, t) {
	return t === 1 ? N(e, "learning_one") : N(e, "learning_many", { count: t });
}
var Qt = {
	need: "group_need",
	watch: "group_watch",
	rhythm: "group_rhythm",
	learning: "group_learning"
};
function $t(e) {
	return Qt[e];
}
function en(e) {
	let t = z(e), n = (e, t) => e.name.localeCompare(t.name);
	return [
		{
			key: "need",
			devices: Qe(t)
		},
		{
			key: "watch",
			devices: t.filter((e) => e.status === "watch" || R(e)).sort(n)
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
function tn(e, t, n) {
	let r = Bt(t);
	if (r !== null) return N(e, "flag_gone", { span: H(e, n - r) });
	let i = zt(t);
	return !U(t) || i === null ? null : N(e, Ht(t) ? "flag_strays" : "flag_silent", { span: H(e, n - i) });
}
function nn(e, t, n) {
	return t.ignored ? "" : tn(e, t, n) || (Ut(t) ? N(e, "pill_waiting") : t.status === "learning" ? N(e, "pill_learning") : "");
}
function rn(e, t, n) {
	if (t.ignored) return {
		text: N(e, "ignored"),
		tone: "muted"
	};
	if (R(t)) return {
		text: N(e, "status_cloud"),
		tone: "muted"
	};
	if (Ut(t)) return {
		text: N(e, "status_waiting"),
		tone: "warn"
	};
	let r = t.battery.level;
	if (t.status === "watch" && t.reason_key?.startsWith("battery") && r !== null) return {
		text: N(e, "status_battery", { level: Math.round(r) }),
		tone: "warn"
	};
	if (F[t.status] >= 1) return {
		text: N(e, Ze(t.status)),
		tone: I(t.status)
	};
	if (t.status === "learning") return {
		text: N(e, "status_learning"),
		tone: "muted"
	};
	let i = t.battery.replaced.at(-1);
	return i !== void 0 && n - i < 172800 ? {
		text: N(e, "new_battery"),
		tone: "ok"
	} : null;
}
function an(e, t) {
	if (t <= 0 || e.length <= t) return e;
	let n = Math.ceil(e.length / t), r = [];
	for (let t = 0; t < e.length; t += n) {
		let i = e.slice(t, t + n);
		r.push(i.every((e) => e === null) ? null : i.reduce((e, t) => e + (t ?? 0), 0));
	}
	return r;
}
function on(e) {
	let [t = "0", n = "0"] = e.split(":");
	return Number(t) + Number(n) / 60;
}
function sn(e, t) {
	let n = on(e), r = on(t);
	return n === r ? [] : n < r ? [[n, r]] : [[0, r], [n, 24]];
}
function cn(e, t, n) {
	if (t.ignored) return {
		text: N(e, "dh_ignored"),
		tone: "muted"
	};
	let r = t.reason_key ?? "", i = zt(t);
	if (U(t) && i !== null) return {
		text: F[t.status] >= 2 ? N(e, Ht(t) ? "dh_strays" : "dh_silent", { span: H(e, n - i) }) : N(e, "dh_watch"),
		tone: I(t.status)
	};
	if (R(t)) return {
		text: N(e, "dh_cloud"),
		tone: "muted"
	};
	if (Ut(t)) return {
		text: N(e, "dh_waiting"),
		tone: "warn"
	};
	if (r === "startup_waiting") return {
		text: N(e, "dh_startup"),
		tone: "warn"
	};
	if (r === "radio_only") return {
		text: N(e, "dh_radio_only"),
		tone: I(t.status)
	};
	if (r === "battery_missing") return {
		text: N(e, "dh_battery_missing"),
		tone: I(t.status)
	};
	if (r === "unavailable" || r === "unavailable_usual") {
		let r = Bt(t);
		return {
			text: r === null ? N(e, "dh_unavailable") : N(e, "dh_unavailable_for", { span: H(e, n - r) }),
			tone: I(t.status)
		};
	}
	return r === "partner" ? {
		text: N(e, "dh_partner"),
		tone: I(t.status)
	} : r.startsWith("battery") && t.battery.level !== null ? {
		text: N(e, "dh_battery", { level: Math.round(t.battery.level) }),
		tone: I(t.status)
	} : t.status === "learning" ? {
		text: N(e, "dh_learning"),
		tone: "muted"
	} : {
		text: N(e, "dh_ok"),
		tone: "accent"
	};
}
function ln(e, t, n, r, i) {
	return U(t) && t.typical !== null && t.last_activity !== null ? N(e, "detail_every", {
		every: tt(e, t.typical).replace(/\.$/, ""),
		when: vt(e, t.last_activity, n, r, i)
	}) : t.status === "learning" && !t.ignored ? N(e, "learning_hint") : t.reason;
}
function un(e, t, n) {
	return U(t) && !qt(n) ? N(e, "partner_quiet", {
		partner: n.name,
		name: t.name
	}) : !qt(t) && !qt(n) ? N(e, "partner_both") : "";
}
function dn(e) {
	return Array.isArray(e) && e.length === 2 && typeof e[0] == "number" && typeof e[1] == "number";
}
function fn(e) {
	return Array.isArray(e) ? e.filter(dn) : [];
}
function pn(e, t) {
	return t.length < 2 ? [] : e.map(([e, n]) => [mt(e, t), mt(n, t)]).filter(([e, t]) => t > e);
}
function mn(e) {
	return Array.isArray(e) && e.every((e) => e === null || typeof e == "number");
}
function hn(e) {
	return Array.isArray(e) && e.every(mn);
}
function gn(e) {
	if (typeof e != "object" || !e) return null;
	let t = Reflect.get(e, "start"), n = Reflect.get(e, "days"), r = Reflect.get(e, "bin_minutes"), i = Reflect.get(e, "devices");
	if (typeof t != "number" || typeof n != "number" || typeof r != "number" || r <= 0 || typeof i != "object" || !i) return null;
	let a = {};
	for (let [e, t] of Object.entries(i)) hn(t) && (a[e] = t);
	return {
		start: t,
		days: n,
		binMinutes: r,
		dayStarts: ut(Reflect.get(e, "day_starts"), t, n),
		devices: a,
		noData: fn(Reflect.get(e, "no_data"))
	};
}
function _n(e, t, n) {
	let r = n * 60, i = [];
	return t <= 0 || e.forEach((e, n) => {
		e && i.push({
			at: (n + .5) * r / t,
			count: e
		});
	}), i;
}
function vn(e) {
	return e >= 3 ? 22 : e === 2 ? 18 : 12;
}
var yn = 2;
function bn(e, t) {
	let n = Bt(e);
	if (n !== null && t.length >= 2) {
		let e = pt(n, t);
		return e < 0 ? 0 : e + 1;
	}
	let r = Rt(e);
	if (!U(e) || r === null || t.length < 2) return -1;
	if (typeof e.silence_start == "number") {
		let n = pt(e.silence_start, t);
		return n < 0 ? 0 : n + 1;
	}
	let i = t.length - 1, a = ((t[i] ?? 0) - (t[0] ?? 0)) / (i * 12), o = pt(r, t);
	if (o < 0) return 0;
	let s = [];
	e.strip.forEach((e, t) => {
		e && t <= o && s.push(t);
	});
	let c = Math.max(3, Math.ceil(3 * (e.typical ?? 0) / a));
	for (let e = s.length - 2; e >= 0 && s.length - 1 - e <= yn; e--) {
		let t = s[e], n = s[e + 1];
		if (t === void 0 || n === void 0) break;
		if (n - t - 1 >= c) return t + 1;
	}
	return o + 1;
}
function xn(e, t, n, r) {
	let i = Rt(e);
	if (!U(e) || i === null) return -1;
	let a = r * 60, o = -1;
	return t.forEach((e, t) => {
		let r = n[t], i = n[t + 1];
		r !== void 0 && i !== void 0 && e.forEach((e, t) => {
			e && (o = Math.max(o, Math.min(i, r + (t + 1) * a)));
		});
	}), Math.max(i, o);
}
var Sn = {
	now: "set_level_now",
	daily: "set_level_daily",
	off: "set_level_off"
};
function Cn(e, t) {
	let n = t.quiet;
	return [N(e, "day_line_summary", { time: t.summary_time }), n.enabled ? N(e, "day_line_quiet", {
		start: n.start,
		end: n.end
	}) : N(e, "day_line_no_quiet")].join(" · ");
}
function wn(e) {
	let t = Reflect.get(e.arrive_home, "persons");
	if (Array.isArray(t)) return t.filter((e) => typeof e == "string");
	let n = Reflect.get(e.arrive_home, "person");
	return typeof n == "string" ? [n] : [];
}
function Tn(e, t) {
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
		i.set(a, [...i.get(a) ?? [], N(e, r[n])]);
	}
	let a = new Intl.ListFormat(e, { type: "conjunction" }), o = [...i].map(([t, n]) => N(e, "set_group", {
		names: a.format(n),
		level: N(e, Sn[t])
	})).join(", "), s = `${o.charAt(0).toUpperCase()}${o.slice(1)}.`;
	return {
		line1: N(e, "set_head", { time: t.summary_time }),
		line2: n.enabled ? N(e, "set_quiet", {
			start: n.start,
			end: n.end
		}) : N(e, "set_no_quiet"),
		sub: s
	};
}
function En(e, t, n) {
	let r = t > e ? [[e, t]] : [];
	for (let [e, t] of n) r = r.flatMap(([n, r]) => {
		if (t <= n || e >= r) return [[n, r]];
		let i = [];
		return e > n && i.push([n, e]), t < r && i.push([t, r]), i;
	});
	return r;
}
var Dn = {
	too_short: "forecast_too_short",
	flat: "forecast_flat",
	coarse: "forecast_coarse",
	untrusted: "forecast_untrusted",
	noisy: "forecast_noisy"
};
function On(e, t, n) {
	if (!t) return n && n in Dn ? N(e, Dn[n]) : "";
	let r = Math.max(0, Math.min(t.days_min, t.days_max)), i = Math.max(t.days_min, t.days_max);
	if (i <= 10) return N(e, "forecast_days");
	let a = (e) => {
		let t = Math.max(1, Math.floor(r / e));
		return {
			lo: t,
			hi: Math.max(t + 1, Math.ceil(i / e))
		};
	};
	return i <= 70 ? N(e, "forecast_weeks", a(7)) : i <= 540 ? N(e, "forecast_months", a(30.44)) : N(e, "forecast_years", a(365.25));
}
function kn(e, t) {
	if (!t?.length) return "";
	let n = /* @__PURE__ */ new Map(), r = [];
	for (let e of t) e.type ? n.set(e.type, (n.get(e.type) ?? 0) + Math.max(1, e.count ?? 1)) : r.push(e.name);
	let i = [...n.entries()].sort(([e, t], [n, r]) => r - t || e.localeCompare(n)).map(([t, n]) => N(e, "battery_count_type", {
		count: n,
		type: t
	}));
	return r.length && i.push(N(e, "due_untyped", { names: r.join(", ") })), N(e, "due_line", { items: i.join(", ") });
}
function An(e) {
	let t = e.replaceAll("_", " ").trim();
	return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}` : e;
}
function jn(e, t) {
	return (t ?? []).filter((e) => e.count > 0).map((t) => N(e, t.count === 1 ? "cloud_outage_one" : "cloud_outage_many", {
		name: An(t.integration),
		count: t.count
	}));
}
function Mn(e) {
	return e.partner || e.ignored ? [] : (e.partner_suggestions ?? []).slice(0, 1);
}
var Nn = 2e3, Pn = 6e4;
function Fn(e) {
	return Math.min(Math.max(e, Nn) * 2, Pn);
}
var In = " · ";
function Ln(e, t, n) {
	return e.replace(/\{(\w+)\}/g, (e, r) => n.includes(r) ? t[r] ?? "" : e).split("\n").map((e) => e.split(In).filter((e) => e.trim()).join(In)).join("\n").trim();
}
function Rn(e) {
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
function K(e) {
	return typeof e == "string" && e !== "" ? e : null;
}
function zn(e) {
	if (typeof e != "object" || !e) return [];
	let t = Reflect.get(e, "devices");
	if (!Array.isArray(t)) return [];
	let n = [];
	for (let e of t) {
		if (typeof e != "object" || !e) continue;
		let t = Reflect.get(e, "id"), r = Reflect.get(e, "name");
		if (typeof t != "string" || typeof r != "string") continue;
		let i = K(Reflect.get(e, "integration")) ?? "";
		n.push({
			id: t,
			name: r,
			area: K(Reflect.get(e, "area")),
			manufacturer: K(Reflect.get(e, "manufacturer")),
			model: K(Reflect.get(e, "model")),
			integration: i,
			integration_name: K(Reflect.get(e, "integration_name")) ?? i,
			icon: K(Reflect.get(e, "icon")) ?? "mdi:devices"
		});
	}
	return n;
}
function Bn(e, t) {
	let n = t.toLocaleLowerCase().split(/\s+/).filter(Boolean);
	return n.length ? e.filter((e) => {
		let t = [
			e.name,
			e.area,
			e.integration_name,
			e.integration,
			e.manufacturer,
			e.model
		].filter(Boolean).join(" ").toLocaleLowerCase();
		return n.every((e) => t.includes(e));
	}) : e;
}
function Vn(e) {
	return [e.area, e.integration_name ?? An(e.integration)].filter(Boolean).join(" · ");
}
function Hn(e) {
	return e.filter((e) => e.manual).sort((e, t) => e.name.localeCompare(t.name));
}
//#endregion
//#region src/styles.ts
var q = o`
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
`, J = o`
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
`, Y = o`
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
`, Un = o`
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
    flex: 1;
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
  /* Raum rechtsbündig an der Leiste; lange Raumnamen zweizeilig statt abgeschnitten */
  .room {
    flex: 0 100 auto;
    margin-left: auto;
    text-align: end;
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
      margin-left: 0;
      text-align: start;
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
`, Wn = [
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
], Gn = [{
	icon: "mdi:plus-circle-outline",
	title: "new_manual_title",
	text: "new_manual_text"
}, {
	icon: "mdi:power-plug-outline",
	title: "new_mains_title",
	text: "new_mains_text"
}], Kn = "https://github.com/SH1FT-W/pulse/blob/main/CHANGELOG.md";
M("pulse-welcome", class extends A {
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
		return w`<div
      class=${t ? "zig" : "zig tappable"}
      role=${t ? D : "switch"}
      aria-checked=${t ? D : "false"}
      tabindex=${t ? D : "0"}
      @click=${n}
      @keydown=${(e) => {
			(e.key === "Enter" || e.key === " ") && (e.preventDefault(), n());
		}}
    >
      <span><b>${N(e, "welcome_zigbee_title")}</b><small>${N(e, "welcome_zigbee_text")}</small></span>
      ${t ? w`<span class="on"><ha-icon icon="mdi:check-circle"></ha-icon>${N(e, "zigbee_active")}</span>` : w`<ha-switch tabindex="-1" aria-hidden="true"></ha-switch>`}
    </div>`;
	}
	renderEcg() {
		return w`<svg class="ecg" viewBox="0 0 390 160" aria-hidden="true">
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
		].map((e, t) => T`<rect x=${166 + t * 9.4} y=${80 - e / 2} width="4.6" height=${e} rx="2.3" fill="url(#pulse-wl)" opacity=${(1 - t / 34).toFixed(2)}></rect>`)}
      <circle class="end" cx="150" cy="80" r="6"></circle>
    </svg>`;
	}
	render() {
		if (!this.mode) return D;
		let e = this.language, t = this.mode === "welcome", n = t ? Wn : Gn;
		return w`<ha-dialog open @closed=${() => this.close()}>
      <div class="sheet">
        <div class="glow" aria-hidden="true"></div>
        ${this.renderEcg()}
        ${t ? w`<h2>${N(e, "welcome_head1")}<br /><span class="grad">${N(e, "welcome_head2")}</span></h2>
                <p class="lead">${N(e, "welcome_lead")}</p>` : w`<h2 class="news">${N(e, "whats_new_title", { version: this.version })}</h2>`}
        <ol>
          ${n.map((t, n) => w`<li>
              <em class="mono">${String(n + 1).padStart(2, "0")}</em>
              <span><b>${N(e, t.title)}.</b> ${N(e, t.text)}</span>
            </li>`)}
        </ol>
      </div>
      <!-- Fixed footer: switch and "Weiter" (continue) always stay visible, the text above scrolls -->
      <div slot="footer" class="foot">
        ${t && this.zigbee !== "none" ? this.renderZigbee() : D}
        <button class="go" type="button" @click=${() => this.close()}>${N(e, "continue")}</button>
        ${t ? D : w`<a class="all" href=${Kn} target="_blank" rel="noreferrer">${N(e, "whats_new_all")}</a>`}
      </div>
    </ha-dialog>`;
	}
	static {
		this.styles = [
			q,
			Y,
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
var qn = "pulse.seenVersion", Jn = "", Yn = "pulse.welcome";
function Xn(e, t, n = !0) {
	let r = e.getItem(qn);
	return r === t ? null : r === Jn ? "welcome" : r !== null || e.getItem(Yn) !== null ? n ? "whatsNew" : (Zn(e, t), null) : (e.setItem(qn, Jn), "welcome");
}
function Zn(e, t) {
	e.setItem(qn, t);
}
//#endregion
//#region src/pulse-sheet.ts
var Qn = "(pointer: coarse), (max-width: 600px)", $n = 6, X = 0, er = "";
function tr(e) {
	let t = document.documentElement;
	e ? (X === 0 && (er = t.style.overflow, t.style.overflow = "hidden"), X += 1) : X > 0 && (--X, X === 0 && (t.style.overflow = er));
}
M("pulse-sheet", class extends A {
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
		e !== this.locked && (this.locked = e, tr(e));
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
		return window.matchMedia(Qn).matches;
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
			if (Math.abs(r) < $n) return;
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
		n.style.transition = "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)", Dt(t.dy, r) ? (n.style.transform = "translateY(100%)", window.setTimeout(() => n.close(), 220)) : n.style.transform = "";
	}
	render() {
		return w`<dialog
      tabindex="-1"
      autofocus
      aria-label=${this.heading || D}
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
            ${this.noClose ? D : w`<ha-icon-button .label=${N(this.language, "close")} @click=${() => this.dialog?.close()}>
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
		this.styles = [q, o`
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
}), M("pulse-add-sheet", class extends A {
	static {
		this.properties = {
			open: { type: Boolean },
			language: { type: String },
			candidates: { attribute: !1 },
			query: { state: !0 }
		};
	}
	constructor() {
		super(), this.open = !1, this.language = "en", this.candidates = null, this.query = "";
	}
	willUpdate(e) {
		e.has("open") && this.open && (this.query = "");
	}
	add(e) {
		this.dispatchEvent(new CustomEvent("add", { detail: { id: e } }));
	}
	renderList() {
		let e = this.language;
		if (this.candidates === null) return w`<p class="empty muted">${N(e, "manual_loading")}</p>`;
		if (!this.candidates.length) return w`<p class="empty muted">${N(e, "manual_none")}</p>`;
		let t = Bn(this.candidates, this.query);
		return t.length ? w`<div class="list">
      ${t.map((e) => w`<button class="row has-icon" type="button" @click=${() => this.add(e.id)}>
          <ha-icon class="ico" icon=${e.icon}></ha-icon>
          <span class="label">${e.name}<small>${Vn(e)}</small></span>
          <ha-icon class="plus" icon="mdi:plus-circle-outline"></ha-icon>
        </button>`)}
    </div>` : w`<p class="empty muted">${N(e, "manual_no_match")}</p>`;
	}
	render() {
		let e = this.language;
		return w`<pulse-sheet
      .open=${this.open}
      .heading=${N(e, "manual_add")}
      .language=${e}
      @closed=${() => this.dispatchEvent(new CustomEvent("closed"))}
    >
      ${this.candidates?.length ? w`<input
              class="search"
              type="search"
              enterkeyhint="search"
              autocomplete="off"
              spellcheck="false"
              .placeholder=${N(e, "manual_search")}
              aria-label=${N(e, "manual_search")}
              .value=${this.query}
              @input=${(e) => {
			e.target instanceof HTMLInputElement && (this.query = e.target.value);
		}}
            />` : D}
      ${this.renderList()}
    </pulse-sheet>`;
	}
	static {
		this.styles = [
			q,
			J,
			o`
      .search {
        display: block;
        width: 100%;
        min-height: var(--pu-hit);
        margin-bottom: 12px;
        padding: 0 14px;
        box-sizing: border-box;
        border: 1px solid transparent;
        border-radius: 12px;
        background: var(--pu-fill);
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-15);
      }
      .search:focus {
        outline: none;
        border-color: var(--pu-accent);
      }
      .plus {
        flex: none;
        color: var(--pu-accent);
        --mdc-icon-size: 22px;
      }
      .empty {
        margin: 8px 2px;
        font-size: var(--pu-fs-15);
      }
    `
		];
	}
});
//#endregion
//#region src/pulse-heartbeat.ts
var nr = 1e3, rr = 24, ir = [
	3,
	6,
	9,
	12,
	15,
	18,
	21
];
function ar(e) {
	return e.reduce((e, t) => e + t.reduce((e, t) => e + (t ?? 0), 0), 0);
}
M("pulse-heartbeat", class extends A {
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
		Array.isArray(t) && t.length === this.bins.length && ar(this.bins) > ar(t) && (this.beating = !0);
	}
	row(e, t, n) {
		let r = n - t, i = (e) => `${(e / r * 100).toFixed(2)}%`, a = (e) => (e / r * nr).toFixed(1), o = ht(t, n, ir, this.timeZone).map((e) => {
			let t = (e * nr).toFixed(1);
			return T`<line class="grid" x1=${t} x2=${t} y1="3" y2=${21}></line>`;
		}), s = D;
		this.silentSince > 0 && this.silentSince < n && this.now > t && (s = En(Math.max(this.silentSince, t) - t, Math.min(this.now, n) - t, this.noData.map(([e, n]) => [e - t, n - t])).map(([e, t]) => T`<line class="silent" x1=${a(e)} x2=${a(t)} y1=${rr / 2} y2=${rr / 2}></line>`));
		let c = _n(this.bins[e] ?? [], r, this.binMinutes).map((e) => w`<i class="tk" style=${`left: ${(e.at * 100).toFixed(2)}%; height: ${vn(e.count)}px`}></i>`), l = this.noData.map(([e, r]) => [Math.max(e, t), Math.min(r, n)]).filter(([e, t]) => t > e).map(([e, n]) => w`<span class="gap" style=${`left: ${i(e - t)}; width: ${i(n - e)}`}></span>`), u = this.now >= t && this.now < n, d = u ? w`<span
          class=${[
			"now",
			this.silentSince > 0 ? "silent" : "",
			this.beating ? "beat" : ""
		].join(" ")}
          style=${`left: ${i(this.now - t)}`}
          @animationend=${() => {
			this.beating = !1;
		}}
        ></span>` : D, f = new Intl.DateTimeFormat(this.language, {
			weekday: "short",
			...this.timeZone ? { timeZone: this.timeZone } : {}
		}).format(/* @__PURE__ */ new Date((t + n) / 2 * 1e3)).replace(".", "");
		return w`<div class="r">
      <span class=${u ? "mono today" : "mono"}>${f}</span>
      <div class="track">
        ${l}
        <svg viewBox="0 0 ${nr} ${rr}" preserveAspectRatio="none" aria-hidden="true">${o}${s}</svg>
        <div class="ticks">${c}</div>
        ${d}
      </div>
    </div>`;
	}
	render() {
		let e = Math.max(0, this.dayStarts.length - 1), t = ar(this.bins), n = Array.from({ length: e }, (e, t) => this.row(t, this.dayStarts[t] ?? 0, this.dayStarts[t + 1] ?? 0));
		return w`<div class="cal" role="img" aria-label=${N(this.language, "heartbeat_aria", {
			count: t,
			days: e
		})}>
      ${n}
      <div class="x mono" aria-hidden="true"><span></span><div><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div></div>
    </div>`;
	}
	static {
		this.styles = [
			q,
			Y,
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
//#region src/pulse-picker.ts
var or = 12;
M("pulse-picker", class extends A {
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
		return w`<button
      slot=${e ? "trigger" : D}
      class="trigger"
      type="button"
      aria-label=${this.label}
      aria-haspopup=${e ? "menu" : "dialog"}
      @click=${e ? D : () => void this.openSheet()}
    >
      <span>${t?.label ?? this.value}</span>
      <ha-icon icon="mdi:unfold-more-horizontal"></ha-icon>
    </button>`;
	}
	renderSheet() {
		return w`${this.trigger(!1)}
      <pulse-sheet
        .open=${this.sheetOpen}
        .heading=${this.label}
        .language=${this.language}
        @closed=${() => {
			this.sheetOpen = !1;
		}}
      >
        <div class="list" role="radiogroup" aria-label=${this.label}>
          ${this.options.map((e) => w`<button
              class="row choice"
              type="button"
              role="radio"
              aria-checked=${e.value === this.value ? "true" : "false"}
              @click=${() => this.pick(e.value)}
            >
              <span class="label">${e.label}</span>
              ${e.value === this.value ? w`<ha-icon class="check" icon="mdi:check"></ha-icon>` : D}
            </button>`)}
        </div>
      </pulse-sheet>`;
	}
	render() {
		return this.options.length > or ? this.renderSheet() : w`<ha-dropdown placement="bottom-end" @wa-select=${(e) => this.pick(He(e))}>
      ${this.trigger(!0)}
      ${this.options.map((e) => w`<ha-dropdown-item .value=${e.value}>
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
			q,
			J,
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
var sr = 480, Z = 1e3, Q = 26;
function cr(e) {
	return e.reduce((e, t) => e + (t ?? 0), 0);
}
M("pulse-rhythm", class extends A {
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
			let t = e[0]?.contentRect.width ?? 0, n = t > 0 && t < sr;
			n !== this.narrow && (this.narrow = n), Math.abs(t - this.width) >= 8 && (this.width = t);
		}), this.observer.observe(this);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.observer?.disconnect(), this.observer = null;
	}
	willUpdate(e) {
		if (!e.has("buckets")) return;
		let t = e.get("buckets");
		Array.isArray(t) && t.length === this.buckets.length ? cr(this.buckets) > cr(t) && (this.growAt = this.buckets.findLastIndex((e) => (e ?? 0) > 0)) : this.growAt = -1;
	}
	render() {
		let e = this.narrow && this.buckets.length > 48 ? 2 : 1, t = e > 1 ? an(this.buckets, Math.ceil(this.buckets.length / 2)) : this.buckets, n = t.length || 1, r = this.silentFrom >= 0 ? Math.ceil(this.silentFrom / e) : -1, i = nt(t), a = Z / n, o = a * .56, s = i.indexOf(null), c = s < 0 ? n : s, l = this.tone === "warn" || this.tone === "crit", u = this.growAt >= 0 ? Math.floor(this.growAt / e) : -1, d = -1;
		if (l && r >= 0) for (let e = 0; e < Math.min(r, n); e++) (i[e] ?? 0) > 0 && (d = e);
		let f = l && r < 0 && c > 0 ? c - 1 : -1, ee = (e) => {
			let t = (e + .5) / n;
			return this.gaps.some(([e, n]) => t >= e && t <= n);
		}, p = [], m = [];
		if (i.forEach((e, t) => {
			if (e === null || t === f || r >= 0 && t >= r && e === 0 || e === 0 && ee(t)) return;
			let n = (t * a + (a - o) / 2).toFixed(1);
			if (e === 0) {
				p.push(T`<rect class="zero" x=${n} y=${(Q / 2 - 1.5).toFixed(1)} width=${o.toFixed(1)} height="3" rx="1.5"></rect>`);
				return;
			}
			let i = Math.max(4, 6 + e * 20), s = l ? t === d || r >= 0 && t >= r : this.tone === "ok", c = T`<rect class=${[
				l && !s ? "n" : "",
				this.learning ? "dash" : "",
				t === u ? "grow" : ""
			].join(" ")} x=${n} y=${((Q - i) / 2).toFixed(1)} width=${o.toFixed(1)} height=${i.toFixed(1)} rx=${(o / 2).toFixed(1)}></rect>`;
			(s ? m : p).push(c);
		}), f >= 0 && m.push(T`<rect class="mark" x=${(f * a + (a - o) / 2).toFixed(1)} y="1" width=${o.toFixed(1)} height=${24} rx=${(o / 2).toFixed(1)}></rect>`), r >= 0 && r < c) for (let [e, t] of En(r / n, c / n, this.gaps)) m.push(T`<line class="silent" x1=${(e * Z).toFixed(1)} x2=${(t * Z).toFixed(1)} y1=${Q / 2} y2=${Q / 2}></line>`);
		let te = Array.from({ length: Math.max(0, this.days - 1) }, (e, t) => {
			let n = ((t + 1) / this.days * Z).toFixed(1);
			return T`<line class="day" x1=${n} x2=${n} y1="1" y2=${25}></line>`;
		});
		return w`${this.gaps.map(([e, t]) => w`<span class="gap" style=${`left: ${(e * 100).toFixed(2)}%; width: ${((t - e) * 100).toFixed(2)}%`}></span>`)}<svg class="base" viewBox="0 0 ${Z} ${Q}" preserveAspectRatio="none" aria-hidden="true">${te}${p}</svg><svg class="hot" viewBox="0 0 ${Z} ${Q}" preserveAspectRatio="none" aria-hidden="true">${m}</svg>${this.renderFlag(r, c, n, (e) => `${(e / n * 100).toFixed(2)}%`)}`;
	}
	renderFlag(e, t, n, r) {
		return this.flag ? e >= 0 ? (t - e) / n * this.width < 140 ? D : w`<span class="flag-area" style=${`left: max(0px, min(${r(e)}, calc(${r(t)} - 176px))); right: calc(100% - ${r(t)})`}>
        <span class="flag">${this.flag}</span>
      </span>` : this.width < 300 ? D : w`<span class="flag-area at-end" style=${`right: calc(100% - ${r(t)})`}>
      <span class="flag">${this.flag}</span>
    </span>` : D;
	}
	static {
		this.styles = [q, o`
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
var lr = 260;
function ur(e) {
	return I(e.status) === "warn" ? "warn" : "crit";
}
function dr(e) {
	return e.ignored ? "muted" : I(e.status) === "ok" ? "ok" : "neutral";
}
var fr = Array.from({ length: 12 }, (e, t) => ({
	value: String(t + 1),
	label: String(t + 1)
})), pr = {
	nimh: "chem_nimh",
	alkaline: "chem_alkaline",
	lithium: "chem_lithium"
};
M("pulse-device-sheet", class extends A {
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
		super(), this.gapsOf = P(pn), this.beatKey = "", this.onSettingsToggle = (e) => {
			let t = e.currentTarget;
			if (!(t instanceof HTMLDetailsElement) || (this.settingsOpen = t.open, !t.open)) return;
			let n = CSS.supports("interpolate-size", "allow-keywords");
			window.setTimeout(() => t.scrollIntoView({
				block: "nearest",
				behavior: "smooth"
			}), n ? lr : 0);
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
			n = gn(await this.fetchHeartbeat([e]));
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
			return w`<div class="row">
        <span class="label">${e}${i ? w`<small>${i}</small>` : D}</span>
        <span class="value">${r}</span>
      </div>`;
		}
		return w`<div class="row">
      <span class="label">${e}${i ? w`<small>${i}</small>` : D}</span>
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
		return this.readonly || i ? w`<div class="row">
        <span class="label">${e}<small>${i ?? t}</small></span>
        <span class="value">${N(this.language, n ? "on" : "off")}</span>
      </div>` : w`<div
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
		let t = this.language, n = e.battery, r = e.snooze_until !== null && e.snooze_until > this.now, i = n.flag ? N(t, n.low ? "battery_flag_low" : "battery_flag_ok") : n.level === null ? N(t, "unknown") : N(t, "unit_percent", { value: Math.round(n.level) }), a = n.type ? (n.count ?? 1) > 1 ? N(t, "battery_count_type", {
			count: n.count ?? 1,
			type: n.type
		}) : n.type : N(t, "unknown"), o = this.timeZone, s = cn(t, e, this.now), c = e.partner ? this.devices.find((t) => t.id === e.partner) ?? null : null, l = n.replaced.at(-1), u = this.beat, d = u?.devices[e.id] ?? null, f = u?.noData ?? this.noData, ee = this.gapsOf(f, this.dayStarts), p = Math.max(1, this.dayStarts.length - 1), m = (e) => w`<pulse-rhythm .buckets=${e.strip} tone=${L(e)} ?learning=${e.status === "learning" && !e.ignored} .gaps=${ee} .days=${p} .silentFrom=${bn(e, this.dayStarts)}></pulse-rhythm>`, te = c ? un(t, e, c) : "", ne = [e.area, e.model].filter(Boolean).join(" · "), re = On(t, n.forecast, n.forecast_reason === "untrusted" && !n.trusted ? null : n.forecast_reason), h = (n) => w`<button class=${n ? "pbtn primary" : "pbtn"} type="button" @click=${() => this.fire("replaced", { id: e.id })}>
        <ha-icon icon="mdi:battery-sync-outline"></ha-icon>${N(t, "replaced")}
      </button>`, g = (n) => r && e.snooze_until !== null ? w`<span class="snoozed">
            <span class="muted small">${N(t, "snoozed_until", { when: vt(t, e.snooze_until, this.now, o, this.timeFormat) })}</span>
            <button class="pbtn" type="button" @click=${() => this.fire("snooze-cancel", { id: e.id })}>${N(t, "snooze_cancel")}</button>
          </span>` : w`<button class=${n ? "pbtn primary" : "pbtn"} type="button" @click=${() => this.fire("later", { id: e.id })}>
            <ha-icon icon="mdi:bell-sleep-outline"></ha-icon>${N(t, "later")}
          </button>`, ie = Pt(e), _ = e.mains === !0;
		return w`
      <header class="hero">
        ${ne || e.cloud || _ ? w`<p class="dname"><ha-icon .icon=${e.icon}></ha-icon><span>${ne}</span>${e.cloud ? w`<span class="chip-cloud"><ha-icon icon="mdi:cloud-outline"></ha-icon>${N(t, "cloud_device")}</span>` : D}${e.manual ? w`<span class="chip-cloud"><ha-icon icon="mdi:plus-circle-outline"></ha-icon>${N(t, "manual_chip")}</span>` : _ ? w`<span class="chip-cloud"><ha-icon icon="mdi:power-plug-outline"></ha-icon>${N(t, "mains_chip")}</span>` : D}</p>` : D}
        <h3 class=${`dhl ${s.tone === "accent" ? "grad" : `t-${s.tone}`}`}>${s.text}</h3>
        <p class="dtx">${ln(t, e, this.now, o, this.timeFormat)}</p>
      </header>

      ${this.readonly ? w`<p class="ro muted small"><ha-icon icon="mdi:lock-outline"></ha-icon>${N(t, "read_only")}</p>` : D}
      ${Mt(e) && !this.readonly ? w`<div class="buttons">
              ${_ ? g(!r) : ie ? w`${h(!0)}${g(!1)}` : w`${g(!r)}${h(!1)}`}
            </div>` : D}

      <section class="cal">
        <div class="hd">
          <span class="cap">${N(t, "heartbeat_title")}</span>
          <span class="legend">
            <span>${N(t, "heartbeat_legend")}</span>
            ${ee.length ? w`<span class="lg-gap"><i aria-hidden="true"></i>${N(t, "no_data_legend")}</span>` : D}
          </span>
        </div>
        ${d && u ? w`<pulse-heartbeat
                .bins=${d}
                .dayStarts=${u.dayStarts}
                .binMinutes=${u.binMinutes}
                .timeZone=${o}
                .now=${this.now}
                .silentSince=${xn(e, d, u.dayStarts, u.binMinutes)}
                .noData=${f}
                silence=${ur(e)}
                .language=${t}
                tone=${dr(e)}
              ></pulse-heartbeat>` : this.beatError ? w`<div class="cal-err">
                  <span class="muted">${N(t, "heartbeat_failed")}</span>
                  <button class="pbtn" type="button" @click=${() => this.reloadBeat(e.id)}>${N(t, "reload")}</button>
                </div>` : w`<div class="cal-wait"><pulse-rhythm .buckets=${e.strip} tone=${L(e)} ?learning=${e.status === "learning" && !e.ignored} .gaps=${ee} .days=${p} .silentFrom=${bn(e, this.dayStarts)} .flag=${nn(t, e, this.now)}></pulse-rhythm>
                <div class="axis muted" aria-hidden="true" style=${`grid-template-columns: ${ft(this.dayStarts)}`}>${dt(t, this.dayStarts, o).map((e) => w`<span>${e}</span>`)}</div></div>`}
      </section>

      ${c ? w`<section class="pair">
              <span class="cap">${N(t, "with_partner")}</span>
              <div class="l"><span>${c.name}</span>${m(c)}</div>
              <div class="l"><span>${e.name}</span>${m(e)}</div>
              ${te ? w`<p>${te}</p>` : D}
            </section>` : D}

      ${_ ? w`<p class="fc muted"><ha-icon icon=${e.manual ? "mdi:plus-circle-outline" : "mdi:power-plug-outline"}></ha-icon><span>${N(t, e.manual ? "manual_note" : "mains_note")}</span></p>` : w`<section class="stats">
        <div>
          <span>${N(t, "battery")}</span>
          <b class=${n.trusted ? "" : "faint"}>${i}</b>
          ${n.trusted ? D : w`<small>${N(t, "stat_rechargeable")}</small>`}
        </div>
        <div><span>${N(t, "battery_type")}</span><b>${a}</b></div>
        <div><span>${N(t, "stat_changed")}</span><b>${l === void 0 ? N(t, "unknown") : jt(t, l, this.now, o)}</b></div>
      </section>
      ${re ? w`<p class=${n.forecast ? "fc" : "fc muted"}><ha-icon icon=${n.forecast ? "mdi:battery-clock-outline" : "mdi:battery-unknown"}></ha-icon><span>${re}</span></p>` : D}`}

      ${this.renderSuggestions(e)}

      <div class="list quick">
        ${Mt(e) || this.readonly || _ ? D : w`<button class="row action" type="button" @click=${() => this.fire("replaced", { id: e.id })}>
                <span class="label">${N(t, "replaced_now")}</span>
              </button>`}
        ${this.switchRow(N(t, "important"), N(t, "important_hint"), e.critical, (t) => this.change({ critical: Ft(e, t) }), e.label === "important" ? N(t, "label_set", { label: "pulse_important" }) : void 0)}
      </div>

      <details class="more" ?open=${this.settingsOpen} @toggle=${this.onSettingsToggle}>
        <summary>
          <span>${N(t, "device_settings")}</span>
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </summary>
        ${this.renderSettings(e)}
      </details>
    `;
	}
	renderSuggestions(e) {
		let t = this.language, n = this.readonly ? [] : Mn(e);
		return n.length ? w`<section class="suggest">
      <span class="cap">${N(t, "partner")}</span>
      ${n.map((n) => w`<div class="sg">
          <span class="sg-t"><b>${N(t, "partner_suggest", { name: n.name })}</b><small>${N(t, "partner_suggest_why")}</small></span>
          <span class="sg-b">
            <button class="pbtn" type="button" @click=${() => this.fire("partner-dismiss", {
			id: e.id,
			partner: n.id
		})}>${N(t, "partner_dismiss")}</button>
            <button class="pbtn primary" type="button" @click=${() => this.change({ partner: n.id })}>${N(t, "partner_accept")}</button>
          </span>
        </div>`)}
    </section>` : D;
	}
	renderBatterySettings(e, t, n) {
		let r = this.language, i = e.battery;
		return w`<section class="section">
        <h4 class="section-title">${N(r, "battery")}</h4>
        <div class="list">
          ${this.picker(N(r, "battery_type"), i.type ?? "", t, (e) => this.change({ battery_type: e || null }))}
          ${this.picker(N(r, "battery_count"), String(i.count ?? 1), fr, (e) => this.change({ battery_count: Number(e) }))}
          ${this.picker(N(r, "chemistry"), i.chemistry ?? "", n, (e) => this.change({ chemistry: e || null }), i.trusted ? void 0 : N(r, "level_unreliable"))}
          ${i.voltage === null ? D : w`<div class="row"><span class="label">${N(r, "voltage")}</span><span class="value">${yt(r, i.voltage)}</span></div>`}
        </div>
      </section>

      <section class="section">
        <h4 class="section-title">${N(r, "replaced_history")}</h4>
        <div class="list">
          ${i.replaced.length ? [...i.replaced].reverse().slice(0, 3).map((e) => w`<div class="row"><span class="label">${gt(r, e, this.timeZone)}</span><span class="value">${et(r, e, this.now)}</span></div>`) : w`<div class="row"><span class="label muted">${N(r, "never_replaced")}</span></div>`}
        </div>
      </section>`;
	}
	renderSettings(e) {
		let t = this.language, n = [{
			value: "",
			label: N(t, "type_unknown")
		}, ...this.batteryTypes.map((e) => ({
			value: e,
			label: e
		}))], r = [{
			value: "",
			label: N(t, "chem_unknown")
		}, ...this.chemistries.map((e) => ({
			value: e,
			label: N(t, pr[e] ?? "chem_unknown")
		}))], i = [{
			value: "",
			label: N(t, "partner_none")
		}, ...xt(this.devices, e).map((e) => ({
			value: e.id,
			label: e.name
		}))];
		return w`<div class="settings">
      ${e.mains === !0 ? D : this.renderBatterySettings(e, n, r)}
      <section class="section">
        <h4 class="section-title">${N(t, "partner")}</h4>
        <div class="list">
          ${this.picker(N(t, "partner"), e.partner ?? "", i, (e) => this.change({ partner: e || null }))}
        </div>
        <p class="section-foot">${N(t, "partner_hint")}</p>
      </section>

      <section class="section">
        <h4 class="section-title">${N(t, "monitoring")}</h4>
        <div class="list">
          ${this.switchRow(N(t, "ignore"), N(t, "ignore_hint"), e.ignored, (e) => this.change({ ignored: e }), e.label === "ignore" ? N(t, "label_set", { label: "pulse_ignore" }) : void 0)}
          ${this.readonly ? D : w`<button class="row action" type="button" @click=${() => ze(`/config/devices/device/${e.id}`)}>
                  <span class="label">${N(t, "open_device")}</span>
                  <ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
                </button>`}
        </div>
      </section>
    </div>`;
	}
	render() {
		let e = this.device;
		return w`<pulse-sheet
      .open=${this.open && e !== null}
      .heading=${e?.name ?? ""}
      .language=${this.language}
      @closed=${() => this.fire("sheet-closed", {})}
    >
      ${e ? w`<div class="body">${this.renderBody(e)}</div>` : D}
    </pulse-sheet>`;
	}
	static {
		this.styles = [
			q,
			J,
			Y,
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
}), M("pulse-mark", class extends A {
	render() {
		return w`<svg viewBox="0 0 100 100" aria-hidden="true">
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
		this.styles = [q, o`
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
var mr = {
	area: "group_area",
	status: "group_status",
	none: "group_none"
};
M("pulse-devices", class extends A {
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
		super(), this.gapsOf = P(pn), this.gaps = [], this.devices = [], this.language = "en", this.now = 0, this.start = 0, this.days = 7, this.dayStarts = [], this.timeZone = void 0, this.timeFormat = void 0, this.bucketHours = 2, this.noData = [], this.groupBy = "area", this.filter = null, this.dueIds = [], this.readonly = !1, this.query = "", this.collapsed = /* @__PURE__ */ new Set();
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
		let n = He(t);
		n === "details" ? this.fire("open", { id: e.id }) : n === "replaced" ? this.fire("replaced", { id: e.id }) : n === "later" ? this.fire("later", { id: e.id }) : n === "important" ? this.fire("device-change", {
			id: e.id,
			changes: { critical: Ft(e, !e.critical) }
		}) : n === "ignore" && this.fire("device-change", {
			id: e.id,
			changes: { ignored: !e.ignored }
		});
	}
	filterName(e) {
		let t = this.language;
		return e === "ignored" ? N(t, "ignored") : e === "important" ? N(t, "filter_important") : e === "battery" ? N(t, "filter_battery") : e === "mains" ? N(t, "filter_mains") : N(t, Ze(e));
	}
	emptyText() {
		let e = this.language;
		return this.devices.length ? this.query.trim() ? N(e, "no_results", { query: this.query }) : N(e, "filter_empty") : N(e, "no_devices");
	}
	renderRow(e) {
		let t = this.language, n = rn(t, e, this.now), r = Vt(t, e, this.now, this.timeZone, this.timeFormat), i = e.ignored ? "ok" : L(e), a = this.readonly ? D : w`<span class="menu"><ha-dropdown placement="bottom-end" @wa-select=${(t) => this.onMenu(e, t)}>
          <ha-icon-button slot="trigger" .label=${N(t, "more_for", { name: e.name })}>
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </ha-icon-button>
          <ha-dropdown-item value="details"><ha-icon slot="icon" icon="mdi:information-outline"></ha-icon>${N(t, "details")}</ha-dropdown-item>
          ${e.mains ? D : w`<ha-dropdown-item value="replaced"><ha-icon slot="icon" icon="mdi:battery-sync-outline"></ha-icon>${N(t, "replaced")}</ha-dropdown-item>`}
          ${Mt(e) ? w`<ha-dropdown-item value="later"><ha-icon slot="icon" icon="mdi:bell-sleep-outline"></ha-icon>${N(t, "later")}</ha-dropdown-item>` : D}
          ${e.ignored || e.label ? D : w`<ha-dropdown-item value="important"><ha-icon slot="icon" icon=${e.critical ? "mdi:star-off-outline" : "mdi:star-outline"}></ha-icon>${N(t, e.critical ? "unmark_important" : "mark_important")}</ha-dropdown-item>`}
          ${e.label === "ignore" ? D : w`<ha-dropdown-item value="ignore">
            <ha-icon slot="icon" icon=${e.ignored ? "mdi:eye-outline" : "mdi:eye-off-outline"}></ha-icon>${N(t, e.ignored ? "resume" : "ignore_action")}
          </ha-dropdown-item>`}
        </ha-dropdown></span>`;
		return w`<div class="mrow">
      <button class="main rowgrid" type="button" @click=${() => this.fire("open", { id: e.id })}>
        <span class="nm">
          <ha-icon class=${`t-${i}`} .icon=${e.icon}></ha-icon>
          <span class="who">
            <span class="title"><b>${e.name}</b>${e.critical && !e.ignored ? w`<span class="star" role="img" aria-label=${N(t, "important_badge")} title=${N(t, "important_badge")}><ha-icon icon="mdi:star"></ha-icon></span>` : D}</span>
            ${this.groupBy !== "area" && e.area ? w`<span class="room">${e.area}</span>` : D}
          </span>
        </span>
        <pulse-rhythm
          .buckets=${e.strip}
          tone=${L(e)}
          ?learning=${e.status === "learning" && !e.ignored}
          .gaps=${this.gaps}
          .days=${Math.max(1, this.dayStarts.length - 1)}
          .silentFrom=${bn(e, this.dayStarts)}
          .flag=${nn(t, e, this.now)}
        ></pulse-rhythm>
        <span class="st">
          ${n ? w`<b class=${`t-${n.tone}`}>${n.text}</b><span class="sep"> · </span>` : D}<span class="num time">${r}</span>
        </span>
      </button>
      ${a}
    </div>`;
	}
	render() {
		let e = this.language, t = St(kt(this.devices, this.filter, this.dueIds), this.query), n = this.groupBy === "area", r = t.filter((e) => !e.ignored), i = t.filter((e) => e.ignored), a = wt(r, this.groupBy, e, N(e, "no_area"));
		this.gaps = this.gapsOf(this.noData, this.dayStarts);
		let o = dt(e, this.dayStarts, this.timeZone);
		i.length && a.push({
			area: N(e, "ignored"),
			devices: i
		});
		let s = this.filter ? N(e, "filter_label", { what: this.filterName(this.filter) }) : "";
		return w`<div class=${[
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
            aria-label=${N(e, "search_label")}
            .value=${this.query}
            placeholder=${this.devices.length === 1 ? N(e, "search_one") : N(e, "search", { count: this.devices.length })}
            @input=${(e) => {
			this.query = Ve(e);
		}}
          />
        </label>
        <ha-dropdown placement="bottom-end" @wa-select=${(e) => this.setGroup(He(e) ?? "")}>
          <button slot="trigger" class="chip" type="button">
            ${N(e, "group_by", { what: N(e, mr[this.groupBy]) })}
            <ha-icon icon="mdi:menu-down"></ha-icon>
          </button>
          ${[
			"area",
			"status",
			"none"
		].map((t) => w`<ha-dropdown-item value=${t}>
              <ha-icon slot="icon" class=${t === this.groupBy ? "check" : "check hidden"} icon="mdi:check"></ha-icon>
              ${N(e, mr[t])}
            </ha-dropdown-item>`)}
        </ha-dropdown>
        ${s ? w`<button class="chip filter" type="button" @click=${() => this.fire("filter-clear", {})} aria-label=${`${s}, ${N(e, "filter_clear")}`}>
                ${s}
                <ha-icon icon="mdi:close"></ha-icon>
              </button>` : D}
      </div>
      <div class="axis" aria-hidden="true">
        <span>${t.length === 1 ? N(e, "monitor_head_one") : N(e, "monitor_head", { count: t.length })}</span>
        <div class="days mono" style=${`grid-template-columns: ${ft(this.dayStarts)}`}>${o.map((e) => w`<span>${e.replace(".", "")}</span>`)}</div>
        <span class="right">${N(e, "col_last")}</span>
      </div>
      ${t.length ? a.map((e) => {
			let t = this.collapsed.has(e.area);
			return w`${e.area ? w`<button class="group" type="button" aria-expanded=${t ? "false" : "true"} @click=${() => this.toggle(e.area)}>
              <ha-icon icon=${t ? "mdi:chevron-right" : "mdi:chevron-down"}></ha-icon>
              <span>${e.area}</span><span class="count">${e.devices.length}</span>
            </button>` : D}${t ? D : e.devices.map((e) => this.renderRow(e))}`;
		}) : w`<p class="empty muted">${this.emptyText()}</p>`}
    </div>`;
	}
	static {
		this.styles = [
			q,
			J,
			Y,
			Un,
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
        .mrow:hover {
          background: color-mix(in srgb, var(--pu-ink) 3%, transparent);
        }
        .group:hover {
          background: color-mix(in srgb, var(--pu-ink) 8%, transparent);
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
      /* Gruppen-Überschrift: eigene Leiste mit Abstand (wie die Räume in der Übersicht) */
      .group {
        display: flex;
        align-items: center;
        gap: var(--pu-sp-8);
        width: 100%;
        min-height: max(40px, var(--pu-hit));
        margin-top: var(--pu-sp-16);
        padding: 0 var(--pu-sp-12);
        border: 0;
        border-radius: var(--pu-r-8);
        background: color-mix(in srgb, var(--pu-ink) 5%, transparent);
        color: var(--pu-ink);
        font: inherit;
        font-size: var(--pu-fs-15);
        font-weight: 700;
        text-align: start;
        cursor: pointer;
        --mdc-icon-size: 18px;
      }
      .group ha-icon {
        color: var(--pu-muted);
      }
      .group .count {
        padding: 0 8px;
        border-radius: 99px;
        background: color-mix(in srgb, var(--pu-ink) 8%, transparent);
        color: var(--pu-muted);
        font-size: 12px;
        font-weight: 600;
        line-height: 20px;
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
var hr = (e) => `${(e / 24 * 100).toFixed(2)}%`;
M("pulse-dayband", class extends A {
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
		let e = this.language, t = this.settings, n = ct(this.now, this.timeZone), r = on(t.summary_time), i = t.quiet.enabled ? sn(t.quiet.start, t.quiet.end) : [], a = Cn(e, t);
		return w`<div class="top">
        <span class="cap">${N(e, "day_title")}</span>
        <span class="to">${this.recipients}</span>
      </div>
      <p class="line">${a}</p>
      <div class="band" role="img" aria-label=${`${N(e, "day_title")}: ${a}`}>
        <div class="track" aria-hidden="true">
          ${i.map(([e, t]) => w`<span class="quiet" style=${`left: ${hr(e)}; width: ${hr(t - e)}`}></span>`)}
          <span class="nowline" style=${`left: ${hr(n)}`}></span>
          <span class="dot" style=${`left: ${hr(r)}`}></span>
        </div>
        <div class="hours mono" aria-hidden="true">
          ${[
			0,
			6,
			12,
			18,
			24
		].map((t) => w`<span>${N(e, "hour_label", { h: t })}</span>`)}
        </div>
      </div>`;
	}
	static {
		this.styles = [
			q,
			Y,
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
var gr = "pulse.closedRooms";
function _r() {
	try {
		let e = JSON.parse(window.localStorage.getItem(gr) ?? "[]");
		return new Set(Array.isArray(e) ? e.filter((e) => typeof e == "string") : []);
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
function vr(e) {
	try {
		window.localStorage.setItem(gr, JSON.stringify([...e]));
	} catch {}
}
M("pulse-overview", class extends A {
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
		super(), this.gapsOf = P(pn), this.gaps = [], this.language = "en", this.now = 0, this.recipients = "", this.timeZone = void 0, this.timeFormat = void 0, this.dayStarts = [], this.noData = [], this.readonly = !1, this.closed = _r();
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
		t.has(e) ? t.delete(e) : t.add(e), this.closed = t, vr(t);
	}
	renderRow(e, t = !0) {
		let n = this.language, r = rn(n, e, this.now), i = Vt(n, e, this.now, this.timeZone, this.timeFormat);
		return w`<button class="mrow rowgrid" type="button" @click=${() => this.fire("open", { id: e.id })}>
      <span class="nm">
        <ha-icon class=${`t-${e.ignored ? "ok" : L(e)}`} .icon=${e.icon}></ha-icon>
        <span class="who">
          <span class="title"><b>${e.name}</b>${e.critical && !e.ignored ? w`<span class="star" role="img" aria-label=${N(n, "important_badge")} title=${N(n, "important_badge")}><ha-icon icon="mdi:star"></ha-icon></span>` : D}</span>
          ${t && e.area ? w`<span class="room">${e.area}</span>` : D}
        </span>
      </span>
      <pulse-rhythm
        .buckets=${e.strip}
        tone=${L(e)}
        ?learning=${e.status === "learning" && !e.ignored}
        .gaps=${this.gaps}
        .days=${Math.max(1, this.dayStarts.length - 1)}
        .silentFrom=${bn(e, this.dayStarts)}
        .flag=${nn(n, e, this.now)}
      ></pulse-rhythm>
      <span class="st">
        ${r ? w`<b class=${`t-${r.tone}`}>${r.text}</b><span class="sep"> · </span>` : D}<span class="num time">${i}</span>
      </span>
    </button>`;
	}
	renderSection(e, t) {
		let n = this.language, r = w`<div class="grp">
      <span>${N(n, $t(e))}</span><span class="count">${t.length}</span>
    </div>`;
		return e !== "rhythm" || t.length <= 12 ? w`${r}${t.map((e) => this.renderRow(e))}` : w`${r}${$e(t, N(n, "no_area")).map((e) => {
			let t = this.closed.has(e.area);
			return w`<button class="room-head" type="button" aria-expanded=${t ? "false" : "true"} @click=${() => this.toggleRoom(e.area)}>
          <ha-icon icon=${t ? "mdi:chevron-right" : "mdi:chevron-down"}></ha-icon>
          <span>${e.area}</span><span class="count">${e.devices.length}</span>
        </button>
        ${t ? D : e.devices.map((e) => this.renderRow(e, !1))}`;
		})}`;
	}
	renderZigbee() {
		let e = this.language, t = this.snapshot.z2m, n = w`<span class="cap">${N(e, "welcome_zigbee_title")}</span>`;
		if (!t.present) return D;
		if (t.last_seen && t.availability) return w`<div class="fact zig">${n}<b class="t-ok on"><ha-icon icon="mdi:check-circle"></ha-icon>${N(e, "zigbee_active")}</b><span class="sub">${N(e, "zigbee_devices")}: ${t.devices}</span></div>`;
		let r = t.requested_at !== null && this.now - t.requested_at < 120;
		return this.readonly ? w`<div class="fact zig">${n}<b>${r ? N(e, "zigbee_requested") : N(e, "off")}</b><span class="sub">${N(e, "zigbee_hint")}</span></div>` : w`<div
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
        <b>${r ? N(e, "zigbee_requested") : N(e, "off")}</b>
        ${r ? D : w`<ha-switch tabindex="-1" aria-hidden="true"></ha-switch>`}
      </span>
      <span class="sub">${N(e, "zigbee_hint")}</span>
    </div>`;
	}
	renderBattery() {
		let e = this.language, t = this.snapshot, n = t.summary.due_batteries, r = It(e, t.summary.low_batteries ?? []), i = t.summary.low_batteries ?? [], a = n === void 0 ? t.summary.next_battery ?? "" : kn(e, n.filter((e) => !i.includes(e.name))), o = r.tone === "ok" && n?.length ? N(e, n.length === 1 ? "battery_due_one" : "battery_due_many", { count: n.length }) : r.label, s = Ot(t.devices, (n ?? []).map((e) => e.id)), c = w`<span class="cap">${N(e, "batteries")}</span>
      <b class=${r.tone === "warn" ? "t-warn" : ""}>${o}</b>
      ${r.value ? w`<span class="sub">${r.value}</span>` : D}
      <span class="sub">${a || (r.value ? "" : N(e, "nothing_due"))}</span>`;
		return s.length ? w`<button class="fact tappable" type="button" @click=${() => {
			let [e] = s;
			s.length === 1 && e ? this.fire("open", { id: e.id }) : this.show("battery");
		}}>${c}</button>` : w`<div class="fact">${c}</div>`;
	}
	renderFacts() {
		let e = this.language, t = this.snapshot, n = Et(t.devices), r = t.devices.filter((e) => e.ignored).length;
		return w`<section class="facts">
      ${this.renderBattery()}
      ${n ? w`<button class="fact tappable" type="button" @click=${() => this.fire("open", { id: n.device.id })}>
              <span class="cap">${N(e, "last_change")}</span>
              <b>${jt(e, n.at, this.now, this.timeZone)}</b>
              <span class="sub">${n.device.name}</span>
            </button>` : w`<div class="fact"><span class="cap">${N(e, "last_change")}</span><b>${N(e, "unknown")}</b><span class="sub">${N(e, "never_replaced")}</span></div>`}
      ${this.renderZigbee()}
      ${r ? w`<button class="fact tappable" type="button" @click=${() => this.show("ignored")}>
              <span class="cap">${N(e, "ignored")}</span>
              <b>${N(e, "ignored_count", { count: r })}</b>
              <span class="sub">${N(e, "show_list")}</span>
            </button>` : D}
    </section>`;
	}
	render() {
		let e = this.language, t = this.snapshot, n = Jt(e, t.devices), r = jn(e, t.summary.cloud_outages), i = {
			accent: "grad",
			warn: "t-warn",
			crit: "t-crit",
			plain: ""
		}[n.tone], a = Xt(e, t.devices, this.now, this.timeZone), o = en(t.devices);
		this.gaps = this.gapsOf(this.noData, this.dayStarts);
		let s = t.devices.filter((e) => !e.ignored).length, c = s === 1 ? N(e, "monitor_head_one") : N(e, "monitor_head", { count: s }), l = dt(e, this.dayStarts, this.timeZone);
		return w`<div class="page">
      <section class="hero">
        <div class="words">
          <h2 class="hl">
            <span class="long">${n.line1}</span><span class="short">${n.line1Short}</span><br />
            <span class=${`l2 long ${i}`}>${n.line2}</span><span class=${`l2 short ${i}`}>${n.line2Short}</span>
          </h2>
          <p class="hsub">
            ${n.sub ? w`<span class="ok-line">${n.sub}</span>` : D}
            ${a.mentions.map((e) => w`${e.before}<b class=${`t-${e.tone}`}>${e.name}</b>${e.after} `)}${a.text}
          </p>
          ${r.map((e) => w`<p class="cloud"><ha-icon icon="mdi:cloud-off-outline"></ha-icon><span>${e}</span></p>`)}
        </div>
        ${this.readonly ? w`<pulse-dayband
                .settings=${t.settings}
                .language=${e}
                .timeZone=${this.timeZone}
                .now=${this.now}
                .recipients=${this.recipients}
              ></pulse-dayband>` : w`<pulse-dayband
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
          <div class="days mono" style=${`grid-template-columns: ${ft(this.dayStarts)}`}>${l.map((e) => w`<span>${e.replace(".", "")}</span>`)}</div>
          <span class="right">${N(e, "col_last")}</span>
        </div>
        ${o.map((e) => this.renderSection(e.key, e.devices))}
      </section>

      ${this.renderFacts()}
    </div>`;
	}
	static {
		this.styles = [
			q,
			J,
			Y,
			Un,
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
        .fact.tappable:hover {
          background: color-mix(in srgb, var(--pu-ink) 3%, transparent);
        }
        .room-head:hover {
          background: color-mix(in srgb, var(--pu-ink) 8%, transparent);
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
      /* Raum-Überschrift: eigene Leiste mit Abstand, nicht wie eine Gerätezeile */
      .room-head {
        display: flex;
        align-items: center;
        gap: var(--pu-sp-8);
        width: 100%;
        min-height: max(40px, var(--pu-hit));
        margin-top: var(--pu-sp-16);
        padding: 0 var(--pu-sp-12);
        border: 0;
        border-radius: var(--pu-r-8);
        background: color-mix(in srgb, var(--pu-ink) 5%, transparent);
        color: var(--pu-ink);
        font: inherit;
        font-size: var(--pu-fs-15);
        font-weight: 700;
        text-align: start;
        cursor: pointer;
        --mdc-icon-size: 18px;
      }
      .room-head ha-icon {
        color: var(--pu-muted);
      }
      .room-head .count {
        padding: 0 8px;
        border-radius: 99px;
        background: color-mix(in srgb, var(--pu-ink) 8%, transparent);
        color: var(--pu-muted);
        font-size: 12px;
        font-weight: 600;
        line-height: 20px;
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
}), M("pulse-segmented", class extends A {
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
	updated() {
		let e = this.renderRoot.querySelector("nav"), t = this.renderRoot.querySelector("button.active");
		if (!e || !t || e.scrollWidth <= e.clientWidth) return;
		let n = t.offsetLeft - e.offsetLeft;
		n < e.scrollLeft ? e.scrollLeft = n : n + t.offsetWidth > e.scrollLeft + e.clientWidth && (e.scrollLeft = n + t.offsetWidth - e.clientWidth);
	}
	render() {
		return w`<nav aria-label=${this.label}>
      ${this.options.map((e) => w`<button
          type="button"
          aria-current=${e.value === this.value ? "page" : D}
          class=${e.value === this.value ? "active" : ""}
          @click=${() => this.pick(e.value)}
        >
          ${e.label}
        </button>`)}
    </nav>`;
	}
	static {
		this.styles = [q, o`
      :host {
        display: block;
        max-width: 100%;
      }
      /* Four tabs in a long language on a narrow phone: swipe sideways instead of overflowing the page */
      nav {
        display: flex;
        gap: clamp(4px, 1.6vw, 14px);
        overflow-x: auto;
        scrollbar-width: none;
        overscroll-behavior-x: contain;
      }
      nav::-webkit-scrollbar {
        display: none;
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
}, yr = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), br = class {
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
}, { I: xr } = Ne, Sr = (e) => e.strings === void 0, Cr = {}, wr = (e, t = Cr) => e._$AH = t, Tr = yr(class extends br {
	constructor(e) {
		if (super(e), e.type !== $.PROPERTY && e.type !== $.ATTRIBUTE && e.type !== $.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!Sr(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === E || t === D) return t;
		let n = e.element, r = e.name;
		if (e.type === $.PROPERTY) {
			if (t === n[r]) return E;
		} else if (e.type === $.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return E;
		} else if (e.type === $.ATTRIBUTE && n.getAttribute(r) === t + "") return E;
		return wr(e), t;
	}
}), Er = [
	"failed",
	"check",
	"battery",
	"recovered"
], Dr = {
	failed: "tpl_failed",
	check: "tpl_check",
	battery: "tpl_battery",
	recovered: "tpl_recovered"
};
M("pulse-template-sheet", class extends A {
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
		let e = this.language, t = (e) => Ln(e, this.example, this.vars), n = this.current[`${this.kind}_title`] != null || this.current[`${this.kind}_message`] != null;
		return w`<pulse-sheet
      no-close
      .open=${this.open}
      .heading=${N(e, Dr[this.kind])}
      .language=${e}
      @closed=${() => this.close()}
    >
      <div class="body">
        <label class="field">
          <span class="cap">${N(e, "tpl_title_field")}</span>
          <input
            type="text"
            maxlength="300"
            .value=${Tr(this.draftTitle)}
            @focus=${() => {
			this.focused = "title";
		}}
            @input=${(e) => {
			e.target instanceof HTMLInputElement && (this.draftTitle = e.target.value);
		}}
          />
        </label>
        <label class="field">
          <span class="cap">${N(e, "tpl_message_field")}</span>
          <textarea
            rows="3"
            maxlength="300"
            .value=${Tr(this.draftMessage)}
            @focus=${() => {
			this.focused = "message";
		}}
            @input=${(e) => {
			e.target instanceof HTMLTextAreaElement && (this.draftMessage = e.target.value);
		}}
          ></textarea>
        </label>
        <div>
          <span class="cap">${N(e, "tpl_vars")}</span>
          <div class="chips">
            ${this.vars.map((e) => w`<button class="chip" type="button" @mousedown=${(e) => e.preventDefault()} @click=${() => this.insert(e)}>{${e}}</button>`)}
          </div>
          <p class="hint">${N(e, "tpl_vars_hint")}</p>
        </div>
        ${Object.keys(this.example).length ? w`<div class="preview" aria-live="polite">
                <span class="cap">${N(e, "tpl_preview")}</span>
                <div class="bubble">
                  <b>${t(this.draftTitle) || this.example.name}</b>
                  <span>${t(this.draftMessage)}</span>
                </div>
              </div>` : D}
      </div>
      ${n ? w`<button slot="footer" class="pbtn" type="button" @click=${() => this.save(!0)}>${N(e, "tpl_reset")}</button>` : D}
      <button slot="footer" class="pbtn" type="button" @click=${() => this.close()}>${N(e, "cancel")}</button>
      <button slot="footer" class="pbtn primary" type="button" @click=${() => this.save(!1)}>${N(e, "tpl_save")}</button>
    </pulse-sheet>`;
	}
	static {
		this.styles = [
			q,
			J,
			Y,
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
}), M("pulse-settings", class extends A {
	static {
		this.properties = {
			snapshot: { attribute: !1 },
			page: { type: String },
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
		return w`<button class="row link" type="button" @click=${n}>
      <span class="label">${e}</span>
      <span class="value">${t}</span>
      <ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
    </button>`;
	}
	z2mOptionRow(e, t, n, r, i) {
		let a = this.language, o = w`<span class="label">${N(a, e)}<small>${N(a, t)}</small></span>`;
		return n ? w`<div class="row">${o}<span class="value t-ok on"><ha-icon icon="mdi:check-circle"></ha-icon>${N(a, "zigbee_active")}</span></div>` : typeof r == "number" && this.now - r < 120 ? w`<div class="row">${o}<span class="value">${N(a, "zigbee_requested")}</span></div>` : this.toggleRow(o, !1, () => this.fire(i));
	}
	onZ2mBase(e) {
		let t = e.target;
		if (!(t instanceof HTMLInputElement)) return;
		let n = this.snapshot.settings.z2m_base, r = bt(t.value);
		if (r === null) {
			j(this, N(this.language, "z2m_base_invalid")), t.value = n;
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
		return Tt(e).map((e) => ({
			value: e,
			label: e
		}));
	}
	togglePerson(e, t) {
		let n = wn(this.snapshot.settings), r = t ? [.../* @__PURE__ */ new Set([...n, e])] : n.filter((t) => t !== e);
		this.save({ arrive_home: { persons: r } });
	}
	pickerRow(e, t, n, r, i) {
		let a = this.language;
		return w`<div class=${i ? "row has-icon" : "row"}>
      ${i ? w`<ha-icon class=${`ico ${i.tone}`} icon=${i.icon}></ha-icon>` : D}
      <span class="label">${N(a, e)}</span>
      <pulse-picker
        .language=${a}
        .label=${N(a, e)}
        .value=${t}
        .options=${n}
        @change=${(e) => r(e.detail.value)}
      ></pulse-picker>
    </div>`;
	}
	toggleRow(e, t, n, r = !1) {
		return w`<div
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
		return this.toggleRow(w`<span class="label">${N(i, e)}${r ? w`<small>${N(i, r)}</small>` : D}</span>`, t, n);
	}
	renderManual() {
		let e = this.language, t = Hn(this.snapshot.devices);
		return w`<section class="section">
      <h3 class="section-title">${N(e, "manual_title")}</h3>
      <div class="list">
        ${t.map((t) => w`<div class="row has-icon manual">
            <button class="open" type="button" @click=${() => this.fire("open", { id: t.id })}>
              <ha-icon class="ico" icon=${t.icon}></ha-icon>
              <span class="label">${t.name}<small>${Vn(t)}</small></span>
            </button>
            <button
              class="remove"
              type="button"
              aria-label=${N(e, "manual_remove", { name: t.name })}
              title=${N(e, "manual_remove", { name: t.name })}
              @click=${() => this.fire("manual-remove", {
			id: t.id,
			name: t.name
		})}
            >
              <ha-icon icon="mdi:minus-circle-outline"></ha-icon>
            </button>
          </div>`)}
        <button class="row action has-icon" type="button" @click=${() => this.fire("manual-add-open")}>
          <ha-icon class="ico add" icon="mdi:plus"></ha-icon>${N(e, "manual_add")}
        </button>
      </div>
      <p class="section-foot">${N(e, "manual_hint")}</p>
    </section>`;
	}
	renderOptionsPage(e, t) {
		let n = this.language, r = this.snapshot.settings, i = this.snapshot.z2m;
		return w`
      <section class="hero">
        <div class="words">
          <h2 class="hl">${N(n, e === 1 ? "options_hl1_one" : "options_hl1", { count: e })}<br /><span class="grad">${N(n, "options_hl2")}</span></h2>
          <p class="hsub">${r.mains_beta ? N(n, "options_sub_mains", { mains: t }) : N(n, "options_sub")}</p>
        </div>
      </section>

      <div class="cols">
      <section class="section">
        <h3 class="section-title">${N(n, "options_watch")}</h3>
        <div class="list">
          ${this.switchRow("mains_beta", r.mains_beta ?? !0, (e) => this.save({ mains_beta: e }), "mains_beta_hint")}
          ${r.mains_beta ? this.linkRow(N(n, "mains_devices"), String(t), () => this.fire("show-devices", { filter: "mains" })) : D}
        </div>
      </section>

      ${this.renderManual()}

      <section class="section">
        <h3 class="section-title">${N(n, "zigbee")}</h3>
        ${i.present ? w`<div class="list z2m">
                ${this.z2mOptionRow("welcome_zigbee_title", "zigbee_hint", i.last_seen && i.availability, i.requested_at, "enable-z2m")}
                ${this.z2mOptionRow("health_title", "health_hint", i.health === !0, i.health_requested_at, "enable-z2m-health")}
              </div>` : D}
        <details class="list adv">
          <summary class="row">
            <span class="label">${N(n, "advanced")}</span>
            <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
          </summary>
          <label class="row">
            <span class="label">${N(n, "z2m_base")}</span>
            <input
              class="text"
              type="text"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              placeholder="zigbee2mqtt"
              .value=${Tr(r.z2m_base)}
              @change=${(e) => this.onZ2mBase(e)}
              @keydown=${(e) => {
			e.key === "Enter" && e.currentTarget instanceof HTMLInputElement && e.currentTarget.blur();
		}}
            />
          </label>
          <p class="row adv-hint">${N(n, "z2m_base_hint")}</p>
        </details>
      </section>

      </div>
    `;
	}
	render() {
		let e = this.language, t = this.snapshot, n = t.settings, r = n.targets ?? t.targets, i = [
			{
				value: "now",
				label: N(e, "level_now")
			},
			{
				value: "daily",
				label: N(e, "level_daily")
			},
			{
				value: "off",
				label: N(e, "level_off")
			}
		], a = (e, t, r, a) => this.pickerRow(t, n.levels[e], i, (t) => this.save({ levels: { [e]: t } }), {
			icon: r,
			tone: a
		}), o = wn(n), s = Tn(e, n), c = At(t.devices), l = n.templates ?? {}, u = z(t.devices), d = u.filter((e) => e.mains && !e.manual).length, f = u.find((e) => e.area && !e.mains) ?? u[0];
		return this.page === "options" ? this.renderOptionsPage(u.length, d) : w`
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
        <h3 class="section-title">${N(e, "recipients")}</h3>
        <div class="list">
          ${t.targets.length ? t.targets.map((e) => this.toggleRow(w`<ha-icon class="ico" icon="mdi:cellphone"></ha-icon>
                      <span class=${this.names[e] ? "label" : "label capname"}>${this.targetLabel(e)}</span>`, r.includes(e), (t) => this.toggleTarget(e, t), !0)) : w`<div class="row"><span class="label muted">${N(e, "recipients_none")}</span></div>`}
        </div>
        ${t.targets.length ? w`<p class="section-foot">${N(e, "recipients_hint")}</p>` : D}
      </section>

      <section class="section">
        <h3 class="section-title">${N(e, "when")}</h3>
        <div class="list">
          ${a("failed", "level_failed", "mdi:heart-broken-outline", "t-crit")}
          ${a("check", "level_check", "mdi:alert-circle-outline", "t-warn")}
          ${a("battery", "level_battery", "mdi:battery-low", "")}
        </div>
        <p class="section-foot">${N(e, "levels_hint")}</p>
      </section>

      <section class="section">
        <h3 class="section-title">${N(e, "times")}</h3>
        <div class="list">
          ${this.pickerRow("summary_time", n.summary_time, this.times(n.summary_time), (e) => this.save({ summary_time: e }))}
          ${this.switchRow("quiet", n.quiet.enabled, (e) => this.save({ quiet: { enabled: e } }))}
          ${n.quiet.enabled ? w`${this.pickerRow("quiet_from", n.quiet.start, this.times(n.quiet.start), (e) => this.save({ quiet: { start: e } }))}
                ${this.pickerRow("quiet_to", n.quiet.end, this.times(n.quiet.end), (e) => this.save({ quiet: { end: e } }))}` : D}
        </div>
        ${n.quiet.enabled ? w`<p class="section-foot">${N(e, "quiet_hint")}</p>` : D}
      </section>

      <section class="section">
        <h3 class="section-title">${N(e, "special")}</h3>
        <div class="list">
          ${this.switchRow("critical", n.critical_alerts, (e) => this.save({ critical_alerts: e }), "critical_hint")}
          ${this.linkRow(N(e, "important_devices"), String(c), () => this.fire("show-devices", { filter: "important" }))}
          ${this.switchRow("arrive", n.arrive_home.enabled, (e) => this.save({ arrive_home: {
			enabled: e,
			persons: o.length || !e ? o : t.persons.slice(0, 1)
		} }), "arrive_hint")}
          ${n.arrive_home.enabled ? t.persons.length ? t.persons.map((e) => this.toggleRow(w`<ha-icon class="ico" icon="mdi:account-outline"></ha-icon>
                        <span class="label">${this.names[e] ?? e}</span>`, o.includes(e), (t) => this.togglePerson(e, t), !0)) : w`<div class="row"><span class="label muted">${N(e, "persons_none")}</span></div>` : D}
          ${this.switchRow("recovered", n.recovered, (e) => this.save({ recovered: e }), "recovered_hint")}
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">${N(e, "texts")}</h3>
        <div class="list">
          ${Er.map((t) => this.linkRow(N(e, Dr[t]), N(e, l[`${t}_title`] != null || l[`${t}_message`] != null ? "tpl_custom" : "tpl_default"), () => {
			this.editing = t;
		}))}
        </div>
        <p class="section-foot">${N(e, "texts_hint")}</p>
      </section>

      <section class="section">
        <h3 class="section-title">${N(e, "try_it")}</h3>
        <div class="list">
          <button class="row action" type="button" @click=${() => this.fire("test")}>${N(e, "test")}</button>
          <button class="row action" type="button" @click=${() => this.fire("summary")}>${N(e, "summary_now")}</button>
        </div>
      </section>
      </div>
      <pulse-template-sheet
        .open=${this.editing !== null}
        .kind=${this.editing ?? "failed"}
        .language=${e}
        .current=${l}
        .defaults=${t.template_defaults ?? {}}
        .vars=${t.template_vars ?? []}
        .example=${Rn(f)}
        @template-save=${(e) => this.save({ templates: e.detail.templates })}
        @closed=${() => {
			this.editing = null;
		}}
      ></pulse-template-sheet>
    `;
	}
	static {
		this.styles = [
			q,
			J,
			Y,
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
      /* Device added by hand: the row opens the detail, the minus removes it */
      .manual {
        padding: 0;
        gap: 0;
      }
      .manual .open {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: max(48px, var(--pu-hit));
        padding: 6px 4px 6px 16px;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .manual .open .ico {
        flex: none;
        color: var(--pu-muted);
        --mdc-icon-size: 20px;
      }
      .manual .open .label small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .manual .remove {
        flex: none;
        display: grid;
        place-items: center;
        width: var(--pu-hit);
        height: var(--pu-hit);
        margin-inline-end: 6px;
        border: 0;
        border-radius: 50%;
        background: none;
        color: var(--pu-crit-text);
        cursor: pointer;
        --mdc-icon-size: 22px;
        -webkit-tap-highlight-color: transparent;
      }
      .manual button:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: -2px;
      }
      @media (hover: hover) {
        .manual .open:hover,
        .manual .remove:hover {
          background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
        }
      }
      .row > .ico.add {
        color: var(--pu-accent);
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
function Or() {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}
function kr() {
	let e = Or();
	if (!e) return null;
	try {
		return Xn(e, "26.10.15", Gn.length > 0);
	} catch {
		return null;
	}
}
function Ar(e) {
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
var jr = class extends A {
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
			confirmHealth: { state: !0 },
			addOpen: { state: !0 },
			candidates: { state: !0 }
		};
	}
	constructor() {
		super(), this.unsub = null, this.retryDelay = Nn, this.namesCache = {
			key: "{}",
			value: {}
		}, this.spans = P((e) => fn(e)), this.watched = P((e) => z(e)), this.dayStarts = P((e) => lt(e)), this.onMenuHidden = (e) => {
			let t = e.composedPath()[0];
			t instanceof HTMLElement && t.localName.endsWith("dropdown") && qe();
		}, this.deepLink = "", this.subscribedLanguage = "", this.fetchHeartbeat = async (e) => this.hass ? await this.hass.callWS({
			type: "pulse/heartbeat",
			device_ids: e
		}) : null, this.dueIds = P((e) => (e.summary.due_batteries ?? []).map((e) => e.id)), this.narrow = !1, this.snapshot = null, this.now = Date.now() / 1e3, this.openId = null, this.welcome = kr(), this.error = null, this.groupBy = "area", this.filter = null, this.confirmZigbee = !1, this.confirmHealth = !1, this.addOpen = !1, this.candidates = null;
	}
	get language() {
		return this.hass?.language ?? "en";
	}
	get timeZone() {
		return ot(this.hass?.config?.time_zone);
	}
	get timeFormat() {
		return _t(this.hass?.locale?.time_format);
	}
	get readonly() {
		return !Lt(this.hass?.user);
	}
	get view() {
		let e = this.route?.path ?? "";
		return e.startsWith("/settings") ? this.readonly ? "overview" : "settings" : e.startsWith("/options") ? this.readonly ? "overview" : "options" : e.startsWith("/devices") ? "devices" : "overview";
	}
	connectedCallback() {
		super.connectedCallback(), Ge(), this.addEventListener("wa-after-hide", this.onMenuHidden), this.openDeepLink(), this.now = Date.now() / 1e3, this.clock = window.setInterval(() => {
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
		e.has("route") && this.openDeepLink(), this.hass?.user && this.readonly && ["/settings", "/options"].some((e) => (this.route?.path ?? "").startsWith(e)) && ze("/pulse", !0);
	}
	shouldUpdate(e) {
		if (this.ensureSubscribed(), e.size !== 1 || !e.has("hass")) return !0;
		let t = e.get("hass");
		if (!t || !this.hass) return !0;
		let n = this.namesCache.value;
		return Ar(t) !== Ar(this.hass) || this.names() !== n;
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
			this.snapshot = e, this.now = Date.now() / 1e3, this.error = null, this.retryDelay = Nn;
		}, {
			type: "pulse/subscribe",
			language: this.hass.language
		});
		this.unsub = e, e.catch((t) => {
			if (this.unsub !== e || (this.unsub = null, this.error = Be(t), !this.isConnected)) return;
			let n = this.retryDelay;
			this.retryDelay = Fn(n), this.retryTimer = window.setTimeout(() => {
				this.retryTimer = void 0, this.ensureSubscribed();
			}, n);
		});
	}
	async call(e, t) {
		if (this.hass) try {
			let n = await this.hass.callWS(e);
			return t && j(this, t), n ?? null;
		} catch (e) {
			j(this, Be(e));
			return;
		}
	}
	go(e) {
		e !== "devices" && (this.filter = null), ze(e === "overview" ? "/pulse" : `/pulse/${e}`);
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
		}), t.ignored === !0 && n && (this.openId = null, j(this, N(this.language, "ignored_done", { name: n.name }), {
			text: N(this.language, "undo"),
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
		}) !== void 0 && (this.openId = null, j(this, N(t, "replaced_done"), {
			text: N(t, "undo"),
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
		j(this, N(t, r ? "replaced_undone" : "replaced_undo_failed"));
	}
	async onConfirmZigbee() {
		this.confirmZigbee = !1, await this.call({ type: "pulse/enable_z2m" }, N(this.language, "zigbee_sent"));
	}
	async onConfirmHealth() {
		this.confirmHealth = !1, await this.call({ type: "pulse/enable_z2m_health" }, N(this.language, "zigbee_sent"));
	}
	async onAddOpen() {
		if (this.readonly) return;
		this.candidates = null, this.addOpen = !0;
		let e = await this.call({ type: "pulse/manual_candidates" });
		this.candidates = zn(e);
	}
	async onManualAdd(e) {
		let t = this.candidates?.find((t) => t.id === e)?.name ?? "";
		this.addOpen = !1, await this.call({
			type: "pulse/manual_device",
			device_id: e,
			add: !0
		}, N(this.language, "manual_added", { name: t }));
	}
	async onManualRemove(e, t) {
		this.readonly || await this.call({
			type: "pulse/manual_device",
			device_id: e,
			add: !1
		}, N(this.language, "manual_removed", { name: t }));
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
		j(this, n ? N(this.language, "test_done", { count: n }) : N(this.language, "test_none"));
	}
	async onSummary() {
		let e = await this.call({ type: "pulse/summary" });
		e !== void 0 && j(this, N(this.language, Reflect.get(Object(e), "sent") ? "summary_sent" : "summary_empty"));
	}
	onMenu(e) {
		let t = He(e);
		t === "summary" && !this.readonly ? this.onSummary() : t === "welcome" ? this.welcome = "welcome" : t === "integration" && ze("/config/integrations/integration/pulse");
	}
	welcomeDone() {
		this.welcome = null;
		let e = Or();
		try {
			e && Zn(e, "26.10.15");
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
		if (!r.length) return N(n, "day_nobody");
		let i = r.slice(0, 2).map((e) => t[e] ?? e.replace(/^mobile_app_/, "").replaceAll("_", " ")).join(", ");
		return N(n, "day_to", { names: r.length > 2 ? `${i} +${r.length - 2}` : i });
	}
	renderHead() {
		let e = this.language, t = [
			{
				value: "overview",
				label: N(e, "tab_overview")
			},
			{
				value: "devices",
				label: N(e, "tab_devices")
			},
			...this.readonly ? [] : [{
				value: "settings",
				label: N(e, "tab_notify")
			}, {
				value: "options",
				label: N(e, "tab_options")
			}]
		];
		return w`<header class="head">
      <div class="brand" title=${N(e, "subtitle")}>
        <pulse-mark flat></pulse-mark>
        <span>${N(e, "title")}</span>
      </div>
      <pulse-segmented
        .options=${t}
        .value=${this.view}
        .label=${N(e, "title")}
        @change=${(e) => {
			let t = e.detail.value;
			(t === "overview" || t === "devices" || t === "settings" || t === "options") && this.go(t);
		}}
      ></pulse-segmented>
    </header>`;
	}
	renderView(e) {
		let t = this.language, n = this.now, r = this.timeZone, i = this.names();
		return this.view === "settings" || this.view === "options" ? w`<pulse-settings
        .page=${this.view === "options" ? "options" : "notify"}
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
        @manual-add-open=${() => void this.onAddOpen()}
        @manual-remove=${(e) => void this.onManualRemove(e.detail.id, e.detail.name)}
      ></pulse-settings>` : this.view === "devices" ? w`<pulse-devices
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
      ></pulse-devices>` : w`<pulse-overview
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
		let e = this.language, t = this.snapshot, n = this.error ? w`<ha-alert alert-type="warning" title=${this.error}>${N(e, "connection_lost")}</ha-alert>` : D;
		return t ? t.loaded === !1 ? w`${n}<ha-alert alert-type="info">${N(e, "not_loaded")}</ha-alert>` : w`${n}${this.renderView(t)}` : this.error ? n : w`<p class="muted center">${N(e, "loading")}</p>`;
	}
	render() {
		let e = this.loaded(), t = this.language, n = e?.devices.find((e) => e.id === this.openId) ?? null;
		return w`
      <div class="toolbar">
        ${Re(this.hass, this.narrow) ? w`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>` : D}
        <div class="toolbar-title">${N(t, "title")}</div>
        <ha-dropdown placement="bottom-end" @wa-select=${(e) => this.onMenu(e)}>
          <ha-icon-button slot="trigger" .label=${N(t, "more")}>
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </ha-icon-button>
          ${this.readonly || this.view === "settings" ? D : w`<ha-dropdown-item value="summary"><ha-icon slot="icon" icon="mdi:text-box-outline"></ha-icon>${N(t, "summary_now")}</ha-dropdown-item>`}
          <ha-dropdown-item value="welcome"><ha-icon slot="icon" icon="mdi:hand-wave-outline"></ha-icon>${N(t, "show_welcome")}</ha-dropdown-item>
          ${this.readonly ? D : w`<ha-dropdown-item value="integration"><ha-icon slot="icon" icon="mdi:cog-outline"></ha-icon>${N(t, "open_integration")}</ha-dropdown-item>`}
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
		}, N(t, "later_done"))}
        @snooze-cancel=${(e) => void this.call({
			type: "pulse/snooze",
			device_id: e.detail.id,
			hours: 0
		}, N(t, "snooze_cancelled"))}
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
        <p class="version muted">${N(t, "version", { version: "26.10.15" })}</p>
        ${e ? w`<pulse-device-sheet
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
			this.openId = null, location.search.includes("device=") && ze(location.pathname, !0);
		}}
                ></pulse-device-sheet>
                <pulse-welcome
                  .mode=${this.welcome}
                  .language=${t}
                  .version=${"26.10.15"}
                  .zigbee=${this.zigbeeOffer(e)}
                  @closed=${() => this.welcomeDone()}
                  @enable-z2m=${() => {
			this.confirmZigbee = !0;
		}}
                ></pulse-welcome>
                <pulse-sheet
                  no-close
                  .open=${this.confirmZigbee}
                  .heading=${N(t, "zigbee_confirm_title")}
                  .language=${t}
                  @closed=${() => {
			this.confirmZigbee = !1;
		}}
                >
                  <p class="confirm-text">${N(t, "zigbee_confirm_text")}</p>
                  <p class="confirm-text">${N(t, "zigbee_confirm_side")}</p>
                  <button slot="footer" class="pbtn" type="button" @click=${() => {
			this.confirmZigbee = !1;
		}}>${N(t, "cancel")}</button>
                  <button slot="footer" class="pbtn primary" type="button" @click=${() => void this.onConfirmZigbee()}>
                    ${N(t, "zigbee_confirm_go")}
                  </button>
                </pulse-sheet>
                <pulse-sheet
                  no-close
                  .open=${this.confirmHealth}
                  .heading=${N(t, "health_confirm_title")}
                  .language=${t}
                  @closed=${() => {
			this.confirmHealth = !1;
		}}
                >
                  <p class="confirm-text">${N(t, "health_confirm_text")}</p>
                  <p class="confirm-text">${N(t, "health_confirm_side")}</p>
                  <button slot="footer" class="pbtn" type="button" @click=${() => {
			this.confirmHealth = !1;
		}}>${N(t, "cancel")}</button>
                  <button slot="footer" class="pbtn primary" type="button" @click=${() => void this.onConfirmHealth()}>
                    ${N(t, "zigbee_confirm_go")}
                  </button>
                </pulse-sheet>
                <pulse-add-sheet
                  .open=${this.addOpen}
                  .language=${t}
                  .candidates=${this.candidates}
                  @add=${(e) => void this.onManualAdd(e.detail.id)}
                  @closed=${() => {
			this.addOpen = !1;
		}}
                ></pulse-add-sheet>` : D}
      </main>
    `;
	}
	static {
		this.styles = [
			q,
			J,
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
M("pulse-panel", jr);
//#endregion
export { jr as PulsePanel };
