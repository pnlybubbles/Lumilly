/*
Container Class
Item Class
Items Class
*/

//=========================
// Container class
//=========================

function Container() {
    this.initialize.apply(this, arguments);
}

Container.prototype = {
	initialize: function() {
		this.init_obj = {
			"id" : null,
			"id_src" : null,
			"coord" : null,
			"favorited" : false,
			"retweeted" : null,
			"src" : null,
			"elm" : null
		};
		this.arrays = ["id_list", "id_src_list", "favorited_list", "retweeted_list", "source_list", "element_list"];
		this.arrays.forEach(function(mthd, i) {
			this[mthd] = [];
		}, this);
		this["selected"] = [];
		this["buttons_opened"] = null;
	},
	add: function(data, elm, coord) {
		if (coord === undefined) {
			coord = id_list.length;
		}
		if(data.retweeted_status) {
			this.id_src_list.splice(coord, 0, data.retweeted_status.id_str);
		} else {
			this.id_src_list.splice(coord, 0, data.id_str);
		}
		this.id_list.splice(coord, 0, data.id_str);
		this.favorited_list.splice(coord, 0, data.favorited);
		this.retweeted_list.splice(coord, 0, data.retweeted);
		this.source_list.splice(coord, 0, data);
		this.element_list.splice(coord, 0, elm);
		// console.log(JSON.stringify(this.source_list.map(function(v) { return v.text; })));
	},
	remove: function(coord) {
		this.selected.forEach(function(id, i) {
			if(id == this.id_list[coord]) {
				this.selected.splice(i, 1);
			}
		}, this);
		if(this.buttons_opened == this.id_list[coord]) {
			this.buttons_opened = null;
		}
		this.arrays.forEach(function(mthd, i) {
			this[mthd].splice(coord, 1);
		}, this);
	},
	coord: function(coord) {
		coord = parseInt(coord, 10);
		if(this.id_list[coord]) {
			return {
				"id" : this.id_list[coord],
				"id_src" : this.id_src_list[coord],
				"coord" : coord,
				"favorited" : this.favorited_list[coord],
				"retweeted" : this.retweeted_list[coord],
				"src" : this.source_list[coord],
				"elm" : this.element_list[coord]
			};
		} else {
			return undefined;
		}
	},
	id: function(id) {
		id = String(id);
		var coord = this.id_list.indexOf(id);
		if(coord != -1) {
			return this.coord(coord);
		} else {
			return undefined;
		}
	},
	item: function(item) {
		if(item) {
			if(item.id) {
				return item.id;
			} else if(item.coord !== undefined) {
				return item.coord;
			} else {
				return undefined;
			}
		} else {
			return undefined;
		}
	},
	select: function(item) {
		var exist_index = -1;
		$.each(this.selected, function(i, id) {
			if(id == item.id) {
				exist_index = i;
			}
		});
		if(exist_index == -1) {
			this.selected.push(item.id);
			return this.selected;
		} else {
			return undefined;
		}
	},
	deselect: function(item) {
		var delete_index = -1;
		$.each(this.selected, function(i, id) {
			if(id == item.id) {
				delete_index = i;
			}
		});
		if(delete_index != -1) {
			this.selected.splice(delete_index, 1);
			return this.selected;
		} else {
			return undefined;
		}
	},
	favorite: function(item, tf) {
		var item_index = 0;
		while(1) {
			item_index = this.id_src_list.indexOf(item.id_src, item_index);
			if(item_index == -1) {
				break;
			}
			console.log(item_index);
			this.favorited_list[item_index] = !(!(tf));
			item_index += 1;
		}
		return !(!(tf));
	},
	first: function() {
		return this.coord(0);
	},
	last: function() {
		return this.coord(this.id_list.length - 1);
	}
};


//=========================
// Item class
//=========================

function Item() {
    this.initialize.apply(this, arguments);
}

