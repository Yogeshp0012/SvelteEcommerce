
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const cart = writable({});

    /* src/CartComponents/Card.svelte generated by Svelte v3.32.1 */
    const file = "src/CartComponents/Card.svelte";

    // (51:10) {#if inCart > 0}
    function create_if_block(ctx) {
    	let p;
    	let span;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			span = element("span");
    			t0 = text("( ");
    			t1 = text(/*inCart*/ ctx[1]);
    			t2 = text(" in cart )");
    			add_location(span, file, 52, 12, 1284);
    			attr_dev(p, "class", "alert alert-info");
    			add_location(p, file, 51, 10, 1242);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inCart*/ 2) set_data_dev(t1, /*inCart*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(51:10) {#if inCart > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let div1;
    	let img_1;
    	let img_1_src_value;
    	let t0;
    	let div0;
    	let h5;
    	let t2;
    	let p0;
    	let t5;
    	let t6;
    	let p1;
    	let input;
    	let mounted;
    	let dispose;
    	let if_block = /*inCart*/ ctx[1] > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			img_1 = element("img");
    			t0 = space();
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = `${/*name*/ ctx[2]}`;
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = `\$${/*price*/ ctx[3]}`;
    			t5 = space();
    			if (if_block) if_block.c();
    			t6 = space();
    			p1 = element("p");
    			input = element("input");
    			attr_dev(img_1, "class", "img-fluid d-block mx-auto");
    			set_style(img_1, "height", "250px");
    			set_style(img_1, "width", "300px");
    			if (img_1.src !== (img_1_src_value = /*img*/ ctx[0])) attr_dev(img_1, "src", img_1_src_value);
    			attr_dev(img_1, "alt", "Pilot Aviator Glasses Gear Image");
    			add_location(img_1, file, 46, 8, 894);
    			attr_dev(h5, "class", "card-title font-weight-semi-bold mb-3 w-xl-220p mx-auto");
    			add_location(h5, file, 48, 10, 1082);
    			attr_dev(p0, "class", "price svelte-16ksvx7");
    			add_location(p0, file, 49, 10, 1173);
    			attr_dev(div0, "class", "card-body p-4 py-0 h-xs-440p");
    			add_location(div0, file, 47, 8, 1028);
    			attr_dev(input, "type", "submit");
    			attr_dev(input, "class", "btn add-button btn-lg w-100 svelte-16ksvx7");
    			attr_dev(input, "name", "add-button");
    			input.value = "Add to Cart";
    			add_location(input, file, 60, 10, 1454);
    			attr_dev(p1, "class", "btn w-100 px-4 mx-auto svelte-16ksvx7");
    			add_location(p1, file, 59, 8, 1408);
    			attr_dev(div1, "class", "card text-center product p-4 pt-5 h-100 rounded svelte-16ksvx7");
    			add_location(div1, file, 45, 6, 823);
    			attr_dev(div2, "class", "row px-2 pt-5");
    			add_location(div2, file, 44, 0, 788);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, img_1);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(div0, t5);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div1, t6);
    			append_dev(div1, p1);
    			append_dev(p1, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "click", /*addToCart*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*img*/ 1 && img_1.src !== (img_1_src_value = /*img*/ ctx[0])) {
    				attr_dev(img_1, "src", img_1_src_value);
    			}

    			if (/*inCart*/ ctx[1] > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Card", slots, []);
    	let { item } = $$props;
    	let { img, name, price } = item;
    	img = `img/${img}`;
    	const cartItems = get_store_value(cart);
    	let inCart = cartItems[name] ? cartItems[name].count : 0;

    	function addToCart() {
    		$$invalidate(1, inCart++, inCart);

    		cart.update(n => {
    			return { ...n, [name]: { ...item, count: inCart } };
    		});
    	}

    	const writable_props = ["item"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("item" in $$props) $$invalidate(5, item = $$props.item);
    	};

    	$$self.$capture_state = () => ({
    		get: get_store_value,
    		cart,
    		item,
    		img,
    		name,
    		price,
    		cartItems,
    		inCart,
    		addToCart
    	});

    	$$self.$inject_state = $$props => {
    		if ("item" in $$props) $$invalidate(5, item = $$props.item);
    		if ("img" in $$props) $$invalidate(0, img = $$props.img);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    		if ("price" in $$props) $$invalidate(3, price = $$props.price);
    		if ("inCart" in $$props) $$invalidate(1, inCart = $$props.inCart);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [img, inCart, name, price, addToCart, item];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { item: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*item*/ ctx[5] === undefined && !("item" in props)) {
    			console.warn("<Card> was created without expected prop 'item'");
    		}
    	}

    	get item() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var items = [
    	{
    		name: 'Watch',
    		price: '100',
    		img: 'watch.jpg'
    	},
    	{
    		name: 'Headphone',
    		price: '100',
    		img: 'headphone.jpg'
    	},
    	{
    		name: 'Camera',
    		price: '100',
    		img: 'camera.jpg'
    	},
    	{
    		name: 'Shoe',
    		price: '100',
    		img: 'shoe.jpg'
    	},
    	{
    		name: 'Toy Car',
    		price: '100',
    		img: 'toycar.jpg'
    	},

    	{
    		name: 'Glass',
    		price: '2,670',
    		img: 'glass.jpg'
    	}
    ];

    /* src/CartComponents/CardWrapper.svelte generated by Svelte v3.32.1 */
    const file$1 = "src/CartComponents/CardWrapper.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	return child_ctx;
    }

    // (10:4) {#each items as item}
    function create_each_block(ctx) {
    	let div;
    	let card;
    	let t;
    	let current;

    	card = new Card({
    			props: { item: /*item*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(card.$$.fragment);
    			t = space();
    			attr_dev(div, "class", "col-md-4");
    			add_location(div, file$1, 10, 4, 182);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(card, div, null);
    			append_dev(div, t);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(card);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(10:4) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let current;
    	let each_value = items;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "row");
    			add_location(div0, file$1, 6, 2, 128);
    			attr_dev(div1, "class", "container mb-4");
    			add_location(div1, file$1, 5, 0, 96);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items*/ 0) {
    				each_value = items;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CardWrapper", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CardWrapper> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Card, items });
    	return [];
    }

    class CardWrapper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CardWrapper",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/CartComponents/Navbar.svelte generated by Svelte v3.32.1 */

    const { Object: Object_1 } = globals;
    const file$2 = "src/CartComponents/Navbar.svelte";

    function create_fragment$2(ctx) {
    	let header;
    	let section;
    	let div7;
    	let div6;
    	let div0;
    	let h4;
    	let t1;
    	let div2;
    	let div1;
    	let input;
    	let t2;
    	let i0;
    	let t3;
    	let div5;
    	let div4;
    	let span0;
    	let i1;
    	let t4;
    	let div3;
    	let span1;
    	let t5;
    	let t6;
    	let t7;
    	let span2;
    	let t8;
    	let t9_value = /*cart_sum*/ ctx[0] * 100 + "";
    	let t9;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			header = element("header");
    			section = element("section");
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Svelte Cart Demo";
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			input = element("input");
    			t2 = space();
    			i0 = element("i");
    			t3 = space();
    			div5 = element("div");
    			div4 = element("div");
    			span0 = element("span");
    			i1 = element("i");
    			t4 = space();
    			div3 = element("div");
    			span1 = element("span");
    			t5 = text(/*cart_sum*/ ctx[0]);
    			t6 = text(" Product(s)");
    			t7 = space();
    			span2 = element("span");
    			t8 = text("$ ");
    			t9 = text(t9_value);
    			set_style(h4, "cursor", "pointer");
    			add_location(h4, file$2, 69, 19, 1462);
    			attr_dev(div0, "class", "col-md-2");
    			add_location(div0, file$2, 68, 15, 1419);
    			attr_dev(input, "class", "form-control svelte-17vsmm9");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search any product...");
    			add_location(input, file$2, 73, 12, 1654);
    			attr_dev(i0, "class", "bx bx-search svelte-17vsmm9");
    			add_location(i0, file$2, 74, 12, 1744);
    			attr_dev(div1, "class", "d-flex form-inputs svelte-17vsmm9");
    			add_location(div1, file$2, 72, 12, 1608);
    			attr_dev(div2, "class", "col-md-8");
    			add_location(div2, file$2, 71, 15, 1572);
    			set_style(i1, "color", "rgba(19,31,53,1)");
    			set_style(i1, "cursor", "pointer");
    			attr_dev(i1, "class", "bx bxs-shopping-bag");
    			add_location(i1, file$2, 80, 51, 1995);
    			attr_dev(span0, "class", "shop-bag mr-2 svelte-17vsmm9");
    			add_location(span0, file$2, 80, 23, 1967);
    			attr_dev(span1, "class", "qty svelte-17vsmm9");
    			add_location(span1, file$2, 82, 27, 2201);
    			attr_dev(span2, "class", "fw-bold");
    			add_location(span2, file$2, 83, 27, 2276);
    			attr_dev(div3, "class", "d-flex flex-column ms-2");
    			add_location(div3, file$2, 81, 23, 2135);
    			attr_dev(div4, "class", "d-flex d-none d-md-flex flex-row align-items-center");
    			add_location(div4, file$2, 79, 19, 1877);
    			attr_dev(div5, "class", "col-md-2");
    			add_location(div5, file$2, 78, 15, 1834);
    			attr_dev(div6, "class", "row p-2 pt-3 pb-3 d-flex align-items-center");
    			add_location(div6, file$2, 67, 11, 1345);
    			attr_dev(div7, "class", "container-fluid");
    			add_location(div7, file$2, 66, 8, 1303);
    			attr_dev(section, "class", "header-main");
    			add_location(section, file$2, 65, 4, 1263);
    			attr_dev(header, "class", "section-header mb-4 rounded svelte-17vsmm9");
    			add_location(header, file$2, 64, 0, 1213);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, section);
    			append_dev(section, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			append_dev(div0, h4);
    			append_dev(div6, t1);
    			append_dev(div6, div2);
    			append_dev(div2, div1);
    			append_dev(div1, input);
    			append_dev(div1, t2);
    			append_dev(div1, i0);
    			append_dev(div6, t3);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, span0);
    			append_dev(span0, i1);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, span1);
    			append_dev(span1, t5);
    			append_dev(span1, t6);
    			append_dev(div3, t7);
    			append_dev(div3, span2);
    			append_dev(span2, t8);
    			append_dev(span2, t9);

    			if (!mounted) {
    				dispose = [
    					listen_dev(h4, "click", /*goToHome*/ ctx[1], false, false, false),
    					listen_dev(i1, "click", /*goToCheckout*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*cart_sum*/ 1) set_data_dev(t5, /*cart_sum*/ ctx[0]);
    			if (dirty & /*cart_sum*/ 1 && t9_value !== (t9_value = /*cart_sum*/ ctx[0] * 100 + "")) set_data_dev(t9, t9_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Navbar", slots, []);
    	const dispatch = createEventDispatcher();
    	let cart_sum = 0;

    	const unsubscribe = cart.subscribe(items => {
    		const itemValues = Object.values(items);
    		$$invalidate(0, cart_sum = 0);

    		itemValues.forEach(item => {
    			$$invalidate(0, cart_sum += item.count);
    		});
    	});

    	function goToHome() {
    		dispatch("nav", { option: "home" });
    	}

    	function goToCheckout() {
    		dispatch("nav", { option: "checkout" });
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		cart,
    		createEventDispatcher,
    		dispatch,
    		cart_sum,
    		unsubscribe,
    		goToHome,
    		goToCheckout
    	});

    	$$self.$inject_state = $$props => {
    		if ("cart_sum" in $$props) $$invalidate(0, cart_sum = $$props.cart_sum);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [cart_sum, goToHome, goToCheckout];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/CartComponents/CheckoutItem.svelte generated by Svelte v3.32.1 */
    const file$3 = "src/CartComponents/CheckoutItem.svelte";

    function create_fragment$3(ctx) {
    	let div2;
    	let img_1;
    	let img_1_src_value;
    	let t0;
    	let div1;
    	let h3;
    	let t2;
    	let p;
    	let t5;
    	let span;
    	let t6;
    	let t7;
    	let t8;
    	let t9_value = " " + "";
    	let t9;
    	let t10;
    	let div0;
    	let button0;
    	let t12;
    	let t13_value = " " + "";
    	let t13;
    	let t14;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			img_1 = element("img");
    			t0 = space();
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = `${/*name*/ ctx[1]}`;
    			t2 = space();
    			p = element("p");
    			p.textContent = `Price: \$ ${/*price*/ ctx[2]}`;
    			t5 = space();
    			span = element("span");
    			t6 = text("No(s): ");
    			t7 = text(/*count*/ ctx[0]);
    			t8 = space();
    			t9 = text(t9_value);
    			t10 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Add More";
    			t12 = space();
    			t13 = text(t13_value);
    			t14 = space();
    			button1 = element("button");
    			button1.textContent = "Remove";
    			attr_dev(img_1, "class", "img-fluid img-thumbnail");
    			attr_dev(img_1, "width", "300");
    			if (img_1.src !== (img_1_src_value = `img/${/*img*/ ctx[3]}`)) attr_dev(img_1, "src", img_1_src_value);
    			attr_dev(img_1, "alt", /*name*/ ctx[1]);
    			add_location(img_1, file$3, 23, 4, 532);
    			attr_dev(h3, "class", "title");
    			add_location(h3, file$3, 25, 6, 660);
    			attr_dev(p, "class", "price mb-2");
    			add_location(p, file$3, 26, 6, 697);
    			attr_dev(span, "class", "mt-2 p-0 mb-2");
    			add_location(span, file$3, 27, 6, 747);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-success add");
    			add_location(button0, file$3, 29, 8, 846);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-danger");
    			add_location(button1, file$3, 30, 8, 959);
    			attr_dev(div0, "class", "col p-0 mt-2");
    			add_location(div0, file$3, 28, 6, 810);
    			attr_dev(div1, "class", "item-meta-data ml-2");
    			add_location(div1, file$3, 24, 4, 619);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$3, 22, 2, 509);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, img_1);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(div1, t2);
    			append_dev(div1, p);
    			append_dev(div1, t5);
    			append_dev(div1, span);
    			append_dev(span, t6);
    			append_dev(span, t7);
    			append_dev(div1, t8);
    			append_dev(div1, t9);
    			append_dev(div1, t10);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t12);
    			append_dev(div0, t13);
    			append_dev(div0, t14);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*countButtonHandler*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*removeItem*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*count*/ 1) set_data_dev(t7, /*count*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CheckoutItem", slots, []);
    	let { item } = $$props;
    	let { name, price, img, count } = item;

    	const countButtonHandler = e => {
    		if (e.target.classList.contains("add")) {
    			$$invalidate(0, count++, count);
    		} else if (count >= 1) {
    			$$invalidate(0, count--, count);
    		}

    		cart.update(n => ({ ...n, [name]: { ...n[name], count } }));
    	};

    	const removeItem = () => {
    		cart.update(n => {
    			delete n[name];
    			return n;
    		});
    	};

    	const writable_props = ["item"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CheckoutItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("item" in $$props) $$invalidate(6, item = $$props.item);
    	};

    	$$self.$capture_state = () => ({
    		cart,
    		item,
    		name,
    		price,
    		img,
    		count,
    		countButtonHandler,
    		removeItem
    	});

    	$$self.$inject_state = $$props => {
    		if ("item" in $$props) $$invalidate(6, item = $$props.item);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("price" in $$props) $$invalidate(2, price = $$props.price);
    		if ("img" in $$props) $$invalidate(3, img = $$props.img);
    		if ("count" in $$props) $$invalidate(0, count = $$props.count);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [count, name, price, img, countButtonHandler, removeItem, item];
    }

    class CheckoutItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { item: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CheckoutItem",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*item*/ ctx[6] === undefined && !("item" in props)) {
    			console.warn("<CheckoutItem> was created without expected prop 'item'");
    		}
    	}

    	get item() {
    		throw new Error("<CheckoutItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<CheckoutItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/CartComponents/Checkout.svelte generated by Svelte v3.32.1 */

    const { Object: Object_1$1 } = globals;
    const file$4 = "src/CartComponents/Checkout.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (31:2) {:else}
    function create_else_block_1(ctx) {
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let br;
    	let t1;
    	let div1;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*cartItems*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[4].name;
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			br = element("br");
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Checkout";
    			attr_dev(div0, "class", "col");
    			add_location(div0, file$4, 31, 2, 690);
    			add_location(br, file$4, 36, 1, 809);
    			attr_dev(div1, "class", "btn btn-success btn-lg btn-block");
    			add_location(div1, file$4, 37, 3, 818);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*checkout*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*cartItems*/ 2) {
    				each_value = /*cartItems*/ ctx[1];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(31:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (25:2) {#if cartItems.length === 0}
    function create_if_block$1(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*checkedOut*/ ctx[0]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(25:2) {#if cartItems.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (33:4) {#each cartItems as item (item.name)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let checkoutitem;
    	let current;

    	checkoutitem = new CheckoutItem({
    			props: { item: /*item*/ ctx[4] },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(checkoutitem.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(checkoutitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const checkoutitem_changes = {};
    			if (dirty & /*cartItems*/ 2) checkoutitem_changes.item = /*item*/ ctx[4];
    			checkoutitem.$set(checkoutitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(checkoutitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(checkoutitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(checkoutitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(33:4) {#each cartItems as item (item.name)}",
    		ctx
    	});

    	return block;
    }

    // (28:4) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Your cart is empty";
    			attr_dev(p, "class", "empty-message");
    			add_location(p, file$4, 28, 6, 617);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(28:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (26:4) {#if checkedOut}
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Thank you for shopping with us";
    			attr_dev(p, "class", "empty-message");
    			add_location(p, file$4, 26, 6, 537);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(26:4) {#if checkedOut}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let h1;
    	let t1;
    	let div1;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*cartItems*/ ctx[1].length === 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "My Cart";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			if_block.c();
    			add_location(h1, file$4, 19, 2, 408);
    			attr_dev(div0, "class", "col-sm");
    			add_location(div0, file$4, 23, 4, 455);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$4, 20, 2, 428);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$4, 18, 0, 381);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div0, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Checkout", slots, []);
    	let checkedOut = false;
    	let cartItems = [];

    	const unsubscribe = cart.subscribe(items => {
    		$$invalidate(1, cartItems = Object.values(items));
    	});

    	const checkout = () => {
    		$$invalidate(0, checkedOut = true);

    		cart.update(n => {
    			return {};
    		});
    	};

    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Checkout> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		CheckoutItem,
    		cart,
    		checkedOut,
    		cartItems,
    		unsubscribe,
    		checkout
    	});

    	$$self.$inject_state = $$props => {
    		if ("checkedOut" in $$props) $$invalidate(0, checkedOut = $$props.checkedOut);
    		if ("cartItems" in $$props) $$invalidate(1, cartItems = $$props.cartItems);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [checkedOut, cartItems, checkout];
    }

    class Checkout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Checkout",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.32.1 */

    // (14:2) {:else}
    function create_else_block$1(ctx) {
    	let checkout;
    	let current;
    	checkout = new Checkout({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(checkout.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(checkout, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(checkout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(checkout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(checkout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(14:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (12:2) {#if nav === 'home'}
    function create_if_block$2(ctx) {
    	let cardwrapper;
    	let current;
    	cardwrapper = new CardWrapper({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(cardwrapper.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(cardwrapper, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cardwrapper.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cardwrapper.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(cardwrapper, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(12:2) {#if nav === 'home'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let navbar;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	navbar = new Navbar({ $$inline: true });
    	navbar.$on("nav", /*navHandler*/ ctx[1]);
    	const if_block_creators = [create_if_block$2, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*nav*/ ctx[0] === "home") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			create_component(navbar.$$.fragment);
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			insert_dev(target, t, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navbar, detaching);
    			if (detaching) detach_dev(t);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let nav = "home";

    	function navHandler(event) {
    		$$invalidate(0, nav = event.detail.option);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		CardWrapper,
    		Navbar,
    		Checkout,
    		nav,
    		navHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ("nav" in $$props) $$invalidate(0, nav = $$props.nav);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [nav, navHandler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
