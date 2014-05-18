var Int64 = require('int64-native');

node = exports.node = function node(pFile, pIndex) {
	this.file = pFile;
	
	var nodeOffset = pFile.header.node_offset + (pIndex * 20);
	var buffer = pFile.readFilePartially(nodeOffset, 20);
	var offset = 0;
	this.name_id = buffer.readUInt32LE(offset); offset += 4;
	this.first_child_id = buffer.readUInt32LE(offset); offset += 4;
	this.child_count = buffer.readUInt16LE(offset); offset += 2;
	this.type = buffer.readUInt16LE(offset); offset += 2;
	
	this.children = null;
	
	var buffer = buffer.slice(offset);
	switch (this.type) {
		case 0: break;
		case 1: // Int64
			
			this.data = new Int64(buffer.readUInt32LE(4), buffer.readUInt32LE(0));
			break;
		case 2: // Double
			this.data = buffer.readDoubleLE(0);
			break;
		case 3: // StringID
			this.data = buffer.readUInt32LE(0);
			break;
		case 4: // VectorInt32
			this.data = [buffer.readUInt32LE(0), buffer.readUInt32LE(4)];
			break;
		case 5: // Bitmap
			this.data = [buffer.readUInt32LE(0), buffer.readUInt16LE(4), buffer.readUInt16LE(6)];
			break;
		case 6: // Audio
			this.data = [buffer.readUInt32LE(0), buffer.readUInt32LE(4)];
			break;
		default: throw 'Unknown node type.';
	}
};

exports.node.prototype = {
	InitializeChildren: function () {
		if (this.child_count == 0) return;
		this.children = {};
		for (var i = 0; i < this.child_count; i++) {
			var subn = new node(this.file, this.first_child_id + i);
			this.children[this.file.get_string(subn.name_id)] = subn;
		}
	},
	GetName: function () {
		return this.file.get_string(this.name_id);
	},
	
	ChildById: function (pId) {
		if (pId < 0 || pId >= this.child_count) return null;
		
		var name = this.file.GetNodeName(this.first_child_id + pId);
		return this.Child(name);
	},
	Child: function (pName) {
		if (this.children !== null && this.children.hasOwnProperty(pName)) {
			return this.children[pName];
		}
		for (var i = 0; i < this.child_count; i++) {
			var name = this.file.GetNodeName(this.first_child_id + i);
			if (pName === name) {
				if (this.children === null) this.children = [];
				this.children[name] = new node(this.file, this.first_child_id + i);
				return this.children[name];
			}
		}
		
		return null;
	},
};