Item.prototype = {
	initialize: function(item_obj, tab) {
		this.initialized = false;
		if (tab !== undefined) {
			this.act = tab;
		} else {
			this.act = act;
		}
		for(var key in itemChunk[this.act].init_obj){
			this[key] = itemChunk[this.act].init_obj[key];
		}
		// console.log(jQuery.extend(true, {}, this));
		if(!(item_obj)) {
			item_obj = {"id" : itemChunk[this.act].selected[0]};
		}
		if(item_obj) {
			var item = null;
			if(item_obj.coord !== undefined) {
				item = itemChunk[this.act].coord(item_obj.coord);
				if(item) {
					for(key in item) {
						this[key] = item[key];
					}
					this.initialized = true;
					return this;
				} else {
					return undefined;
				}
			} else if(item_obj.id) {
				item = itemChunk[this.act].id(item_obj.id);
				if(item) {
					for(key in item) {
						this[key] = item[key];
					}
					this.initialized = true;
					return this;
				} else {
					return undefined;
				}
			} else {
				return undefined;
			}
		} else {
			return undefined;
		}
	},
	check: function() {
		for(var key in this) {
			if(this[key] === null || this[key] === undefined) {
				return false;
			}
		}
		return true;
	},
	select: function() {
		if(this.check()) {
			itemChunk[this.act].select(this);
		} else {
			throw new Error("not initialized");
		}
	},
	deselect: function() {
		if(this.check()) {
			itemChunk[this.act].deselect(this);
		} else {
			throw new Error("not initialized");
		}
	},
	selected: function() {
		return itemChunk[this.act].selected.indexOf(this.id) != -1;
	},
	buttons_open: function() {
		itemChunk[this.act].buttons_opened = this.id;
	},
	buttons_close: function() {
		itemChunk[this.act].buttons_opened = null;
	},
	buttons_opened: function() {
		return itemChunk[this.act].buttons_opened == this.id;
	},
	rel_coord: function(relative) {
		if(this.check()) {
			var rel_item = itemChunk[this.act].coord(this.coord + relative);
			if(rel_item) {
				return new Item(rel_item);
			} else {
				return undefined;
			}
		} else {
			throw new Error("not initialized");
		}
	},
	next: function() {
		return this.rel_coord(1);
	},
	prev: function() {
		return this.rel_coord(-1);
	},
	favorite: function(tf) {
		if(tf === undefined) {
			return this.favorited;
		} else {
			this.favorited = !(!(tf));
			itemChunk[this.act].favorite(this, this.favorited);
			return this.favorited;
		}
	},
	remove: function() {
		itemChunk[this.act].remove(this.coord);
	}
};


//=========================
// Items class
//=========================

function Items() {
    this.initialize.apply(this, arguments);
}

Items.prototype = {
	initialize: function(item_arr) {
		this.item = [];
		this.initialized = [];
		this.act = act;

		if(!(item_arr)) {
			item_arr = [];
			itemChunk[this.act].selected.forEach(function(v, i) {
				item_arr.push({"id" : v});
			});
		}
		if(!(item_arr instanceof Array)) {
			item_arr = [item_arr];
		}
		if(item_arr[0]) {
			item_arr.forEach(function(item_obj, i) {
				this.initialized[i] = true;
				if(item_obj.coord !== undefined || item_obj.id) {
					var item = new Item(item_obj);
					if(item.initialized) {
						this.item[i] = item;
						this.initialized[i] = true;
					} else {
						this.item[i] = null;
						this.initialized[i] = false;
					}
				} else {
					this.item[i] = null;
					this.initialized[i] = false;
				}
			}, this);
			var coords = [];
			var messy_items = {};
			this.item.forEach(function(item, i) {
				if(item) {
					coords[i] = item.coord;
					messy_items[item.coord] = item;
				}
			}, this);
			coords.sort(function(a, b) { return a - b; });
			for(var i = 0; i <= Object.keys(this.item).length - coords.length - 1; i++) {
				coords.push(null);
			}
			coords.forEach(function(coord, i) {
				if(coord !== null) {
					this.item[i] = messy_items[coord];
					this.initialized[i] = true;
				} else {
					this.item[i] = null;
					this.initialized[i] = false;
				}
			}, this);
			return this;
		} else {
			this.initialized[0] = false;
			return undefined;
		}
	},
	all_initialized: function() {
		return this.initialized.every(function(v) {
			return v === true;
		});
	},
	select: function() {
		if(this.all_initialized()) {
			$.each(this.item, function(i, item) {
				item.select();
			});
		} else {
			throw new Error("not initialized");
		}
	},
	deselect: function() {
		if(this.all_initialized()) {
			$.each(this.item, function(i, item) {
				item.deselect();
			});
		} else {
			throw new Error("not initialized");
		}
	},
	next: function() {
		return this.last().next();
	},
	prev: function() {
		return this.first().prev();
	},
	first: function() {
		if(this.all_initialized()) {
			return this.item[0];
		} else {
			throw new Error("not initialized");
		}
	},
	last: function() {
		if(this.all_initialized()) {
			return this.item[this.item.length - 1];
		} else {
			throw new Error("not initialized");
		}
	},
	remove: function() {
		$.each(this.item, function(i, item) {
			item.remove();
		});
	}
};
